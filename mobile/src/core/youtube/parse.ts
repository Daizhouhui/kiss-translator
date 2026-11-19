import { Cue } from '../types';
import { stripHtml } from '../utils';

type RawEvent = {
  start: number;
  end: number;
  text: string;
};

function decodeEntities(value: string): string {
  return stripHtml(
    value
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
  );
}

function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const sentences: string[] = [];
  let buffer = '';
  for (let i = 0; i < normalized.length; i++) {
    buffer += normalized[i];
    const ch = normalized[i];
    if (/[.!?。！？]/.test(ch)) {
      const next = normalized[i + 1];
      if (!next || /\s/.test(next)) {
        const trimmed = buffer.trim();
        if (trimmed) sentences.push(trimmed);
        buffer = '';
      }
    }
  }
  const rest = buffer.trim();
  if (rest) sentences.push(rest);
  return sentences.length ? sentences : [normalized];
}

function allocateTimes(
  sentences: string[],
  start: number,
  end: number
): Cue[] {
  const totalChars = sentences.reduce((sum, item) => sum + item.length, 0) || 1;
  let cursor = start;
  const duration = Math.max(0.4, end - start);
  return sentences.map((text, index) => {
    const share = text.length / totalChars;
    const cueDuration = Math.max(0.35, duration * share);
    const cueStart = cursor;
    cursor += cueDuration;
    const cueEnd =
      index === sentences.length - 1 ? Math.max(cueStart + 0.2, end) : cursor;
    return {
      start: Number(cueStart.toFixed(3)),
      end: Number(cueEnd.toFixed(3)),
      text,
    };
  });
}

function finalizeCues(cues: Cue[]): Cue[] {
  const sorted = cues
    .filter((cue) => cue.text.trim() && cue.end > cue.start)
    .sort((a, b) => a.start - b.start);
  const merged: Cue[] = [];
  for (const cue of sorted) {
    const last = merged[merged.length - 1];
    if (last && cue.start < last.end - 0.05) {
      // Rolling auto-captions often overlap. Keep the richer line.
      if (cue.text.length > last.text.length) {
        last.end = Math.max(last.end, cue.end);
        last.text = cue.text;
      } else {
        last.end = Math.max(last.end, cue.end);
      }
      continue;
    }
    if (last && cue.start - last.end < 0.25 && last.text.length < 80) {
      last.text = `${last.text} ${cue.text}`.replace(/\s+/g, ' ').trim();
      last.end = cue.end;
      continue;
    }
    merged.push({ ...cue });
  }
  return merged.filter((cue) => cue.text.length > 0);
}

export function parseJson3(payload: any): Cue[] {
  const events: any[] = Array.isArray(payload?.events) ? payload.events : [];
  const raw: RawEvent[] = [];
  for (const event of events) {
    if (!event || !Array.isArray(event.segs)) continue;
    const text = event.segs
      .map((seg: any) => (typeof seg?.utf8 === 'string' ? seg.utf8 : ''))
      .join('')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    if (event.aAppend === 1) continue;
    const start = Number(event.tStartMs) / 1000;
    const duration = Number(event.dDurationMs) / 1000;
    if (!Number.isFinite(start) || !Number.isFinite(duration)) continue;
    raw.push({
      start,
      end: Math.max(start + 0.15, start + duration),
      text: decodeEntities(text),
    });
  }
  if (!raw.length) return [];

  const lines: RawEvent[] = [];
  for (const item of raw) {
    const last = lines[lines.length - 1];
    if (
      last &&
      item.start - last.end < 0.45 &&
      `${last.text} ${item.text}`.length < 140
    ) {
      last.text = `${last.text} ${item.text}`.replace(/\s+/g, ' ').trim();
      last.end = Math.max(last.end, item.end);
    } else {
      lines.push({ ...item });
    }
  }

  const cues: Cue[] = [];
  for (const line of lines) {
    const sentences = splitSentences(line.text);
    cues.push(...allocateTimes(sentences, line.start, line.end));
  }
  return finalizeCues(cues);
}

export function parseSrv3(xml: string): Cue[] {
  const cues: Cue[] = [];
  const bodyMatch = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : xml;
  const paragraphRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = paragraphRe.exec(body))) {
    const attrs = match[1];
    const inner = match[2];
    const tMatch = attrs.match(/\bt="(\d+)"/);
    const dMatch = attrs.match(/\bd="(\d+)"/);
    if (!tMatch || !dMatch) continue;
    const start = Number(tMatch[1]) / 1000;
    const duration = Number(dMatch[1]) / 1000;
    const text = decodeEntities(
      inner
        .replace(/<s[^>]*>/gi, '')
        .replace(/<\/s>/gi, '')
        .replace(/<[^>]+>/g, '')
    );
    if (!text.trim()) continue;
    cues.push(...allocateTimes(splitSentences(text), start, start + duration));
  }
  return finalizeCues(cues);
}

export function parseVtt(vtt: string): Cue[] {
  const cues: Cue[] = [];
  const lines = vtt.replace(/\r/g, '').split('\n');
  let start = 0;
  let end = 0;
  let text: string[] = [];
  const flush = () => {
    const joined = decodeEntities(text.join(' ').replace(/\s+/g, ' ').trim());
    if (joined && end > start) {
      cues.push(...allocateTimes(splitSentences(joined), start, end));
    }
    text = [];
  };
  for (const line of lines) {
    const timing = line.match(
      /^(\d{1,2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{3})/
    );
    if (timing) {
      flush();
      start =
        Number(timing[1]) * 3600 +
        Number(timing[2]) * 60 +
        Number(timing[3]) +
        Number(timing[4]) / 1000;
      end =
        Number(timing[5]) * 3600 +
        Number(timing[6]) * 60 +
        Number(timing[7]) +
        Number(timing[8]) / 1000;
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^(WEBVTT|NOTE|Kind:|Language:)/i.test(line)) continue;
    text.push(line.trim());
  }
  flush();
  return finalizeCues(cues);
}

export function parseCaptionText(text: string): Cue[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('{')) {
    try {
      return parseJson3(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  if (/<transcript|<timedtext/i.test(trimmed)) return parseSrv3(trimmed);
  return parseVtt(trimmed);
}

export function extractInitialPlayerResponse(html: string): any | null {
  const markers = [
    'ytInitialPlayerResponse = ',
    'ytInitialPlayerResponse =',
    'ytInitialPlayerResponse=',
  ];
  for (const marker of markers) {
    const index = html.indexOf(marker);
    if (index === -1) continue;
    let start = index + marker.length;
    while (start < html.length && /[\s;]/.test(html[start])) start++;
    if (html[start] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}
