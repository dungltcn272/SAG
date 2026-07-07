import path from "node:path";
import { performance } from "node:perf_hooks";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { config } from "../config/env.js";
import {
  addMcpMessage,
  addMcpToolCall,
  clearMcpSession,
  createMcpSession,
  deleteMcpSession,
  getMcpSessionDetail,
  listMcpSessions,
  updateMcpSessionTitle
} from "../db/repositories.js";
import type { McpSessionRecord, McpToolCallRecord } from "../types.js";
import type { SearchProgressEvent } from "../types.js";
import { aiSettingsService, type AiRuntimeSettings } from "./ai-settings-service.js";
import { createModelCallLogger, importModelCallLog, type ModelCallLogRecord } from "../observability/model-call-log.js";
import { defaultMcpSessionTitle, summarizeConversationTitle } from "./mcp-title.js";

type ToolInfo = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

type ToolAction = {
  action: "call_tool" | "final";
  toolName?: string;
  arguments?: Record<string, unknown>;
  final?: string;
};

type AnswerCitation = {
  index: number;
  chunkId: string;
  sourceId: string;
  documentId?: string;
  heading?: string;
  content: string;
  rank?: number;
  score?: number;
  query?: string;
  toolCallId?: string;
};

export type McpRunStreamEvent =
  | { type: "stage"; label: string; detail?: string }
  | { type: "message"; message: { id: string; sessionId: string; role: string; content: string; metadata: Record<string, unknown>; createdAt: string } }
  | { type: "assistant_delta"; delta: string }
  | { type: "tool_start"; toolName: string; arguments: Record<string, unknown> }
  | { type: "search_progress"; event: SearchProgressEvent }
  | { type: "tool_end"; toolCall: McpToolCallRecord }
  | { type: "done"; detail: Awaited<ReturnType<typeof getMcpSessionDetail>> }
  | { type: "error"; message: string };

type StreamEmitter = (event: McpRunStreamEvent) => void;

export class McpAgentService {
  async createSession(input: {
    title?: string;
    sourceIds?: string[];
  }, tenantId = config.DEFAULT_TENANT_ID): Promise<McpSessionRecord> {
    const settings = await aiSettingsService.getRuntimeSettings();
    const title = input.title?.trim();
    return createMcpSession({
      tenantId,
      title: title || defaultMcpSessionTitle(),
      model: settings.hasRemoteLlm ? settings.llmModel : "local-rule-fallback",
      sourceIds: input.sourceIds ?? [],
      metadata: {
        createdVia: "webui",
        autoTitle: !title
      }
    });
  }

  async listSessions(input: { sourceId?: string } = {}, tenantId = config.DEFAULT_TENANT_ID) {
    return listMcpSessions({
      tenantId,
      limit: 50,
      sourceId: input.sourceId
    });
  }

  async getSession(sessionId: string, tenantId = config.DEFAULT_TENANT_ID) {
    return getMcpSessionDetail({ sessionId, tenantId });
  }

  async clearSession(sessionId: string, tenantId = config.DEFAULT_TENANT_ID) {
    const cleared = await clearMcpSession({ sessionId, tenantId });
    if (!cleared) {
      return null;
    }
    return getMcpSessionDetail({ sessionId, tenantId });
  }

  async deleteSession(sessionId: string, tenantId = config.DEFAULT_TENANT_ID) {
    const deleted = await deleteMcpSession({ sessionId, tenantId });
    if (!deleted) {
      return null;
    }
    return { deleted: true };
  }

