---
name: sag-system-architecture
description: Learn from and rebuild a SAG-style TypeScript retrieval workbench with PostgreSQL/pgvector, migrations, Docker, Web UI, HTTP API, MCP tools, and agentic chat orchestration. Use when studying this repository, explaining whether it is a chatbot or agent, or preparing requirements so an AI coding agent can implement a similar system.
---

# SAG System Architecture Skill

Tài liệu này dùng để học cách project SAG tổ chức code và cũng là một "bản giao việc" cho agent như Codex khi cần dựng lại một hệ thống tương tự.

## Mục Tiêu

Khi làm việc với repo kiểu này, hãy xây theo hướng:

- Một backend TypeScript rõ layer: `config`, `db`, `services`, `api`, `mcp`, `ai`, `observability`.
- Một frontend riêng trong `web/`, dùng API nội bộ thay vì truy cập DB trực tiếp.
- PostgreSQL/pgvector chạy qua Docker để dev setup nhanh và giống nhau giữa máy.
- Migration SQL tuần tự trong `migrations/`, không sửa migration cũ sau khi đã chạy.
- SAG retrieval lưu tri thức theo `chunk -> event -> entity/relation`, không chỉ lưu chunk vector như RAG truyền thống.
- MCP server expose năng lực của hệ thống thành tools để agent khác gọi được.

## Project Này Là Chatbot Hay Agent?

Project này là cả hai, nhưng cần phân biệt:

- **Chatbot UI**: phần WebUI cho người dùng nhập câu hỏi và xem câu trả lời. Nó giống ChatGPT interface.
- **Agentic chat orchestration**: backend `McpAgentService` dùng LLM để quyết định gọi MCP tool nào, gọi tool, lưu tool call, rồi tạo câu trả lời.
- **MCP tool server**: `src/mcp/server.ts` expose `sag_search`, `sag_ingest_document`, `sag_explain_search`, `sag_get_event`.

Vì vậy, project này không chỉ là chatbot tĩnh. Nó là một chatbot có agent loop ngắn:

```text
User message
-> LLM planner
-> chọn MCP tool
-> gọi sag_search / sag_get_event / ...
-> nhận observation
-> LLM trả lời cuối
-> lưu message + tool calls + citations
```

Nó chưa phải một autonomous agent dài hạn kiểu tự đặt mục tiêu, tự lập kế hoạch nhiều giờ, tự chạy job nền độc lập. Nó là **agentic retrieval workbench**: agent dùng tools để truy hồi tri thức trong project hiện tại.

## Cấu Trúc Folder Nên Học

```text
src/
  config/          đọc env, validate config bằng zod
  db/              pool, migration runner, repository SQL, vector helpers, seed
  ai/              client gọi LLM / embedding / rerank
  ingestion/       chunking markdown và extractor
  services/        business logic chính
  api/             Fastify HTTP server cho WebUI
  mcp/             MCP server expose tool cho agent khác
  observability/   logger và raw model call logs
  types.ts         type dùng chung backend

web/
  src/             React app, API client, i18n, components

migrations/
  001_init.sql
  002_*.sql
  ...

scripts/
  demo, kiểm tra DB, cấu hình settings, ingest/search mẫu

test/
  unit/integration tests cho chunking, AI settings, embedding client
```

Nguyên tắc quan trọng: không để API route chứa nhiều business logic. API chỉ parse request, gọi service, trả response. SQL nằm trong repository. Service là nơi điều phối pipeline.

## Nếu Chuyển Sang Python/FastAPI

Nếu bạn quen Python/FastAPI, hãy hiểu repo TypeScript này như một kiến trúc tham khảo, không nhất thiết phải copy nguyên stack.

Mapping tương đương:

```text
TypeScript repo hiện tại        Python/FastAPI nên dùng
---------------------------------------------------------------
src/config/env.ts               app/core/config.py
src/db/pool.ts                  app/db/session.py
src/db/migrate.ts               Alembic migrations
src/db/repositories.ts          app/repositories/*.py
src/api/server.ts               app/api/routes/*.py + app/main.py
src/services/*.ts               app/services/*.py
src/ai/*.ts                     app/ai/*.py
src/ingestion/*                 app/ingestion/*
src/mcp/server.ts               app/mcp/server.py
src/observability/*             app/observability/*
web/                            frontend React/Vite hoặc Next.js
```

