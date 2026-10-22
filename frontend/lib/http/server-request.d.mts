export function serverRequest(input: string, init?: {
  method?: string;
  headers?: HeadersInit;
  body?: string | null;
  signal?: AbortSignal | null;
}): Promise<Response>;
