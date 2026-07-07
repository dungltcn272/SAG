<p align="center">
  <img src="docs/assets/logo.svg" alt="Zleap AI" width="220" />
</p>

# SAG


**Ngôn ngữ**: [English](README.md) | Tiếng Việt | [简体中文](README-CN.md)


> **SAG:** Công nghệ truy hồi dựa trên graph, có khả năng chạy trên dữ liệu động quy mô lớn.
>
> **Paper:** [https://arxiv.org/abs/2606.15971](https://arxiv.org/abs/2606.15971)


Dự án này là một workbench truy hồi tài liệu dùng được ngay, được xây dựng trên SAG. Sau khi bạn tải lên tài liệu Markdown hoặc TXT, SAG tự động xử lý chunking, vector hóa, trích xuất event, trích xuất entity và tổ chức quan hệ. Bạn có thể đặt câu hỏi trên tài liệu của project trong giao diện giống ChatGPT, kiểm tra chunks, events, entities, embeddings, search traces, raw model logs và khám phá knowledge graph.

![SAG chat workbench](docs/assets/sag-chat.png)

## RAG SOTA Và Benchmark

Mã tái lập benchmark của SAG: [Zleap-AI/SAG-Benchmark](https://github.com/Zleap-AI/SAG-Benchmark)

SAG là một phương pháp RAG thế hệ mới được thiết kế cho agent. Thay vì nhồi thêm nhiều chunk vào model, SAG tổ chức tri thức tài liệu bằng một cấu trúc nhẹ hơn:

```text
chunk -> event
chunk -> entities
event <-> entities
```

Mỗi chunk trích xuất một event hoàn chỉnh và nhiều entity. Event giữ lại đơn vị ngữ nghĩa đầy đủ, còn entity xây dựng index và cho phép mở rộng theo quan hệ. Nhờ vậy, truy hồi có thể bắt đầu từ một event được match rồi tiếp tục recall đa-hop mà không phải trả chi phí rebuild của một knowledge graph nặng.

![SAG architecture](docs/assets/paper-sag-architecture.jpeg)

Trên HotpotQA / 2WikiMultiHop / MuSiQue, với cùng cấu hình:

```text
Embedding = bge-large-en-v1.5
LLM = qwen3.6-flash
Datasets = HotpotQA / 2WikiMultiHop / MuSiQue
```

So với HippoRAG 2, SAG đạt mức cải thiện recall rõ rệt trên multi-hop QA: **Recall@2 trung bình tăng từ 68.14% lên 79.30%, tức tăng 11.16 điểm phần trăm, tương đương khoảng 16.4% cải thiện tương đối**. Recall@2 cao hơn nghĩa là agent có thể chạm tới bằng chứng quan trọng sớm hơn với ít context hơn, từ đó giảm token cost, latency và nhiễu trong các tác vụ nhiều lượt.

![SAG benchmark summary](docs/assets/sag-benchmark-simple.png)

Trên MuSiQue Recall@5, SAG cải thiện từ 65.13% của HippoRAG 2 lên 80.04%; sau khi chuyển sang NV-Embed-v2, kết quả tiếp tục đạt 81.71%. Điều này cho thấy lợi thế chủ yếu đến từ cấu trúc, chứ không chỉ nhờ embedding model mạnh hơn.

## SAG Có Thể Làm Gì

Dự án này biến SAG thành một workbench local có thể chạy ngay. Phù hợp cho:

- Hỏi đáp tài liệu project
- Tìm kiếm knowledge base cá nhân
- Xác thực prototype RAG / agent
- Phân tích event và entity trong tài liệu
- Kiểm thử tích hợp MCP tool
- Debug pipeline search và kiểm tra model-call

Tính năng chính:

- **Quản lý project**: mỗi project có tài liệu, hội thoại, graph và cấu hình MCP riêng.
- **Tải lên nhiều tài liệu**: tải nhiều file Markdown / TXT cùng lúc, có các stage xử lý và tiến độ.
- **Kết quả xử lý tài liệu**: kiểm tra chunks, events, entities, dữ liệu embedding, tìm kiếm title theo keyword và duyệt phân trang.
- **Truy hồi hội thoại**: đặt câu hỏi nhiều lượt trên project hiện tại, hỗ trợ streaming output và dừng generation.
- **Trích dẫn nguồn**: câu trả lời có thể hiển thị citation dạng số; click vào số để xem chunk gốc.
- **Hiển thị search trace**: panel bên phải hiển thị các bước truy hồi nội bộ của SAG và latency theo thời gian thực.
- **Raw logs**: cache trình duyệt lưu request và response thô của LLM / Embedding / Rerank.
- **Knowledge graph**: khám phá quan hệ project bằng node event và entity; hỗ trợ kéo thả, zoom, expand và mở chi tiết.
- **Tích hợp MCP**: mỗi project expose cấu hình MCP riêng để external agent có thể gọi trực tiếp project hiện tại.

## Tech Stack

SAG dùng TypeScript trên toàn stack. Frontend là WebUI React + Vite + Tailwind CSS. Backend dùng Fastify HTTP APIs, MCP TypeScript SDK và các service module phân lớp. Data layer dùng PostgreSQL, pgvector, full-text search và SQL multi-hop queries. Model providers là các API LLM, Embedding và Rerank tương thích OpenAI.

## Xem Trước Workbench

### Xử Lý Tài Liệu

Trong tab Document, bạn có thể tải lên tài liệu, kiểm tra trạng thái xử lý, chunks, events, entities và embeddings.

![SAG document view](docs/assets/sag-documents.png)

### Khám Phá Graph

Trong tab Graph, bạn có thể khám phá quan hệ entity-event trên toàn project. Node hỗ trợ kéo thả, zoom, click để expand và double-click để xem chi tiết.

![SAG graph view](docs/assets/sag-graph.png)

### Truy Hồi Hội Thoại

Trong tab Chat, bạn có thể đặt câu hỏi liên tục trên project hiện tại. Mỗi lần truy hồi sẽ refresh trace panel bên phải để debug chuỗi gọi hiện tại.

## Search Modes

SAG cung cấp hai mode:

- **Fast mode**: match trực tiếp query với entity store bằng full-text / BM25 search, mở rộng qua SAG multi-hop retrieval, rồi cuối cùng dùng `qwen3-rerank` để chọn top-k. Mode này không dùng LLM để trích xuất entity từ query hoặc lọc candidate, nên nhanh hơn nhiều.
- **Standard mode**: dùng LLM để trích xuất entity từ query, sau đó chạy SAG multi-route recall và LLM reranking. Mode này hữu ích khi bạn muốn so sánh pipeline có độ chính xác cao hơn.

Cả hai mode đều vượt xa vector search thông thường vì cùng dùng event/entity index của SAG và SQL multi-hop expansion.

## Quick Start

### 1. Chuẩn Bị Môi Trường

Bạn cần:

- Node.js 20 trở lên
- npm
- PostgreSQL
- pgvector

Nếu muốn setup nhanh nhất, hãy dùng Docker để khởi động PostgreSQL.

### 2. Clone Project

```bash
git clone https://github.com/Zleap-AI/SAG.git
cd SAG
```

### 3. Tạo File Cấu Hình

```bash
cp .env.example .env
```

`.env.example` đã có sẵn giá trị mặc định. Khi dùng thật, hãy điền API key LLM và Embedding của bạn.

### 4. Khởi Động PostgreSQL

Dùng Docker:

```bash
docker compose up -d
```

Nếu không muốn dùng Docker, bạn có thể dùng Homebrew trên macOS:

```bash
brew install postgresql@17 pgvector
brew services start postgresql@17

/opt/homebrew/opt/postgresql@17/bin/createdb sag_lite
/opt/homebrew/opt/postgresql@17/bin/psql -d sag_lite -c 'create extension if not exists vector;'
```

Nếu dùng PostgreSQL local, hãy cập nhật `DATABASE_URL` trong `.env`, ví dụ:

```env
DATABASE_URL=postgres://your_user@localhost:5432/sag_lite
```

### 5. Cài Dependencies Và Khởi Tạo Database

```bash
npm install
npm run db:setup
```

### 6. Khởi Động Development Server

```bash
npm run dev
```

URL development mặc định:

```text
WebUI: http://localhost:5173
API:   http://localhost:4173
```

### 7. Build Và Chạy Production

```bash
npm run build
npm start
```

URL production mặc định:

```text
http://localhost:4173
```

## Sử Dụng Lần Đầu

1. Mở WebUI.
2. Click "New Project" ở phía trên danh sách project bên trái.
3. Vào tab Document và click "Add Document".
4. Tải lên file `.md` hoặc `.txt`.
5. Chờ hàng đợi xử lý hoàn tất.
6. Kiểm tra chunks, events, entities và trạng thái embedding.
7. Quay lại tab Chat và đặt câu hỏi trên project hiện tại.
8. Để debug, kiểm tra Search Trace và Raw Logs ở panel bên phải.
9. Để khám phá quan hệ, mở tab Graph.
10. Với external agent, mở tab MCP và copy cấu hình của project hiện tại.

## Cấu Hình LLM Và Embedding

SAG hỗ trợ API tương thích OpenAI. Ví dụ mặc định:

```env
EMBEDDING_BASE_URL=https://api.302ai.cn/v1
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIMENSIONS=1024

LLM_BASE_URL=https://api.302ai.cn/v1
LLM_MODEL=qwen3.6-flash

RERANK_MODEL=qwen3-rerank
DEFAULT_SEARCH_MODE=fast
```

Bạn có thể cấu hình model theo hai cách:

### Cách 1: WebUI Global Settings

Click biểu tượng settings ở đầu sidebar bên trái, mở Global Settings, rồi điền provider, tên model và API keys.

API key chỉ hiển thị là "Configured / Not configured". Plaintext key không được echo trong UI hoặc API responses.

### Cách 2: `.env`

```env
EMBEDDING_API_KEY=your_embedding_key
LLM_API_KEY=your_llm_key
RERANK_BASE_URL=https://api.your-provider.com/v1/rerank
```

Mặc định, rerank request dùng `LLM_BASE_URL` và thêm `/reranks`, ví dụ `https://api.302ai.cn/v1/reranks`. Chỉ đặt `RERANK_BASE_URL` khi provider của bạn cần một full endpoint khác như `/v1/rerank`.

Nếu chưa cấu hình API key, hệ thống dùng local deterministic fallback. Chế độ này hữu ích cho test và kiểm tra UI, nhưng chất lượng truy hồi thực tế cần remote models.

## Tích Hợp MCP

SAG có thể hoạt động như một MCP Server cho external agents. Cấu hình MCP của mỗi project bind với project ID hiện tại, nên tool calls không cần truyền `projectId`.

Mở tab MCP trong WebUI để xem JSON `mcpServers` được tạo tự động cho project hiện tại. Nó trông như sau:

```json
{
  "mcpServers": {
    "sag": {
      "command": "npm",
      "args": ["run", "mcp"],
      "env": {
        "SAG_MCP_SOURCE_ID": "current_project_id"
      }
    }
  }
}
```

Các MCP tool có sẵn:

- `sag_ingest_document`: import tài liệu và chạy chunking, event extraction, entity extraction và vectorization.
- `sag_search`: chạy SAG multi-route retrieval trên project hiện tại và trả về internal trace.
- `sag_explain_search`: trả về giải thích pipeline truy hồi và trace của project hiện tại.
- `sag_get_event`: truy vấn chi tiết event theo event ID.

## Ví Dụ HTTP API

Health check:

```bash
curl http://localhost:4173/health
```

Tạo project:

```bash
curl -X POST http://localhost:4173/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo Project"}'
```

Ingest tài liệu:

```bash
curl -X POST http://localhost:4173/ingest \
  -H 'Content-Type: application/json' \
  -d '{"sourceId":"project_id","title":"Demo","content":"# Demo\n\nSAG can search project documents.","extract":true}'
```

Chạy search:

```bash
curl -X POST http://localhost:4173/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"Why is SAG suitable for multi-hop retrieval?","sourceIds":["project_id"],"strategy":"multi","searchMode":"fast","topK":5,"returnTrace":true}'
```

Stream search trace:

```bash
curl -N -X POST http://localhost:4173/api/search/stream \
  -H 'Content-Type: application/json' \
  -d '{"query":"Explain SAG event/entity indexing","sourceIds":["project_id"],"strategy":"multi","returnTrace":true}'
```

## Lệnh Thường Dùng

```bash
# Type check
npm run typecheck

# Run tests
npm test

# Build production assets
npm run build

# Start production server
npm start

# Start MCP stdio server
npm run mcp
```

## Cấu Trúc Project

```text
src/
  ai/                 LLM, Embedding, and Rerank clients
  api/                HTTP API
  config/             Environment configuration
  db/                 Database connection, migrations, repositories, vector tools
  ingestion/          Document chunking and event extraction
  mcp/                MCP Server
  observability/      Logs and model-call records
  services/           Document processing, search, graph, and WebUI services

web/
  src/                React WebUI

migrations/           PostgreSQL schema
test/                 Unit tests
docs/assets/          README screenshots and diagrams
```

## FAQ

### Kết Nối PostgreSQL Thất Bại

Trước tiên hãy xác nhận database đang chạy:

```bash
docker compose ps
```

Sau đó xác nhận `DATABASE_URL` trong `.env` là chính xác.

### Thiếu pgvector

Đảm bảo pgvector đã được cài và chạy:

```sql
create extension if not exists vector;
```

Nếu dùng `docker compose up -d`, image đã bao gồm pgvector.

### Vì Sao Tôi Không Thấy Chất Lượng Model Thực?

Nếu chưa cấu hình `LLM_API_KEY` và `EMBEDDING_API_KEY`, hệ thống chuyển sang local fallback mode. Chế độ này hữu ích cho testing, nhưng không phù hợp để đánh giá chất lượng truy hồi thực tế.

### Xử Lý Tài Liệu Chậm

Xử lý tài liệu gọi Embedding và LLM APIs. Tốc độ chủ yếu phụ thuộc vào số lượng tài liệu, số lượng chunk, latency của model API và concurrency settings. Bạn có thể tinh chỉnh trong `.env`:

```env
INGEST_CONCURRENCY=5
```

### Port Đã Được Sử Dụng

Trong development mode, cập nhật `.env`:

```env
HTTP_PORT=4173
```

Vite WebUI dùng `5173` theo mặc định. Nếu port bị chiếm, Vite sẽ tự hiển thị địa chỉ mới.

## License

MIT License. Xem [LICENSE](LICENSE).
