import { pool, closePool } from "../src/db/pool.js";

await pool.query(
  `
    update ai_provider_settings
    set
      embedding_base_url = 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      embedding_model = 'text-embedding-v4',
      embedding_dimensions = 1024,
      embedding_api_key = null,
      llm_base_url = 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      llm_model = 'qwen-plus',
      llm_api_key = null,
      llm_timeout_ms = 60000,
      llm_max_retries = 2,
      metadata = metadata || jsonb_build_object(
        'defaultSearchMode', 'standard',
        'defaultSearchTopK', 10,
        'defaultChunkingMode', 'heading_strict',
        'chunkTokenLimit', 512,
        'chunkOverlapTokens', 100,
        'updatedVia', 'set-alibaba-settings'
      ),
      updated_at = now()
    where id = 'global'
  `
);

console.log("Alibaba/DashScope settings applied.");
await closePool();
