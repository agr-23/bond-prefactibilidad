type D1Database = import('@cloudflare/workers-types').D1Database;
type Fetcher = { fetch(request: Request): Promise<Response> };
declare module 'cloudflare:workers' {
  export const env: {
    DB: D1Database;
    BUCKET: import('@cloudflare/workers-types').R2Bucket;
    ASSETS: Fetcher;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    GROQ_API_KEY?: string;
    GROQ_MODEL?: string;
    AI_PROVIDER?: string;
  };
}
