import { BROWSER_HEADERS, httpJson, httpText } from '../http';
import { CaptionTrack, Cue, VideoMeta } from '../types';
import {
  extractInitialPlayerResponse,
  parseCaptionText,
} from './parse';

const WEB_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
// YouTube's mobile clients still receive servable caption URLs. The web
// player's timedtext URLs now answer 200 with an empty body (they require a
// proof-of-origin token that is generated inside the signed-in web player).
// Keep the Android client first so captions work without cookies or login.
const ANDROID_KEY = 'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w';

type ClientConfig = {
  name: string;
  version: string;
  key: string;
  headers: Record<string, string>;
  extra?: Record<string, unknown>;
};

const CLIENTS: ClientConfig[] = [
  {
    name: 'ANDROID',
    version: '21.03.36',
    key: ANDROID_KEY,
    headers: {
      'X-Youtube-Client-Name': '3',
      'X-Youtube-Client-Version': '21.03.36',
      'X-Goog-Api-Format-Version': '2',
      'User-Agent':
        'com.google.android.youtube/21.03.36 (Linux; U; Android 14) gzip',
    },
    extra: {
      androidSdkVersion: 34,
      osName: 'Android',
      osVersion: '14',
    },
  },
  {
    name: 'ANDROID',
    version: '20.10.38',
    key: ANDROID_KEY,
    headers: {
      'X-Youtube-Client-Name': '3',
      'X-Youtube-Client-Version': '20.10.38',
      'X-Goog-Api-Format-Version': '2',
      'User-Agent':
        'com.google.android.youtube/20.10.38 (Linux; U; Android 13) gzip',
    },
    extra: {
      androidSdkVersion: 33,
      osName: 'Android',
      osVersion: '13',
    },
  },
  {
    name: 'WEB',
    version: '2.20260101.00.00',
    key: WEB_KEY,
    headers: {
      'X-Youtube-Client-Name': '1',
      'X-Youtube-Client-Version': '2.20260101.00.00',
    },
  },
];

function normalizeTrack(track: any): CaptionTrack | null {
  if (!track || typeof track.baseUrl !== 'string') return null;
  const name =
    track.name?.simpleText ||
    track.name?.runs?.map((run: any) => run.text).join('') ||
    track.languageCode ||
    'Unknown';
  return {
    baseUrl: track.baseUrl.startsWith('http')
      ? track.baseUrl
      : `https://www.youtube.com${track.baseUrl}`,
    languageCode: track.languageCode ?? '',
    name,
    kind: track.kind,
    isTranslatable: track.isTranslatable,
  };
}

function parsePlayerResponse(response: any): VideoMeta | null {
  const details = response?.videoDetails;
  if (!details?.videoId) return null;
  const tracks = (response?.captions?.playerCaptionsTracklistRenderer
    ?.captionTracks ?? []) as any[];
  const thumbnails = details?.thumbnail?.thumbnails ?? [];
  return {
    videoId: details.videoId,
    title: details.title ?? '',
    author: details.author ?? '',
    lengthSeconds: Number(details.lengthSeconds ?? 0),
    thumbnail:
      thumbnails[thumbnails.length - 1]?.url ??
      `https://i.ytimg.com/vi/${details.videoId}/hqdefault.jpg`,
    captionTracks: tracks
      .map(normalizeTrack)
      .filter((track): track is CaptionTrack => !!track),
  };
}

async function fetchPlayerWithClient(
  videoId: string,
  client: ClientConfig
): Promise<any | null> {
  try {
    const url = `https://www.youtube.com/youtubei/v1/player?key=${client.key}&prettyPrint=false`;
    const body = {
      context: {
        client: {
          clientName: client.name,
          clientVersion: client.version,
          hl: 'en',
          gl: 'US',
          ...(client.extra ?? {}),
        },
      },
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
    };
    const response = await httpJson(url, {
      method: 'POST',
      body,
      timeoutMs: 20000,
      headers: {
        ...BROWSER_HEADERS,
        ...client.headers,
        'Content-Type': 'application/json',
        Origin: 'https://www.youtube.com',
        Referer: `https://www.youtube.com/watch?v=${videoId}`,
      },
    });
    return response;
  } catch {
    return null;
  }
}

