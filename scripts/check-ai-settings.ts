import { pool, closePool } from "../src/db/pool.js";

const result = await pool.query(`
  select
    llm_model,
    llm_base_url,
    length(coalesce(llm_api_key, '')) as llm_key_len,
    embedding_model,
    embedding_base_url,
    length(coalesce(embedding_api_key, '')) as embedding_key_len
  from ai_provider_settings
  where id = 'global'
`);

console.log(JSON.stringify(result.rows[0] ?? null, null, 2));
await closePool();
