# Voice-over script for `SagExplainer`

Composition duration: 260 seconds at 30 FPS.

Use this file as the narration script. To generate Vietnamese neural TTS segments:

```bash
python scripts/generate-voiceover.py
```

Then render with voice-over enabled:

```bash
npm run video:render -- --props=remotion/voiceover-props.json
```

Audio files are relative to Remotion's `public/` folder.

## Script

1. SAG là một cách tổ chức retrieval cho agent: vẫn giữ chunk để dẫn nguồn, nhưng thêm event và entity để tìm được đường đi giữa các mảnh thông tin.
2. RAG truyền thống thường hỏi: chunk nào giống query nhất? Cách này rẻ và đơn giản, nhưng khi câu trả lời nằm rải ở nhiều đoạn, hệ thống dễ lấy thiếu hoặc phải nhét rất nhiều context vào LLM.
3. Trong ingest, SAG đọc Markdown hoặc TXT, tách section và chunk, embed chunk, rồi dùng LLM để rút ra một event hoàn chỉnh cùng các entity liên quan.
4. Điểm quan trọng là vector không chỉ nằm ở chunk. SAG còn embed event title, event content, entity name và cả mô tả quan hệ event-entity. Vì vậy database vừa là kho quan hệ, vừa là vector store.
5. Khi search ở fast mode, hệ thống không gọi LLM để tách entity trong query. Nó dùng full-text, fuzzy match và BM25-like search trên bảng entities, sau đó recall event liên quan.
6. Với câu hỏi multi-hop, SAG có thể đi từ entity trong query đến event, từ event sang entity chung, rồi qua event khác. Cuối cùng nó rerank event và fetch chunk gốc để tạo citation.
7. So với RAG, SAG tốn ingest hơn nhưng recall tốt hơn cho câu hỏi cần nối nhiều ý. So với Graph RAG nặng, SAG dùng graph nhẹ event-entity, dễ cập nhật hơn trên dữ liệu động.
8. Trade-off thực tế: ingest có thêm LLM extraction và nhiều embedding, nhưng search có thể giảm nhiễu, giảm số chunk phải đưa vào prompt, và trace rõ từng bước latency.
9. Thiết kế database xoay quanh sources, documents, sections, chunks, events, entities và event_entities. PostgreSQL cộng pgvector lưu cả dữ liệu nghiệp vụ, full-text index và vector HNSW trong cùng một nơi.
10. Tóm lại: SAG trả chi phí trước để mua cấu trúc. Khi agent cần tìm bằng chứng chính xác qua nhiều bước, cấu trúc nhẹ này giúp tìm đúng sớm hơn và dễ debug hơn.