async function fetchPlayerFromWatchPage(videoId: string): Promise<any | null> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}&hl=en&bpctr=9999999999&has_verified=1`;
    const response = await httpText(url, {
      timeoutMs: 25000,
      headers: {
        ...BROWSER_HEADERS,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (response.status !== 200) return null;
    return extractInitialPlayerResponse(response.text);
  } catch {
    return null;
  }
}

export async function getVideoMeta(videoId: string): Promise<VideoMeta> {
  let fallback: VideoMeta | null = null;
  for (const client of CLIENTS) {
    const response = await fetchPlayerWithClient(videoId, client);
    if (!response) continue;
    const parsed = parsePlayerResponse(response);
    if (!parsed) continue;
    if (!fallback) fallback = parsed;
    if (parsed.captionTracks.length) return parsed;
    const status = response?.playabilityStatus?.status;
    if (status && status !== 'OK' && status !== 'LOGIN_REQUIRED') {
      // Keep looking with other clients, some expose captions where WEB does not.
    }
  }
  if (fallback) return fallback;

  const htmlResponse = await fetchPlayerFromWatchPage(videoId);
  const parsed = parsePlayerResponse(htmlResponse);
  if (parsed) return parsed;

  throw new Error('无法读取该视频的信息，可能被限制访问');
}

export function pickCaptionTrack(
  tracks: CaptionTrack[],
  preferredLanguage = 'en'
): CaptionTrack | null {
  if (!tracks.length) return null;
  const manual = tracks.filter((track) => (track.kind ?? '') !== 'asr');
  const auto = tracks.filter((track) => (track.kind ?? '') === 'asr');
  const preferred = preferredLanguage.toLowerCase().split('-')[0];
  const match = (list: CaptionTrack[]) =>
    list.find(
      (track) =>
        track.languageCode.toLowerCase() === preferredLanguage.toLowerCase() ||
        track.languageCode.toLowerCase().split('-')[0] === preferred
    );
  return (
    match(manual) ??
    match(auto) ??
    manual[0] ??
    auto[0] ??
    tracks[0]
  );
}

function withFormat(baseUrl: string, format: string): string {
  const joiner = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${joiner}fmt=${format}`;
}

export async function fetchCaptionCues(track: CaptionTrack): Promise<Cue[]> {
  const formats = ['json3', 'srv3', 'vtt'];
  for (const format of formats) {
    try {
      const response = await httpText(withFormat(track.baseUrl, format), {
        timeoutMs: 20000,
        headers: {
          ...BROWSER_HEADERS,
          Accept: '*/*',
          Referer: 'https://www.youtube.com/',
        },
      });
      if (response.status !== 200 || !response.text.trim()) continue;
      const cues = parseCaptionText(response.text);
      if (cues.length) return cues;
    } catch {
      // Try the next caption format.
    }
  }
  throw new Error('该视频没有可用的字幕数据');
}

export async function fetchTranslatedCaptionCues(
  track: CaptionTrack,
  targetLang: string
): Promise<Cue[]> {
  const joiner = track.baseUrl.includes('?') ? '&' : '?';
  const url = `${track.baseUrl}${joiner}tlang=${encodeURIComponent(
    targetLang
  )}&fmt=json3`;
  const response = await httpText(url, {
    timeoutMs: 20000,
    headers: {
      ...BROWSER_HEADERS,
      Accept: '*/*',
      Referer: 'https://www.youtube.com/',
    },
  });
  if (response.status !== 200 || !response.text.trim()) {
    throw new Error('YouTube 自动翻译字幕不可用');
  }
  return parseCaptionText(response.text);
}
