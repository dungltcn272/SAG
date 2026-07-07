import { pool, closePool } from "../src/db/pool.js";

const tables = await pool.query(
  "select tablename from pg_tables where schemaname = 'public' order by tablename"
);
console.log(JSON.stringify(tables.rows.map((row) => row.tablename), null, 2));
await closePool();