Folder Python gợi ý:

```text
app/
  main.py
  core/
    config.py
    logging.py
  db/
    session.py
    vector.py
  models/
    tables.py              # SQLAlchemy models nếu dùng ORM
  repositories/
    projects.py
    documents.py
    search.py
    mcp_sessions.py
  schemas/
    api.py                 # Pydantic request/response
  ai/
    llm_client.py
    embedding_client.py
    rerank_client.py
  ingestion/
    chunking.py
    extractor.py
  services/
    ingestion_service.py
    search_service.py
    graph_service.py
    mcp_agent_service.py
  api/
    routes_projects.py
    routes_documents.py
    routes_search.py
    routes_mcp.py
    routes_settings.py
  mcp/
    server.py
  observability/
    model_call_log.py

alembic/
  versions/

frontend/
  ...
```

Stack Python nên chọn:

- **FastAPI** cho HTTP API.
- **Pydantic Settings** cho `.env`.
- **SQLAlchemy Core/ORM** hoặc raw SQL với `asyncpg`.
- **Alembic** cho migration thay vì tự viết migration runner.
- **pgvector** extension trong PostgreSQL.
- **Celery/RQ/Arq** nếu ingestion tài liệu dài cần chạy nền.
- **MCP Python SDK** nếu muốn expose tools cho agent.

Nguyên tắc vẫn giữ nguyên: route mỏng, service điều phối, repository lo DB, AI client tách riêng, migration không sửa ngược.

## Docker Và Database

Repo dùng `docker-compose.yml` để tạo PostgreSQL có pgvector:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    volumes:
      - sag_lite_pgdata:/var/lib/postgresql/data
```

Lý do nên làm như vậy:

- Người mới chỉ cần `docker compose up -d`.
- Không phải cài PostgreSQL/pgvector thủ công.
- Volume giữ dữ liệu giữa các lần restart.
- Healthcheck giúp biết DB đã sẵn sàng chưa.

Khi làm hệ thống mới, luôn chuẩn bị:

- `docker-compose.yml` cho DB local.
- `.env.example` không chứa secret thật.
- `.gitignore` bỏ `.env`, logs, dist, node_modules.
- Lệnh `npm run db:setup` hoặc tương đương.

## Migration

Migration nằm trong `migrations/` và chạy bởi `src/db/migrate.ts`.

Pattern nên giữ:

```text
migrations/
  001_init.sql
  002_add_feature.sql
  003_add_settings.sql
```

Runner migration nên có bảng `schema_migrations` để ghi file đã chạy. Khi chạy lại, file đã applied sẽ bị bỏ qua.

Quy tắc:

- Migration đã merge hoặc đã chạy trên máy người khác thì không sửa nội dung.
- Thay đổi schema mới thì tạo file migration mới.
- Seed data để ở `src/db/seed.ts`, không trộn với migration trừ khi đó là dữ liệu hệ thống bắt buộc.
- Dùng SQL rõ ràng thay vì ORM magic nếu retrieval cần query phức tạp.

## Thiết Kế Database SAG

Các nhóm bảng chính:

- `sources`: project/kho tri thức.
- `documents`: tài liệu upload vào project.
- `document_sections`: section theo heading.
- `source_chunks`: chunk gốc, có `embedding`.
- `events`: semantic unit trích từ chunk, có title/content embedding.
- `entities`: entity trích từ event/chunk, có embedding và full-text search.
- `event_entities`: quan hệ event-entity, có thể có embedding.
- `mcp_sessions`, `mcp_messages`, `mcp_tool_calls`: lịch sử hội thoại agent/MCP.
- `ai_provider_settings`: cấu hình model/base URL/API key trạng thái.

Điểm học được: vector DB ở đây không phải một dịch vụ riêng như Pinecone. PostgreSQL + pgvector đóng vai vector DB bằng các cột `vector(1024)` trong bảng domain.

## SAG Khác RAG Thường Ở Đâu?

RAG thường:

```text
document -> chunks -> chunk embeddings -> vector search -> context
```

SAG trong repo này:

```text
document -> chunks
chunks -> events
events -> entities
event <-> entity relations
chunks/events/entities/relations -> embeddings
query -> entity/event recall -> graph expansion -> rerank -> source chunks
```

Giá trị chính:

- Event giữ một đơn vị ý nghĩa hoàn chỉnh.
- Entity làm điểm neo để search và mở rộng đa hop.
- Relation event-entity cho phép đi từ một ý sang ý liên quan.
- Chunk gốc vẫn được trả về để cite và làm context cho LLM.

## Hiểu SAG Như Một Đồ Thị Nhẹ

SAG không nhất thiết xây một knowledge graph nặng kiểu ontology phức tạp. Nó xây một graph nhẹ, đủ dùng cho retrieval.

Các node chính:

```text
Document
  -> Section
    -> Chunk
      -> Event
        <-> Entity
