import { config, SUPPORTED_EMBEDDING_DIMENSIONS } from "../src/config/env.js";
import { upsertAiProviderSettings } from "../src/db/repositories.js";
import { closePool } from "../src/db/pool.js";

await upsertAiProviderSettings({
  embeddingBaseUrl: config.EMBEDDING_BASE_URL,
  embeddingModel: config.EMBEDDING_MODEL,
  embeddingDimensions: SUPPORTED_EMBEDDING_DIMENSIONS,
  embeddingApiKey: config.EMBEDDING_API_KEY || null,
  preserveEmbeddingApiKey: !config.EMBEDDING_API_KEY,
  llmBaseUrl: config.LLM_BASE_URL,
  llmModel: config.LLM_MODEL,
  llmApiKey: config.LLM_API_KEY || null,
  preserveLlmApiKey: !config.LLM_API_KEY,
  llmTimeoutMs: config.LLM_TIMEOUT_MS,
  llmMaxRetries: config.LLM_MAX_RETRIES,
  metadata: {
    updatedVia: "sync-ai-settings-from-env",
    defaultSearchMode: config.DEFAULT_SEARCH_MODE,
    defaultSearchTopK: 10,
    defaultChunkingMode: "heading_strict",
    chunkTokenLimit: 512,
    chunkOverlapTokens: 100
  }
});

console.log("AI settings synced from .env.");
await closePool();