  async runUserMessage(input: {
    sessionId: string;
    content: string;
    signal?: AbortSignal;
  }, tenantId = config.DEFAULT_TENANT_ID, emit?: StreamEmitter) {
    assertNotAborted(input.signal);
    emit?.({ type: "stage", label: "Tải phiên", detail: "Đang đọc ngữ cảnh MCP của phiên hiện tại" });
    const detail = await getMcpSessionDetail({
      sessionId: input.sessionId,
      tenantId
    });
    assertNotAborted(input.signal);
    if (!detail) {
      throw new Error("Không tìm thấy phiên MCP");
    }

    const userMessage = await addMcpMessage({
      sessionId: input.sessionId,
      role: "user",
      content: input.content
    });
    let activeSession = detail.session;
    if (shouldAutoTitleSession(detail.session, detail.messages)) {
      const updatedSession = await updateMcpSessionTitle({
        sessionId: input.sessionId,
        tenantId,
        title: summarizeConversationTitle(input.content),
        metadata: {
          autoTitle: true,
          titledFromMessageId: userMessage.id
        }
      });
      if (updatedSession) {
        activeSession = updatedSession;
      }
    }
    assertNotAborted(input.signal);
    emit?.({ type: "message", message: userMessage });
    emit?.({ type: "stage", label: "Kết nối MCP", detail: "Đang khởi động MCP client và dò các tool khả dụng" });

    const projectId = activeSession.sourceIds[0];
    if (!projectId) {
      throw new Error("Phiên MCP thiếu project ID. Hãy tạo hội thoại trong một project trước.");
    }
    const runner = await this.createRunner(projectId, input.signal);
    const toolCalls: McpToolCallRecord[] = [];
    let assistantText = "";
    try {
      assertNotAborted(input.signal);
      const toolsResult = await runner.client.listTools(undefined, { signal: input.signal });
      const tools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
      assertNotAborted(input.signal);
      emit?.({ type: "stage", label: "Dò tool", detail: `Tìm thấy ${tools.length} MCP tool` });
      const settings = await aiSettingsService.getRuntimeSettings();
      assertNotAborted(input.signal);

      if (!settings.hasRemoteLlm) {
        assistantText = await this.runFallbackToolFlow({
          runner,
          session: activeSession,
          messageId: userMessage.id,
          userContent: input.content,
          toolCalls,
          signal: input.signal,
          emit
        });
      } else {
        assistantText = await this.runLlmToolFlow({
          runner,
          session: activeSession,
          messageId: userMessage.id,
          history: detail.messages,
          settings,
          tools,
          userContent: input.content,
          toolCalls,
          signal: input.signal,
          emit
        });
      }
    } finally {
      await runner.close();
    }

    assertNotAborted(input.signal);
    const answerCitations = collectAnswerCitations(toolCalls);
    const assistantContent = assistantText || "Tool call đã hoàn tất.";
    for (const delta of chunkText(assistantContent, 24)) {
      assertNotAborted(input.signal);
      emit?.({ type: "assistant_delta", delta });
      await sleep(12);
    }
    assertNotAborted(input.signal);
    const assistant = await addMcpMessage({
      sessionId: input.sessionId,
      role: "assistant",
      content: assistantContent,
      metadata: answerCitations.length > 0 ? { citations: answerCitations } : undefined
    });
    emit?.({ type: "message", message: assistant });

    assertNotAborted(input.signal);
    const updatedDetail = await getMcpSessionDetail({
      sessionId: input.sessionId,
      tenantId
    });
    emit?.({ type: "done", detail: updatedDetail });

    return {
      session: activeSession,
      assistant,
      toolCalls,
      detail: updatedDetail
    };
  }

  private async createRunner(projectId: string, signal?: AbortSignal) {
    const client = new Client({
      name: "sag-webui",
      version: "0.1.0"
    });
    const transport = new StdioClientTransport({
      ...resolveMcpServerCommand(),
      env: childEnv(projectId),
      stderr: "pipe"
    });
    try {
      await client.connect(transport, { signal });
    } catch (error) {
      await transport.close().catch(() => undefined);
      throw error;
    }
    return {
      client,
      close: async () => {
        await transport.close();
      }
    };
  }

  private async runFallbackToolFlow(input: {
    runner: Awaited<ReturnType<McpAgentService["createRunner"]>>;
    session: McpSessionRecord;
    messageId: string;
    userContent: string;
    toolCalls: McpToolCallRecord[];
    signal?: AbortSignal;
    emit?: StreamEmitter;
  }): Promise<string> {
    const lower = input.userContent.toLowerCase();
    let finalText = "Chưa cấu hình LLM_API_KEY, nên hệ thống đang dùng luật nội bộ đơn giản để gọi thử MCP tool.";

    if (/search|检索|搜索|查找|tìm|tim|kiếm|kiem|sag|multi/.test(lower)) {
      assertNotAborted(input.signal);
      const args = {
        query: input.userContent,
        strategy: "multi",
        returnTrace: true
      };
      input.emit?.({ type: "tool_start", toolName: "sag_search", arguments: args });
      const call = await this.callToolAndPersist(input.runner, input.session.id, "sag_search", args, input.messageId, input.signal, input.emit);
      input.toolCalls.push(call);
      input.emit?.({ type: "tool_end", toolCall: call });
      finalText = "Đã gọi sag_search qua MCP và trả về kết quả truy hồi cùng search trace.";
    }

    const eventId = input.userContent.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (/event|事件|sự kiện|su kien/.test(lower) && eventId) {
      assertNotAborted(input.signal);
      const args = { eventId };
      input.emit?.({ type: "tool_start", toolName: "sag_get_event", arguments: args });
      const call = await this.callToolAndPersist(input.runner, input.session.id, "sag_get_event", args, input.messageId, input.signal, input.emit);
      input.toolCalls.push(call);
      input.emit?.({ type: "tool_end", toolCall: call });
      finalText = "Đã gọi sag_get_event qua MCP để lấy chi tiết event.";
    }

    if (input.toolCalls.length === 0) {
      finalText = "Hiện chưa có LLM key nên chế độ fallback chỉ hỗ trợ truy hồi tài liệu và tra cứu event. Bạn có thể thử hỏi: tìm trong project hiện tại về SAG multi-search.";
    }
    return finalText;
  }