```

Trong đó:

- **Chunk** là đoạn văn bản gốc dùng để citation.
- **Event** là một sự kiện/ý nghĩa hoàn chỉnh được rút ra từ chunk.
- **Entity** là người, tổ chức, sản phẩm, khái niệm, ngày tháng, số liệu, tính năng, điều khoản...
- **Event-Entity edge** nói rằng event này có liên quan tới entity này.

Ví dụ tài liệu:

```text
SAG Pro có giá 29 USD/tháng. Gói này bao gồm graph search và MCP integration.
MCP integration cho phép Claude Desktop hoặc Cursor gọi sag_search.
```

RAG thường tạo 1-2 chunk rồi embed chunk. Nếu user hỏi:

```text
Gói nào cho phép Cursor gọi search?
```

Vector search có thể bị lệch vì query nói "Cursor gọi search", còn chunk đầu nói "SAG Pro" và "graph search", chunk sau nói "MCP integration". Nếu hai ý nằm ở hai chunk khác nhau, vector search phải may mắn kéo cả hai chunk về.

SAG sẽ tổ chức thành:

```text
Event A: SAG Pro includes graph search and MCP integration
  - Entity: SAG Pro
  - Entity: graph search
  - Entity: MCP integration

Event B: MCP integration allows Cursor to call sag_search
  - Entity: MCP integration
  - Entity: Cursor
  - Entity: sag_search
```

Graph nối hai event qua entity chung `MCP integration`:

```text
SAG Pro
  <- Event A
    -> MCP integration
      <- Event B
        -> Cursor
        -> sag_search
