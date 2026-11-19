import { getSecret } from '../secrets';
import { getSettings } from '../store';
import { loadCached, loadJson, saveCached, saveJson } from '../storage';
import { Cue, ProviderId } from '../types';
import { hashString } from '../utils';
import { aiTranslate, deepseekConfig, openaiConfig, siliconflowConfig } from './ai';
import { googleTranslate } from './google';
import { microsoftTranslate } from './microsoft';

export type TranslateOptions = {
  from?: string;
  to?: string;
  contextTitle?: string;
};

const memoryTitles = new Map<string, string>();
let titleCacheLoaded = false;
let titleCache: Record<string, string> = {};

async function ensureTitleCache() {
  if (titleCacheLoaded) return;
  titleCacheLoaded = true;
  titleCache = await loadJson<Record<string, string>>('title-cache', {});
}

function titleKey(text: string, to: string, provider: ProviderId) {
  return `${provider}|${to}|${hashString(text)}`;
}

async function translateWithProvider(
  provider: ProviderId,
  texts: string[],
  from: string,
  to: string,
  contextTitle: string | undefined,
  timeoutMs: number
): Promise<string[]> {
  if (provider === 'microsoft') {
    return microsoftTranslate(texts, from, to, timeoutMs);
  }
  if (provider === 'google') {
    return googleTranslate(texts, from, to, timeoutMs);
  }
  if (provider === 'deepseek') {
    const key = await getSecret('deepseek');
    const settings = getSettings();
    return aiTranslate(
      deepseekConfig(key, settings.deepseekModel, timeoutMs),
      texts,
      from,
      to,
      contextTitle
    );
  }
  if (provider === 'siliconflow') {
    const key = await getSecret('siliconflow');
    const settings = getSettings();
    return aiTranslate(
      siliconflowConfig(key, settings.siliconflowModel, timeoutMs),
      texts,
      from,
      to,
      contextTitle
    );
  }
  if (provider === 'openai') {
    const key = await getSecret('openai');
    const settings = getSettings();
    return aiTranslate(
      openaiConfig(
        key,
        settings.openaiBaseUrl,
        settings.openaiModel,
        timeoutMs
      ),
      texts,
      from,
      to,
      contextTitle
    );
  }
  throw new Error(`未知翻译引擎 ${provider}`);
}

export async function translateTexts(
  texts: string[],
  options: TranslateOptions = {}
): Promise<{ texts: string[]; provider: ProviderId }> {
  const settings = getSettings();
  const from = options.from ?? settings.sourceLang;
  const to = options.to ?? settings.targetLang;
  const timeout = settings.requestTimeoutMs;
  const requested = settings.provider;

  const chain: ProviderId[] =
    requested === 'auto'
      ? ['microsoft', 'google']
      : [requested, 'microsoft', 'google'];

  if (
    requested !== 'auto' &&
    !chain.includes('deepseek') &&
    !(requested === 'deepseek')
  ) {
    // Explicit free provider still gets the deepseek net when enabled.
  }

  const tryList = [...chain];
  if (settings.autoFallbackDeepSeek && !tryList.includes('deepseek')) {
    tryList.push('deepseek');
  }
  if (requested === 'deepseek' && !tryList.includes('deepseek')) {
    tryList.unshift('deepseek');
  }

  let lastError: unknown = null;
  for (const provider of tryList) {
    try {
      if (provider === 'deepseek') {
        const key = await getSecret('deepseek');
        if (!key) continue;
      }
      if (provider === 'siliconflow') {
        const key = await getSecret('siliconflow');
        if (!key) continue;
      }
      if (provider === 'openai') {
        const key = await getSecret('openai');
        if (!key) continue;
      }
      const translated = await translateWithProvider(
        provider,
        texts,
        from,
        to,
        options.contextTitle,
        timeout
      );
      return { texts: translated, provider };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('所有翻译引擎都不可用');
}

export async function translateOne(
  text: string,
  options: TranslateOptions = {}
): Promise<string> {
  const result = await translateTexts([text], options);
  return result.texts[0] ?? text;
}

export async function translateCueList(
  videoId: string,
  cues: Cue[],
  trackKey: string,
  options: TranslateOptions = {}
): Promise<{ cues: Cue[]; provider: ProviderId }> {
  const settings = getSettings();
  const to = options.to ?? settings.targetLang;
  const providerKey = settings.provider;
  const cacheKey = `cues:${videoId}:${trackKey}:${to}:${providerKey}`;
  const cached = await loadCached<{ cues: Cue[]; provider: ProviderId }>(
    cacheKey,
    7 * 24 * 60 * 60 * 1000
  );
  if (cached?.cues?.length) return cached;

  const texts = cues.map((cue) => cue.text);
  const result = await translateTexts(texts, options);
  const translated = cues.map((cue, index) => ({
    ...cue,
    translation: result.texts[index] ?? '',
  }));
  await saveCached(cacheKey, { cues: translated, provider: result.provider });
  return { cues: translated, provider: result.provider };
}

export async function translateTitles(
  titles: string[],
  options: TranslateOptions = {}
): Promise<string[]> {
  await ensureTitleCache();
  const settings = getSettings();
  const to = options.to ?? settings.targetLang;
  const providerKey = settings.provider;
  const missing: { index: number; text: string; key: string }[] = [];
  const output = new Array<string>(titles.length);

  titles.forEach((text, index) => {
    const key = titleKey(text, to, providerKey);
    const hit = memoryTitles.get(key) ?? titleCache[key];
    if (hit) output[index] = hit;
    else missing.push({ index, text, key });
  });

  if (!missing.length) return output;

  const result = await translateTexts(
    missing.map((item) => item.text),
    options
  );
  missing.forEach((item, index) => {
    const translated = result.texts[index] ?? item.text;
    output[item.index] = translated;
    memoryTitles.set(item.key, translated);
    titleCache[item.key] = translated;
  });
  await saveJson('title-cache', titleCache);
  return output;
}

export async function testTranslation(provider: ProviderId): Promise<string> {
  const settings = getSettings();
  const texts = await translateWithProvider(
    provider,
    ['Hello, this is a subtitle translation test.'],
    'en',
    settings.targetLang,
    undefined,
    settings.requestTimeoutMs
  );
  return texts[0] ?? '';
}

export function providerDisplayName(provider: ProviderId): string {
  switch (provider) {
    case 'microsoft':
      return '微软翻译';
    case 'google':
      return '谷歌翻译';
    case 'deepseek':
      return 'DeepSeek';
    case 'siliconflow':
      return 'SiliconFlow';
    case 'openai':
      return 'OpenAI';
    default:
      return '自动';
  }
}