  private async runLlmToolFlow(input: {
    runner: Awaited<ReturnType<McpAgentService["createRunner"]>>;
    session: McpSessionRecord;
    messageId: string;
    history: Array<{ role: string; content: string }>;
    settings: AiRuntimeSettings;
    tools: ToolInfo[];
    userContent: string;
    toolCalls: McpToolCallRecord[];
    signal?: AbortSignal;
    emit?: StreamEmitter;
  }): Promise<string> {
    let finalText = "";
    const observations: Array<{ toolName: string; result: unknown; error?: string | null }> = [];
    for (let step = 0; step < 6; step += 1) {
      assertNotAborted(input.signal);
      input.emit?.({ type: "stage", label: `LLM planning ${step + 1}`, detail: "Đang quyết định MCP tool call tiếp theo" });
      const action = await planToolAction({
        userContent: input.userContent,
        session: input.session,
        history: input.history,
        settings: input.settings,
        tools: input.tools,
        observations,
        signal: input.signal
      });
      assertNotAborted(input.signal);
      if (action.action === "final") {
        finalText = action.final ?? "Tool call đã hoàn tất.";
        break;
      }
      if (!action.toolName || !input.tools.some((tool) => tool.name === action.toolName)) {
        finalText = "LLM đã chọn một tool không tồn tại, nên lượt gọi này đã dừng.";
        break;
      }
      const toolArguments = normalizeToolArguments(action.toolName, action.arguments ?? {});
      input.emit?.({ type: "tool_start", toolName: action.toolName, arguments: toolArguments });
      const call = await this.callToolAndPersist(
        input.runner,
        input.session.id,
        action.toolName,
        toolArguments,
        input.messageId,
        input.signal,
        input.emit
      );
      assertNotAborted(input.signal);
      input.toolCalls.push(call);
      input.emit?.({ type: "tool_end", toolCall: call });
      observations.push({
        toolName: action.toolName,
        result: call.result,
        error: call.error
      });
      if (call.status === "FAILED") {
        finalText = `Gọi tool ${action.toolName} thất bại: ${call.error ?? "Lỗi không rõ"}`;
        break;
      }
    }
    return finalText || "Đã hoàn tất lượt gọi MCP tool này.";
  }