```

Khi query nhắc `Cursor` và `search`, SAG có thể recall Event B trước, rồi nhảy qua entity `MCP integration` để mở rộng sang Event A. Từ đó hệ thống biết câu trả lời liên quan tới `SAG Pro`.

Điểm hơn RAG thường:

- RAG thường hỏi "chunk nào giống query nhất?"
- SAG hỏi thêm "entity nào trong query?", "event nào nối với entity đó?", "event nào khác liên quan qua entity chung?"
- RAG thường yếu khi câu trả lời cần ghép 2-3 mảnh thông tin.
- SAG tốt hơn ở multi-hop vì graph event-entity tạo đường đi giữa các mảnh thông tin.

Nhưng SAG không miễn phí. Nó đổi chi phí ingest cao hơn để search thông minh hơn về sau.

## Pipeline Ingestion

Code chính: `src/services/ingestion-service.ts`.

Luồng:

```text
Upload Markdown/TXT
-> validate file
-> create source/document
-> chunk Markdown
-> embed chunks
-> LLM extract event/entities
-> embed events/entities/relations
-> insert DB trong transaction
-> cập nhật progress cho WebUI
```

Khi triển khai hệ thống mới, tách riêng:

- `chunking/`: logic tách tài liệu.
- `extract/`: logic biến text thành event/entity.
- `ai/embedding-client.ts`: client gọi embedding.
- `services/ingestion-service.ts`: điều phối toàn bộ.
- `db/repositories.ts`: insert/update/query SQL.

## Chi Phí Token Và Tài Liệu Dài

Đúng: SAG có bước LLM extract event/entities, nên ingest sẽ tốn token hơn RAG thường.

RAG thường khi ingest:

```text
chunk document
-> embedding từng chunk
-> lưu vector
```

SAG khi ingest:

```text
chunk document
-> embedding từng chunk
-> gọi LLM cho từng chunk để extract event/entities
-> embedding event/entity/relation
-> lưu graph
```

Vì vậy chi phí tăng ở thời điểm ingest. Nhưng đổi lại, lúc search hệ thống có cấu trúc tốt hơn để recall chính xác hơn.

### Có Ném Cả Tài Liệu Vào Một Lần LLM Không?

Không nên. Với tài liệu dài, không ném toàn bộ document vào một call LLM.

Luồng đúng là:

```text
Document dài
-> chia section/chunk
-> mỗi chunk gọi LLM extract riêng
-> mỗi chunk tạo tối đa một hoặc vài event
-> merge entity trùng/tương tự ở DB
```

Ví dụ tài liệu 100 trang:

```text
100 trang
-> 400 chunks
-> 400 LLM extraction calls nhỏ
-> batch embedding cho chunks/events/entities
```

Điểm lợi:

- Không vượt context window.
- Nếu một chunk fail, retry chunk đó.
- Có thể chạy song song theo concurrency.
- Có progress bar cho user.
- Có thể cache theo hash chunk để tránh extract lại.

Điểm bất lợi:

- Nhiều request LLM hơn.
- Cần queue/background job.
- Cần retry/rate limit.
- Cần kiểm soát chi phí.

### Khi Nào SAG Đáng Tiền?

SAG đáng dùng khi:

- Tài liệu có nhiều quan hệ chéo.
- Câu hỏi thường cần ghép nhiều ý.
- Người dùng cần trace/citation/debug.
- Dữ liệu được ingest một lần nhưng search nhiều lần.
- Agent cần context chính xác, ít chunk nhiễu.

SAG có thể không đáng nếu:

- Dữ liệu rất nhỏ.
- Chỉ hỏi fact đơn giản nằm trong một chunk.
- Ingest cực nhiều tài liệu nhưng ít search.
- Chi phí LLM extraction không chấp nhận được.

### Cách Giảm Chi Phí

Các cách tối ưu thực tế:

- Dùng `heading_strict` để chunk theo heading, tránh chia quá vụn.
- Đặt giới hạn token chunk hợp lý, ví dụ 512-1200 token.
- Chỉ extract event/entity khi tài liệu quan trọng.
- Cho phép `extract=false` để chỉ làm vector RAG baseline.
- Cache kết quả extract theo `sha256(content)`.
- Batch embedding thay vì gọi từng text một.
- Dùng model rẻ hơn cho extraction, model tốt hơn cho final answer.
- Dùng fast search mode: BM25 entity recall + rerank model, tránh LLM query extraction.
- Chạy ingestion nền, không block request upload.
- Lưu raw model logs để biết bước nào đốt token nhiều.

### Công Thức Ước Tính Thô

Giả sử:

```text
N = số chunk
C = token trung bình mỗi chunk
P = token prompt hướng dẫn extract
O = token output event/entity trung bình
```

Chi phí LLM extraction xấp xỉ:

```text
N * (P + C + O)
```

Nếu 1 tài liệu tạo 400 chunks, mỗi chunk 700 token, prompt 500 token, output 300 token:

```text
400 * (500 + 700 + 300) = 600,000 token
```

Đây là lý do phải có:

- chunking tốt,
- concurrency có giới hạn,
- retry thông minh,
- cache,
- lựa chọn model rẻ cho ingest.

### Trade-off Cốt Lõi

SAG trả chi phí trước để mua cấu trúc:

```text
Ingest đắt hơn
-> search có đường đi entity-event rõ hơn
-> ít context rác hơn
-> agent trả lời multi-hop tốt hơn
```

RAG thường rẻ hơn khi ingest:

```text
Ingest rẻ
-> search phụ thuộc vector similarity
-> dễ miss thông tin liên quan gián tiếp
-> dễ phải nhét nhiều chunk hơn vào LLM lúc trả lời
```

## Pipeline Search

Code chính: `src/services/search-service.ts`.

Có hai strategy:

- `vector`: embed query rồi search `source_chunks.embedding`.
- `multi`: SAG event/entity retrieval.

Multi search:

```text
query
-> query embedding
-> fast mode: BM25/full-text match entities
-> standard mode: LLM extract query entities
-> recall events linked to entities
-> recall events by title vector
-> expand through event-entity graph
-> coarse rank by event content vector
-> rerank by rerank model or LLM
-> fetch original chunks
-> return sections + trace
```

Điểm nên copy khi làm hệ thống mới:

- Luôn trả `traceId`.
- Ghi timings theo từng step.
- Emit progress event cho UI.
- Có fallback vector search nếu SAG không tìm được seed event.

## MCP Trong Project

MCP server nằm ở `src/mcp/server.ts`. Nó biến năng lực SAG thành tools:

- `sag_ingest_document`: import tài liệu vào project hiện tại.
- `sag_search`: search trong project hiện tại.
- `sag_explain_search`: trả trace để debug search.
- `sag_get_event`: lấy chi tiết event.

MCP server đọc project id từ env:

```text
SAG_MCP_SOURCE_ID
SAG_MCP_PROJECT_ID
```

WebUI không gọi thẳng function nội bộ cho agent chat. Nó khởi động MCP client bằng `StdioClientTransport`, kết nối tới MCP server local, rồi gọi tool thật. Đây là cách test tích hợp MCP thực tế ngay trong WebUI.

## WebUI Và API

Backend:

- `src/api/server.ts`: Fastify routes, static serving production build.
- `src/index.ts`: start HTTP server.

Frontend:

- `web/src/App.tsx`: app shell, tabs, chat, documents, graph, MCP/settings.
- `web/src/lib/api.ts`: API client.
- `web/src/i18n.tsx`: language preference và translations.

Dev setup:

```text
npm run dev
-> concurrently
   -> npm run dev:api  # Fastify API :4173
   -> npm run dev:web  # Vite :5173
