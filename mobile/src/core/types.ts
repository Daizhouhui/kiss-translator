export type ProviderId =
  | 'auto'
  | 'microsoft'
  | 'google'
  | 'deepseek'
  | 'siliconflow'
  | 'openai';

export type SubtitleMode = 'bilingual' | 'original' | 'translation';

export type SubtitlePosition = 'bottom' | 'top';

export type ThemePreference = 'system' | 'light' | 'dark';

export type SubtitlePrefs = {
  fontSize: number;
  mode: SubtitleMode;
  position: SubtitlePosition;
  backgroundOpacity: number;
  showOnVideo: boolean;
  transcript: boolean;
};

export type WebDavConfig = {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
  folder: string;
};

export type Settings = {
  sourceLang: string;
  targetLang: string;
  provider: ProviderId;
  autoFallbackDeepSeek: boolean;
  translateTitles: boolean;
  theme: ThemePreference;
  subtitle: SubtitlePrefs;
  webdav: WebDavConfig;
  deepseekModel: string;
  siliconflowModel: string;
  openaiBaseUrl: string;
  openaiModel: string;
  requestTimeoutMs: number;
};

export type Subscription = {
  channelId: string;
  title: string;
  handle?: string;
  avatar?: string;
  group?: string;
  addedAt: number;
};

export type VideoItem = {
  videoId: string;
  title: string;
  translatedTitle?: string;
  channelId: string;
  channelTitle: string;
  channelAvatar?: string;
  published: number;
  thumbnail: string;
  duration?: number;
};

export type Cue = {
  start: number;
  end: number;
  text: string;
  translation?: string;
};

export type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
  name: string;
  kind?: string;
  isTranslatable?: boolean;
};

export type VideoMeta = {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  thumbnail: string;
  captionTracks: CaptionTrack[];
};

export type PlayerPayload = {
  meta: Pick<VideoMeta, 'videoId' | 'title' | 'author' | 'lengthSeconds'> & {
    thumbnail?: string;
  };
  cues: Cue[];
  subtitle: SubtitlePrefs;
  theme: 'light' | 'dark';
  quality?: string;
};

export type FavoriteItem = {
  videoId: string;
  title: string;
  author: string;
  thumbnail?: string;
  savedAt: number;
};

export type ProviderResult = {
  texts: string[];
  provider: ProviderId;
};