  private async callToolAndPersist(
    runner: Awaited<ReturnType<McpAgentService["createRunner"]>>,
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>,
    messageId?: string,
    signal?: AbortSignal,
    emit?: StreamEmitter
  ): Promise<McpToolCallRecord> {
    const started = performance.now();
    try {
      assertNotAborted(signal);
      const result = await runner.client.callTool(
        {
          name: toolName,
          arguments: args
        },
        undefined,
        {
          timeout: config.MCP_TOOL_TIMEOUT_MS,
          signal,
          resetTimeoutOnProgress: true,
          onprogress: (progress) => {
            const modelLog = parseModelCallLogProgress(progress.message);
            if (modelLog) {
              importModelCallLog(modelLog);
            }
            if (toolName === "sag_search" || toolName === "sag_explain_search") {
              const event = parseSearchProgress(progress.message);
              if (event) {
                emit?.({ type: "search_progress", event });
              }
            }
          }
        }
      );
      assertNotAborted(signal);
      return addMcpToolCall({
        sessionId,
        messageId,
        toolName,
        arguments: args,
        result,
        status: result.isError ? "FAILED" : "SUCCEEDED",
        durationMs: Math.round(performance.now() - started),
        error: result.isError ? extractToolText(result) : null
      });
    } catch (error) {
      if (signal?.aborted) {
        throw new McpRunAbortedError();
      }
      return addMcpToolCall({
        sessionId,
        messageId,
        toolName,
        arguments: args,
        result: null,
        status: "FAILED",
        durationMs: Math.round(performance.now() - started),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

class McpRunAbortedError extends Error {
  constructor() {
    super("Hội thoại MCP đã dừng");
    this.name = "AbortError";
  }
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new McpRunAbortedError();
  }
}

function normalizeToolArguments(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
  const scopedArgs = { ...args };
  delete scopedArgs.sourceId;
  delete scopedArgs.sourceIds;
  delete scopedArgs.projectId;
  delete scopedArgs.projectIds;
  if (toolName !== "sag_search" && toolName !== "sag_explain_search") {
    return scopedArgs;
  }
  const strategy = scopedArgs.strategy === "vector" || scopedArgs.strategy === "multi"
    ? scopedArgs.strategy
    : "multi";
  const normalized: Record<string, unknown> = {
    ...scopedArgs,
    strategy,
    returnTrace: true
  };
  if (scopedArgs.searchMode === "standard" || scopedArgs.searchMode === "fast") {
    normalized.searchMode = scopedArgs.searchMode;
  }
  return normalized;
}

function shouldAutoTitleSession(session: McpSessionRecord, messages: Array<{ role: string }>): boolean {
  if (messages.some((message) => message.role === "user")) {
    return false;
  }
  if (session.metadata.autoTitle === false) {
    return false;
  }
  return session.metadata.autoTitle === true ||
    session.title === defaultMcpSessionTitle() ||
    session.title === "新对话" ||
    session.title === "新 MCP 测试会话" ||
    session.title === "Phiên test MCP mới";
}

async function planToolAction(input: {
  userContent: string;
  session: McpSessionRecord;
  history: Array<{ role: string; content: string }>;
  settings: AiRuntimeSettings;
  tools: ToolInfo[];
  observations: Array<{ toolName: string; result: unknown; error?: string | null }>;
  signal?: AbortSignal;
}): Promise<ToolAction> {
  assertNotAborted(input.signal);
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(input.signal?.reason);
  input.signal?.addEventListener("abort", abortFromParent, { once: true });
  const timeout = setTimeout(() => controller.abort(), input.settings.llmTimeoutMs);
  const url = `${input.settings.llmBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model: input.settings.llmModel,
    messages: [
      {
        role: "system",
        content: [
          "You are an intelligent MCP tool-calling agent for SAG.",
          "Return JSON only. Choose either call_tool or final.",
          "",
          "Before calling any tool, silently analyze the user's question:",
          "1. Identify the actual information need, not just the literal wording.",
          "2. Extract key entities, concepts, aliases, time ranges, document names, and constraints.",
          "3. Rewrite the user's question into a concise SAG search query that preserves the user's language.",
          "4. Prefer the rewritten search query over the raw user message when calling sag_search.",
          "5. If the question asks for comparison, cause/effect, architecture, process, evidence, or details from project documents, call sag_search first.",
          "6. If the user asks about a specific event id, call sag_get_event.",
          "7. The MCP server is already bound to the current project through startup configuration; never pass sourceId, sourceIds, projectId, or projectIds in tool arguments.",
          "",
          "When calling sag_search:",
          "- Set strategy to multi unless the user explicitly asks for pure vector retrieval.",
          "- Omit searchMode unless the user explicitly asks for fast or standard retrieval; the configured default search mode will apply.",
          "- Set returnTrace to true.",
          "- Use a clear query field that reflects your analysis of the user's intent.",
          "- Do not invent project ids, source ids, eventIds, or facts.",
          "",
          "After observing SAG results, answer from retrieved evidence. If the retrieved evidence is insufficient, say so and optionally perform one more refined sag_search.",
          "When citation_sources are provided, cite important claims with [1], [2], [3] style markers that match citation_sources.index.",
          "Do not invent citation numbers. Do not cite a source that does not support the sentence.",
          "Schema: {\"action\":\"call_tool\",\"toolName\":\"string\",\"arguments\":{}} or {\"action\":\"final\",\"final\":\"string\"}."
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify({
          user_message: input.userContent,
          session: {
            id: input.session.id,
            projectId: input.session.sourceIds[0] ?? null
          },
          recent_messages: input.history.slice(-10),
          available_tools: input.tools,
          observations: input.observations,
          citation_sources: collectCitationSourcesFromObservations(input.observations)
        })
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  };
  const log = createModelCallLogger({
    kind: "llm",
    operation: "mcp.planToolAction",
    request: {
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    }
  });
  let logged = false;
  try {
    assertNotAborted(input.signal);
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${input.settings.llmApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const { responseText, responseBody } = await readResponseBody(response);
    if (!response.ok) {
      const error = new Error(`Yêu cầu LLM planning thất bại: ${response.status} ${responseText.slice(0, 500)}`);
      log.fail(error, {
        status: response.status,
        body: responseBody
      });
      logged = true;
      throw error;
    }
    const json = responseBody as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const action = normalizeToolAction(parsed);
    log.succeed({
      status: response.status,
      body: responseBody,
      parsed
    });
    logged = true;
    return action;
  } catch (error) {
    if (input.signal?.aborted) {
      throw new McpRunAbortedError();
    }
    if (!logged) {
      log.fail(error);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    input.signal?.removeEventListener("abort", abortFromParent);
  }
}

function parseJsonOrText(text: string): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readResponseBody(response: Response): Promise<{ responseText: string; responseBody: unknown }> {
  const maybeText = (response as Response & { text?: () => Promise<string> }).text;
  if (typeof maybeText === "function") {
    const responseText = await maybeText.call(response);
    return {
      responseText,
      responseBody: parseJsonOrText(responseText)
    };
  }
  const responseBody = await (response as Response & { json: () => Promise<unknown> }).json();
  return {
    responseText: typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody),
    responseBody
  };
}

function normalizeToolAction(raw: unknown): ToolAction {
  const record = raw as Record<string, unknown>;
  if (record.action === "call_tool") {
    return {
      action: "call_tool",
      toolName: record.toolName == null ? undefined : String(record.toolName),
      arguments: isRecord(record.arguments) ? record.arguments : {}
    };
  }
  return {
    action: "final",
    final: record.final == null ? "Tool call đã hoàn tất." : String(record.final)
  };
}

function collectAnswerCitations(toolCalls: McpToolCallRecord[]): AnswerCitation[] {
  const citations: AnswerCitation[] = [];
  const seenChunkIds = new Set<string>();
  for (const toolCall of toolCalls) {
    if (toolCall.toolName !== "sag_search" || toolCall.status !== "SUCCEEDED") {
      continue;
    }
    const result = parseToolJsonResult(toolCall.result);
    const query = typeof toolCall.arguments.query === "string" ? toolCall.arguments.query : undefined;
    for (const section of extractCitationSections(result)) {
      if (seenChunkIds.has(section.chunkId)) {
        continue;
      }
      seenChunkIds.add(section.chunkId);
      citations.push({
        index: citations.length + 1,
        ...section,
        query,
        toolCallId: toolCall.id
      });
      if (citations.length >= 5) {
        return citations;
      }
    }
  }
  return citations;
}

function collectCitationSourcesFromObservations(
  observations: Array<{ toolName: string; result: unknown; error?: string | null }>
) {
  const citations: AnswerCitation[] = [];
  const seenChunkIds = new Set<string>();
  for (const observation of observations) {
    if (observation.toolName !== "sag_search" || observation.error) {
      continue;
    }
    for (const section of extractCitationSections(parseToolJsonResult(observation.result))) {
      if (seenChunkIds.has(section.chunkId)) {
        continue;
      }
      seenChunkIds.add(section.chunkId);
      citations.push({
        index: citations.length + 1,
        ...section,
        content: previewForPrompt(section.content)
      });
      if (citations.length >= 5) {
        return citations;
      }
    }
  }
  return citations;
}

function extractCitationSections(result: unknown): Array<Omit<AnswerCitation, "index" | "query" | "toolCallId">> {
  if (!isRecord(result) || !Array.isArray(result.sections)) {
    return [];
  }
  const sections: Array<Omit<AnswerCitation, "index" | "query" | "toolCallId">> = [];
  for (const section of result.sections) {
    if (!isRecord(section)) {
      continue;
    }
    const chunkId = typeof section.chunkId === "string" ? section.chunkId : "";
    const sourceId = typeof section.sourceId === "string" ? section.sourceId : "";
    const content = typeof section.content === "string" ? section.content.trim() : "";
    if (!chunkId || !sourceId || !content) {
      continue;
    }
    sections.push({
      chunkId,
      sourceId,
      documentId: typeof section.documentId === "string" ? section.documentId : undefined,
      heading: typeof section.heading === "string" ? section.heading : undefined,
      content,
      rank: typeof section.rank === "number" ? section.rank : undefined,
      score: typeof section.score === "number" ? section.score : undefined
    });
  }
  return sections;
}

function parseToolJsonResult(result: unknown): unknown {
  const text = extractToolText(result);
  if (!text) {
    return result;
  }
  try {
    return JSON.parse(text);
  } catch {
    return result;
  }
}

function previewForPrompt(content: string): string {
  return content.length > 1200 ? `${content.slice(0, 1200)}...` : content;
}

function resolveMcpServerCommand(): { command: string; args: string[]; cwd: string } {
  const cwd = path.resolve(process.cwd());
  const command = process.env.SAG_MCP_SERVER_COMMAND;
  if (command) {
    return {
      command,
      args: process.env.SAG_MCP_SERVER_ARGS ? JSON.parse(process.env.SAG_MCP_SERVER_ARGS) as string[] : [],
      cwd
    };
  }
  if (shouldUseDistServer(cwd)) {
    return {
      command: process.execPath,
      args: [path.join(cwd, "dist", "src", "mcp", "server.js")],
      cwd
    };
  }
  return {
    command: path.join(cwd, "node_modules", ".bin", "tsx"),
    args: [path.join(cwd, "src", "mcp", "server.ts")],
    cwd
  };
}

function shouldUseDistServer(cwd: string): boolean {
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return process.env.NODE_ENV === "production" || entry.startsWith(path.join(cwd, "dist"));
}

function childEnv(projectId: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  env.SAG_LOG_STDERR = "true";
  env.SAG_MCP_SOURCE_ID = projectId;
  return env;
}

function chunkText(content: string, size: number): string[] {
  if (content.length <= size) return [content];
  const chunks: string[] = [];
  for (let index = 0; index < content.length; index += size) {
    chunks.push(content.slice(index, index + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseSearchProgress(message: string | undefined): SearchProgressEvent | null {
  if (!message) {
    return null;
  }
  try {
    const parsed = JSON.parse(message) as { kind?: unknown; event?: unknown };
    if (parsed.kind !== "sag_search_progress" || !isRecord(parsed.event)) {
      return null;
    }
    const event = parsed.event;
    if (
      event.type !== "step" ||
      typeof event.key !== "string" ||
      typeof event.title !== "string" ||
      typeof event.detail !== "string" ||
      (event.status !== "running" && event.status !== "done" && event.status !== "failed")
    ) {
      return null;
    }
    return {
      type: "step",
      key: event.key,
      title: event.title,
      detail: event.detail,
      status: event.status,
      payload: event.payload,
      durationMs: typeof event.durationMs === "number" ? event.durationMs : undefined
    };
  } catch {
    return null;
  }
}

function parseModelCallLogProgress(message: string | undefined): ModelCallLogRecord | null {
  if (!message) {
    return null;
  }
  try {
    const parsed = JSON.parse(message) as { kind?: unknown; log?: unknown };
    if (parsed.kind !== "sag_model_call_log" || !isRecord(parsed.log)) {
      return null;
    }
    const log = parsed.log;
    if (
      typeof log.sequence !== "number" ||
      typeof log.id !== "string" ||
      (log.kind !== "llm" && log.kind !== "embedding") ||
      typeof log.operation !== "string" ||
      (log.status !== "SUCCEEDED" && log.status !== "FAILED") ||
      typeof log.createdAt !== "string" ||
      typeof log.durationMs !== "number"
    ) {
      return null;
    }
    return {
      sequence: log.sequence,
      id: log.id,
      kind: log.kind,
      operation: log.operation,
      status: log.status,
      createdAt: log.createdAt,
      durationMs: log.durationMs,
      request: log.request,
      response: log.response,
      error: typeof log.error === "string" ? log.error : undefined
    };
  } catch {
    return null;
  }
}

function extractToolText(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.content)) {
    return "";
  }
  return value.content
    .map((item) => isRecord(item) && item.type === "text" ? String(item.text ?? "") : "")
    .filter(Boolean)
    .join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const mcpAgentService = new McpAgentService();
