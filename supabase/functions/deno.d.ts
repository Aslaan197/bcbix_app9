// Minimal Deno type stubs for TypeScript IDE support.
// The full runtime is provided by Supabase's Deno environment on the server.
declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    has(key: string): boolean;
  }
  const env: Env;
  function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string; signal?: AbortSignal },
  ): void;
}
