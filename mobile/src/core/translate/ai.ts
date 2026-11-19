import { httpText } from '../http';
import { chunk } from '../utils';

export type AiConfig = {
  id: string;
  url: string;
  key: string;
  model: string;
  timeoutMs: number;
};

const LANG_NAMES: Record<string, string> = {
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

function systemPrompt(to: string, contextTitle?: string): string {
  const language = LANG_NAMES[to] ?? to;
  return [
    'You are a professional subtitle translator.',
    `Translate every input line into ${language}.`,
    'Keep the original meaning, tone, names and numbers accurate.',
    'Do not merge, split, omit or add lines.',
    contextTitle ? `Video title for context: ${contextTitle}` : '',
    'Return ONLY a JSON array of strings, with exactly the same number of items and in the same order.',
    'No markdown, no explanations, no extra keys.',
  ]
    .filter(Boolean)
    .join(' ');
}

function stripFence(content: string): string {
  return content
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function parseArray(content: string, expected: number): string[] | null {
  const cleaned = stripFence(content);
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        const values = parsed.map((item) => String(item ?? ''));
        if (values.length === expected) return values;
      }
    } catch {}
  }
  const lines = cleaned
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*(?:[-*]|\d+[.)])\s*/, '')
        .replace(/^["']|["'],?$/g, '')
        .trim()
    )
    .filter(Boolean);
  if (lines.length === expected) return lines;
  return null;
}

async function chat(
  config: AiConfig,
  texts: string[],
  from: string,
  to: string,
  contextTitle?: string
): Promise<string[]> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await httpText(config.url, {
        method: 'POST',
        timeoutMs: config.timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.key}`,
          Accept: 'application/json',
        },
        body: {
          model: config.model,
          temperature: 0.2,
          stream: false,
          messages: [
            { role: 'system', content: systemPrompt(to, contextTitle) },
            {
              role: 'user',
              content: JSON.stringify(texts),
            },
          ],
        },
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`${config.id} ${response.status}: ${response.text.slice(0, 160)}`);
      }
      const data = JSON.parse(response.text);
      const content =
        data?.choices?.[0]?.message?.content ??
        data?.output?.text ??
        data?.result ??
        '';
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error(`${config.id} 返回空内容`);
      }
      const parsed = parseArray(content, texts.length);
      if (!parsed) throw new Error(`${config.id} 返回的条数不匹配`);
      lastError = null;
      return parsed;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

function batches(texts: string[], maxChars = 1600, maxItems = 18): string[][] {
  const result: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of texts) {
    if (
      current.length >= maxItems ||
      (current.length && chars + text.length > maxChars)
    ) {
      result.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length) result.push(current);
  return result;
}

export async function aiTranslate(
  config: AiConfig,
  texts: string[],
  from: string,
  to: string,
  contextTitle?: string
): Promise<string[]> {
  if (!config.key) throw new Error(`${config.id} 没有填写 API Key`);
  const output: string[] = [];
  for (const batch of batches(texts)) {
    try {
      output.push(...(await chat(config, batch, from, to, contextTitle)));
    } catch (error) {
      if (batch.length > 1) {
        // Fall back to smaller batches so one bad line cannot poison the block.
        for (const single of chunk(batch, 4)) {
          output.push(...(await chat(config, single, from, to, contextTitle)));
        }
      } else {
        throw error;
      }
    }
  }
  return output;
}

export function deepseekConfig(
  key: string,
  model: string,
  timeoutMs: number
): AiConfig {
  return {
    id: 'DeepSeek',
    url: 'https://api.deepseek.com/chat/completions',
    key,
    model: model || 'deepseek-chat',
    timeoutMs,
  };
}

export function siliconflowConfig(
  key: string,
  model: string,
  timeoutMs: number
): AiConfig {
  return {
    id: 'SiliconFlow',
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    key,
    model,
    timeoutMs,
  };
}

export function openaiConfig(
  key: string,
  baseUrl: string,
  model: string,
  timeoutMs: number
): AiConfig {
  const normalized = baseUrl.replace(/\/+$/, '');
  return {
    id: 'OpenAI',
    url: normalized.endsWith('/chat/completions')
      ? normalized
      : `${normalized}/chat/completions`,
    key,
    model,
    timeoutMs,
  };
}
