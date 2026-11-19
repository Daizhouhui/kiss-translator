const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': DESKTOP_UA,
  'Accept-Language': 'en-US,en;q=0.9',
};

export type HttpOptions = {
  timeoutMs?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string | object;
};

export async function httpText(
  url: string,
  options: HttpOptions = {}
): Promise<{ status: number; text: string; headers: Headers }> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 20000
  );
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: { ...BROWSER_HEADERS, ...(options.headers ?? {}) },
      body:
        typeof options.body === 'object'
          ? JSON.stringify(options.body)
          : options.body,
      signal: controller.signal,
    });
    const text = await response.text();
    return { status: response.status, text, headers: response.headers };
  } finally {
    clearTimeout(timeout);
  }
}

export async function httpJson<T = any>(
  url: string,
  options: HttpOptions = {}
): Promise<T> {
  const result = await httpText(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`HTTP ${result.status}: ${result.text.slice(0, 200)}`);
  }
  return JSON.parse(result.text) as T;
}
