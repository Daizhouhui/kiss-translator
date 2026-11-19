import { googleTarget } from '../defaults';
import { httpText } from '../http';
import { mapLimit } from '../utils';

async function translateOne(
  text: string,
  from: string,
  to: string,
  timeoutMs: number
): Promise<string> {
  const source = from === 'auto' ? 'auto' : from;
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(
      googleTarget(to)
    )}&dt=t&q=${encodeURIComponent(text)}`;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await httpText(url, {
        timeoutMs,
        headers: {
          Accept: '*/*',
          Referer: 'https://translate.google.com/',
        },
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Google ${response.status}`);
      }
      const data = JSON.parse(response.text);
      const segments = Array.isArray(data?.[0]) ? data[0] : [];
      const translated = segments
        .map((segment: any) => (Array.isArray(segment) ? segment[0] : ''))
        .filter((value: unknown): value is string => typeof value === 'string')
        .join('');
      if (!translated) throw new Error('Google 返回空结果');
      lastError = null;
      return translated;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function googleTranslate(
  texts: string[],
  from: string,
  to: string,
  timeoutMs: number
): Promise<string[]> {
  return mapLimit(texts, 3, (text) =>
    translateOne(text, from, to, timeoutMs)
  );
}
