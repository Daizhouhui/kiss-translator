import { httpText } from '../http';
import { microsoftTarget } from '../defaults';
import { chunk } from '../utils';

const MAX_CHARS = 900;
const MAX_ITEMS = 12;

function splitBatches(texts: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of texts) {
    if (
      current.length >= MAX_ITEMS ||
      (current.length && chars + text.length > MAX_CHARS)
    ) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

export async function microsoftTranslate(
  texts: string[],
  from: string,
  to: string,
  timeoutMs: number
): Promise<string[]> {
  const target = microsoftTarget(to);
  const source = from === 'auto' ? '' : from;
  const batches = splitBatches(texts);
  const output: string[] = [];
  for (const batch of batches) {
    const url = `https://edge.microsoft.com/translate/translatetext?from=${encodeURIComponent(
      source
    )}&to=${encodeURIComponent(target)}&isEnterpriseClient=false`;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await httpText(url, {
          method: 'POST',
          timeoutMs,
          body: JSON.stringify(batch),
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Origin: 'https://edge.microsoft.com',
            Referer: 'https://edge.microsoft.com/',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
          },
        });
        if (response.status < 200 || response.status >= 300) {
          throw new Error(`Microsoft ${response.status}`);
        }
        const data = JSON.parse(response.text);
        if (!Array.isArray(data)) throw new Error('Microsoft 返回格式异常');
        const translated = data.map((item: any) => {
          const value =
            item?.translations?.[0]?.text ??
            item?.translation?.text ??
            item?.text ??
            '';
          return String(value);
        });
        if (translated.length !== batch.length) {
          throw new Error('Microsoft 返回条数不匹配');
        }
        output.push(...translated);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    if (lastError) throw lastError;
  }
  return output;
}

export { chunk };