```

Vite proxy chuyển `/api` sang backend `4173`.

## Cách Chuẩn Bị Cho Agent Triển Khai Hệ Thống Mới

Khi muốn agent như Codex xây lại hệ thống tương tự, hãy chuẩn bị các thông tin này trước.

### 1. Product Brief

Viết rõ:

- Người dùng là ai.
- Họ upload dữ liệu gì.
- Họ hỏi dạng câu hỏi gì.
- Kết quả cần có citation hay không.
- Cần WebUI, API, MCP, hay cả ba.

Ví dụ:

```text
Xây hệ thống hỏi đáp tài liệu pháp lý nội bộ.
User upload PDF/Markdown/TXT.
Hệ thống cần trích điều khoản, thực thể pháp lý, ngày tháng, bên liên quan.
Chat phải trả lời có dẫn nguồn.
Agent ngoài có thể gọi search qua MCP.
```

### 2. Domain Schema

Chuẩn bị entity/event domain:

```text
Event là gì?
Entity gồm các loại nào?
Relation nào quan trọng?
Metadata nào cần lưu?
```

Ví dụ với pháp lý:

```text
entities:
  - party
  - contract
  - clause
  - date
  - obligation
  - penalty

events:
  - clause obligation
  - payment deadline
  - termination condition
```

### 3. Retrieval Strategy

Chọn trước:

- Chỉ vector search hay SAG multi-hop?
- Có full-text/BM25 không?
- Có rerank model không?
- Top-K mặc định bao nhiêu?
- Có cần trace/debug UI không?

### 4. Model Provider

Chuẩn bị:

- LLM base URL, model, API key.
- Embedding base URL, model, dimensions.
- Rerank model nếu có.
- API có OpenAI-compatible không.
- Timeout/retry.

Không đưa secret vào prompt public. Dùng `.env`.

### 5. Database Plan

Yêu cầu agent tạo:

```text
docker-compose.yml
migrations/
src/db/pool.ts
src/db/migrate.ts
src/db/repositories.ts
src/db/seed.ts
.env.example
```

Với pgvector, xác định trước embedding dimensions. Không đổi tùy tiện sau khi DB đã tạo vì cột vector cố định số chiều.

### 6. API Contract

Viết trước endpoint mong muốn:

```text
POST /api/projects
GET /api/projects
POST /api/documents/upload
GET /api/projects/:id/documents
POST /api/search
POST /api/mcp/sessions
POST /api/mcp/sessions/:id/messages
GET /api/settings/ai
PUT /api/settings/ai
```

### 7. UI Screens

Mô tả màn hình:

- Sidebar project.
- Chat tab.
- Documents tab.
- Graph tab.
- MCP tab.
- Settings tab.
- Right panel search trace/raw logs.

### 8. Observability

Yêu cầu agent thêm:

- Structured logger.
- Raw model call log.
- Search trace.
- Step timings.
- Upload progress.
- Error message thân thiện.

## Checklist Cho Agent Khi Bắt Đầu Repo Mới Bằng Python/FastAPI

1. Tạo skeleton Python package: `app/`, `tests/`, `alembic/`.
2. Tạo `.env.example`, `.gitignore`, `docker-compose.yml`.
3. Tạo `app/core/config.py` với Pydantic Settings.
4. Tạo DB session bằng SQLAlchemy/asyncpg.
5. Tạo Alembic và migration đầu tiên: extension vector, bảng core.
6. Viết repository layer.
7. Viết AI clients: embedding, LLM, rerank.
8. Viết ingestion pipeline.
9. Viết search pipeline vector trước, SAG multi sau.
10. Viết FastAPI routes.
11. Viết MCP server tools.
12. Viết WebUI nếu cần.
13. Thêm tests cho chunking, settings, clients, search edge cases.
14. Chạy `ruff`, `mypy` nếu dùng, `pytest`, `alembic upgrade head`.
15. Viết README, DB schema, pipeline docs.

## Những Quyết Định Nên Giữ

- Dùng service layer để orchestration, không nhét logic vào route.
- Dùng SQL migration đơn giản và minh bạch.
- Dùng Docker cho dependency hạ tầng.
- Dùng pgvector nếu muốn một DB gọn cho cả relational + vector.
- Dùng MCP để biến hệ thống thành tool server cho agent.
- Dùng trace để học và debug retrieval.
- Lưu message/tool call để replay và phân tích agent behavior.

## Những Bẫy Dễ Gặp

- `.env` có key nhưng DB settings ghi key rỗng, khiến runtime vẫn fallback.
- Embedding model trả số chiều khác `vector(1024)`.
- Vite proxy báo `502` vì API `4173` chưa chạy.
- Windows path làm `import.meta.url === file://...` sai nếu không dùng `pathToFileURL`.
- Migration chạy rồi mà sửa file cũ khiến máy khác lệch schema.
- MCP server quên set `SAG_MCP_SOURCE_ID`, tool không biết project nào để search.
- Chatbot không tự thành agent nếu không có planner/tool loop.

## Prompt Mẫu Để Giao Cho Agent

```text
Hãy xây một hệ thống retrieval workbench kiểu SAG.

Stack:
- Python 3.12+
- FastAPI
- Pydantic Settings
- SQLAlchemy hoặc asyncpg
- Alembic migrations
- React + Vite WebUI
- PostgreSQL + pgvector qua Docker
- MCP server expose search/ingest/get-detail tools

Yêu cầu:
- Tài liệu upload được chunk, embed, extract event/entity/relation.
- Search có vector mode và multi-hop SAG mode.
- Chat UI dùng MCP client nội bộ để gọi tools.
- Có search trace, raw model logs, citations.
- Có .env.example, docker-compose.yml, README, DB_SCHEMA.md, PIPELINE.md.

Hãy ưu tiên cấu trúc folder rõ:
app/core, app/db, app/repositories, app/schemas, app/ai, app/ingestion, app/services, app/api, app/mcp, app/observability, frontend/src.
```
