import { BROWSER_HEADERS, httpText } from '../http';
import { Subscription } from '../types';
import { stripHtml } from '../utils';

const CHANNEL_ID_RE = /UC[\w-]{22}/;

function decodeAttribute(value: string): string {
  return stripHtml(
    value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\\u0026/g, '&')
  );
}

function metaContent(html: string, property: string): string {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const match = html.match(regex);
  return match ? decodeAttribute(match[1]) : '';
}

function channelIdFromHtml(html: string): string {
  const matches = [
    html.match(/"channelId":"(UC[\w-]{22})"/),
    html.match(/"externalId":"(UC[\w-]{22})"/),
    html.match(/channel_id=(UC[\w-]{22})/),
  ];
  for (const match of matches) {
    if (match?.[1]) return match[1];
  }
  return '';
}

function buildChannelUrl(input: string): string {
  const trimmed = input.trim();
  if (CHANNEL_ID_RE.test(trimmed) && trimmed.length <= 30) {
    return `https://www.youtube.com/channel/${trimmed.match(CHANNEL_ID_RE)![0]}`;
  }
  if (trimmed.startsWith('@')) {
    return `https://www.youtube.com/${trimmed}`;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    if (/youtu\.be\//i.test(trimmed)) {
      const id = trimmed.split('/').pop()?.split('?')[0];
      return `https://www.youtube.com/watch?v=${id}`;
    }
    return trimmed;
  }
  if (/^[\w.-]+$/.test(trimmed) && !trimmed.includes('.')) {
    return `https://www.youtube.com/@${trimmed}`;
  }
  throw new Error('请输入频道链接、@handle 或 UC 开头的频道 ID');
}

async function fetchHtml(url: string): Promise<string> {
  const response = await httpText(url, {
    timeoutMs: 20000,
    headers: {
      ...BROWSER_HEADERS,
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (response.status !== 200) {
    throw new Error(`无法打开 YouTube 页面 (${response.status})`);
  }
  return response.text;
}

async function resolveFromVideo(url: string): Promise<Subscription> {
  const html = await fetchHtml(url);
  const channelId = channelIdFromHtml(html);
  if (!channelId) throw new Error('无法从视频页面识别频道');
  return resolveChannelById(channelId);
}

export async function resolveChannelById(
  channelId: string
): Promise<Subscription> {
  const html = await fetchHtml(
    `https://www.youtube.com/channel/${channelId}?hl=en&gl=US`
  );
  const title =
    metaContent(html, 'og:title').replace(/\s*-\s*YouTube\s*$/i, '') ||
    channelId;
  const avatar = metaContent(html, 'og:image');
  return {
    channelId,
    title,
    avatar,
    addedAt: Date.now(),
  };
}

export async function resolveChannelInput(input: string): Promise<Subscription> {
  const url = buildChannelUrl(input);
  if (/\/watch\?|\/shorts\//i.test(url)) {
    return resolveFromVideo(url);
  }
  const html = await fetchHtml(
    url.includes('?') ? url : `${url}?hl=en&gl=US`
  );
  const channelId = channelIdFromHtml(html);
  if (!channelId) {
    throw new Error('没有找到频道，请确认链接或 @handle 是否正确');
  }
  const title =
    metaContent(html, 'og:title').replace(/\s*-\s*YouTube\s*$/i, '') ||
    channelId;
  const avatar = metaContent(html, 'og:image');
  const handleMatch = url.match(/youtube\.com\/@([^/?#]+)/i);
  return {
    channelId,
    title,
    handle: handleMatch ? `@${handleMatch[1]}` : undefined,
    avatar,
    addedAt: Date.now(),
  };
}

export async function refreshChannelInfo(
  sub: Subscription
): Promise<Subscription> {
  try {
    const fresh = await resolveChannelById(sub.channelId);
    return { ...sub, ...fresh, addedAt: sub.addedAt, group: sub.group };
  } catch {
    return sub;
  }
}

export function parseTakeoutCsv(content: string): Subscription[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (quoted) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headerIndex = rows.findIndex((line) =>
    line.some((cell) => /channel\s*id/i.test(cell))
  );
  const header = headerIndex >= 0 ? rows[headerIndex] : rows[0];
  const idIndex = header.findIndex((cell) => /channel\s*id/i.test(cell));
  const titleIndex = header.findIndex((cell) => /channel\s*title/i.test(cell));
  const urlIndex = header.findIndex((cell) => /channel\s*url/i.test(cell));
  if (idIndex < 0) throw new Error('CSV 里没有找到 Channel ID 列');

  const subs: Subscription[] = [];
  for (const line of rows.slice(headerIndex + 1)) {
    const rawId = (line[idIndex] ?? '').trim();
    const match = rawId.match(CHANNEL_ID_RE);
    if (!match) continue;
    const channelId = match[0];
    const title =
      (titleIndex >= 0 ? line[titleIndex] : '')?.trim() || channelId;
    const url = urlIndex >= 0 ? line[urlIndex]?.trim() : '';
    subs.push({
      channelId,
      title,
      avatar: undefined,
      addedAt: Date.now(),
      group: url || undefined,
    });
  }
  if (!subs.length) throw new Error('CSV 里没有可导入的频道');
  return subs;
}
