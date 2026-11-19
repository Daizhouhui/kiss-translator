import { XMLParser } from 'fast-xml-parser';

import { loadCached, saveCached } from '../storage';
import { Subscription, VideoItem } from '../types';
import { mapLimit } from '../utils';
import { httpText } from '../http';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
});

const FEED_TTL = 10 * 60 * 1000;
const memory = new Map<string, { at: number; items: VideoItem[] }>();

function textOf(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (typeof value['#text'] === 'string') return value['#text'];
    if (typeof value.__text === 'string') return value.__text;
  }
  return '';
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function thumbnailOf(entry: any, videoId: string): string {
  const group = entry?.['media:group'];
  const thumbs = asArray<any>(group?.['media:thumbnail']);
  for (const thumb of thumbs) {
    const url = thumb?.['@_url'];
    if (typeof url === 'string' && url) return url;
  }
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function parseChannelFeed(xml: string, channelId: string): VideoItem[] {
  const parsed = parser.parse(xml);
  const feed = parsed?.feed;
  if (!feed) return [];
  const feedTitle = textOf(feed.title);
  const author = textOf(feed.author?.name) || feedTitle;
  const entries = asArray<any>(feed.entry);
  const items: VideoItem[] = [];
  for (const entry of entries) {
    const videoId = textOf(entry?.['yt:videoId']);
    if (!videoId) continue;
    const publishedRaw = textOf(entry?.published) || textOf(entry?.updated);
    const published = publishedRaw ? Date.parse(publishedRaw) : Date.now();
    items.push({
      videoId,
      title: textOf(entry?.title) || 'Untitled',
      channelId: textOf(entry?.['yt:channelId']) || channelId,
      channelTitle: author || 'Unknown',
      published: Number.isFinite(published) ? published : Date.now(),
      thumbnail: thumbnailOf(entry, videoId),
    });
  }
  return items;
}

export async function fetchChannelFeed(
  channelId: string,
  force = false
): Promise<VideoItem[]> {
  const cached = memory.get(channelId);
  if (!force && cached && Date.now() - cached.at < FEED_TTL) {
    return cached.items;
  }
  if (!force) {
    const stored = await loadCached<VideoItem[]>(
      `feed:${channelId}`,
      FEED_TTL
    );
    if (stored) {
      memory.set(channelId, { at: Date.now(), items: stored });
      return stored;
    }
  }
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(
    channelId
  )}`;
  const response = await httpText(url, {
    timeoutMs: 15000,
    headers: { Accept: 'application/xml,text/xml,*/*' },
  });
  if (response.status !== 200) {
    throw new Error(`频道 RSS 请求失败 (${response.status})`);
  }
  const items = parseChannelFeed(response.text, channelId);
  memory.set(channelId, { at: Date.now(), items });
  await saveCached(`feed:${channelId}`, items);
  return items;
}

export async function fetchSubscriptionFeed(
  subscriptions: Subscription[],
  force = false
): Promise<VideoItem[]> {
  if (!subscriptions.length) return [];
  const results = await mapLimit(subscriptions, 4, async (sub) => {
    try {
      return await fetchChannelFeed(sub.channelId, force);
    } catch {
      return [];
    }
  });
  const merged = results.flat();
  const seen = new Set<string>();
  return merged
    .filter((item) => {
      if (seen.has(item.videoId)) return false;
      seen.add(item.videoId);
      return true;
    })
    .sort((a, b) => b.published - a.published)
    .slice(0, 200);
}

export async function fetchChannelVideos(
  channelId: string,
  force = false
): Promise<VideoItem[]> {
  return fetchChannelFeed(channelId, force);
}
