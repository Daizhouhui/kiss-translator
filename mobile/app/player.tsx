import { Asset } from 'expo-asset';
import * as Clipboard from 'expo-clipboard';
import { useKeepAwake } from 'expo-keep-awake';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { getSettings, useAppStore } from '@/src/core/store';
import { translateCueList } from '@/src/core/translate';
import { Cue, PlayerPayload, SubtitlePrefs } from '@/src/core/types';
import {
  fetchCaptionCues,
  getVideoMeta,
  pickCaptionTrack,
} from '@/src/core/youtube/innertube';

const AnyWebView: any = WebView;

const htmlCache: { value: string | null } = { value: null };

async function loadPlayerHtml(): Promise<string> {
  if (htmlCache.value) return htmlCache.value;
  const asset = Asset.fromModule(require('../assets/player/index.html'));
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const html = await FileSystem.readAsStringAsync(uri);
  htmlCache.value = html;
  return html;
}

export default function PlayerScreen() {
  useKeepAwake();
  const params = useLocalSearchParams<{
    videoId?: string;
    title?: string;
    author?: string;
  }>();
  const videoId = String(params.videoId ?? '');
  const settings = useAppStore((state) => state.settings);
  const patchSettings = useAppStore((state) => state.patchSettings);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const resolvedTheme =
    settings.theme === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : settings.theme;
  const webRef = useRef<any>(null);
  const originalCuesRef = useRef<Cue[]>([]);

  const [html, setHtml] = useState<string | null>(htmlCache.value);
  const [ready, setReady] = useState(false);
  const [payload, setPayload] = useState<PlayerPayload | null>(null);
  const [translatedCues, setTranslatedCues] = useState<Cue[] | null>(null);
  const [status, setStatus] = useState('正在读取视频信息…');
  const [fatal, setFatal] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    loadPlayerHtml()
      .then(setHtml)
      .catch((error) => setFatal(`播放器资源加载失败：${error}`));
  }, []);

  useEffect(() => {
    if (!html || !videoId) return;
    let cancelled = false;
    const subtitle = getSettings().subtitle;
    setFatal('');
    setStatus('正在读取视频信息…');
    setTranslatedCues(null);

    const load = async () => {
      try {
        const meta = await getVideoMeta(videoId);
        if (cancelled) return;
        const track = pickCaptionTrack(meta.captionTracks, 'en');
        if (!track) {
          originalCuesRef.current = [];
          setPayload({
            meta: {
              videoId,
              title: meta.title,
              author: meta.author,
              lengthSeconds: meta.lengthSeconds,
              thumbnail: meta.thumbnail,
            },
            cues: [],
            subtitle,
            theme: resolvedTheme,
          });
          setStatus('');
          return;
        }
        setStatus('正在读取字幕…');
        const cues = await fetchCaptionCues(track);
        if (cancelled) return;
        originalCuesRef.current = cues;
        const basePayload: PlayerPayload = {
          meta: {
            videoId,
            title: meta.title,
            author: meta.author,
            lengthSeconds: meta.lengthSeconds,
            thumbnail: meta.thumbnail,
          },
          cues,
          subtitle,
          theme: resolvedTheme,
        };
        setPayload(basePayload);
        setStatus('正在翻译字幕…');
        const trackKey = `${track.languageCode}:${track.kind ?? 'manual'}`;
        try {
          const translated = await translateCueList(videoId, cues, trackKey, {
            contextTitle: meta.title,
          });
          if (cancelled) return;
          setTranslatedCues(translated.cues);
        } catch (error) {
          if (cancelled) return;
          const message = error instanceof Error ? error.message : String(error);
          if (webRef.current) {
            webRef.current.injectJavaScript(
              `window.KissPlayer && window.KissPlayer.toast(${JSON.stringify(
                `字幕翻译失败：${message}`
              )}); true;`
            );
          }
        } finally {
          if (!cancelled) setStatus('');
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setFatal(message);
        setStatus('');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [html, videoId]);

  useEffect(() => {
    if (!ready || !payload) return;
    webRef.current?.injectJavaScript(
      `window.KissPlayer && window.KissPlayer.load(${JSON.stringify(
        payload
      )}); true;`
    );
  }, [ready, payload]);

  useEffect(() => {
    if (!ready || !translatedCues) return;
    webRef.current?.injectJavaScript(
      `window.KissPlayer && window.KissPlayer.setCues(${JSON.stringify(
        translatedCues
      )}); true;`
    );
  }, [ready, translatedCues]);

  useEffect(() => {
    if (!ready) return;
    webRef.current?.injectJavaScript(
      `window.KissPlayer && window.KissPlayer.setPrefs(${JSON.stringify(
        settings.subtitle
      )}); true;`
    );
  }, [ready, settings.subtitle]);

  useEffect(() => {
    if (!ready) return;
    webRef.current?.injectJavaScript(
      `window.KissPlayer && window.KissPlayer.setFavorite(${JSON.stringify(
        favorites.some((item) => item.videoId === videoId)
      )}); true;`
    );
  }, [ready, favorites, videoId]);

  useEffect(() => {
    if (!ready) return;
    const theme = settings.theme === 'system' ? resolvedTheme : settings.theme;
    webRef.current?.injectJavaScript(
      `window.KissPlayer && window.KissPlayer.setTheme(${JSON.stringify(
        theme
      )}); true;`
    );
  }, [ready, resolvedTheme, settings.theme]);

  useEffect(() => {
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  const handleFullscreen = async (value: boolean) => {
    try {
      if (value) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
        setFullscreen(true);
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
        setFullscreen(false);
      }
    } catch {}
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (fullscreen) {
          handleFullscreen(false);
          return true;
        }
        return false;
      }
    );
    return () => subscription.remove();
  }, [fullscreen]);

  const retranslate = async () => {
    if (!payload) return;
    const meta = await getVideoMeta(videoId);
    const track = pickCaptionTrack(meta.captionTracks, 'en');
    if (!track) return;
    const sourceCues = originalCuesRef.current.length ? originalCuesRef.current : payload.cues;
    const translated = await translateCueList(
      videoId,
      sourceCues,
      `${track.languageCode}:${track.kind ?? 'manual'}`,
      { contextTitle: meta.title }
    );
    setTranslatedCues(translated.cues);
    webRef.current?.injectJavaScript(
      `window.KissPlayer && window.KissPlayer.setCues(${JSON.stringify(
        translated.cues
      )}); true;`
    );
  };

  const onMessage = async (event: WebViewMessageEvent) => {
    let message: any = null;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'ready') {
      setReady(true);
      webRef.current?.injectJavaScript(
        `document.documentElement.style.setProperty('--safe-top', '${Math.max(
          0,
          Math.round(insets.top)
        )}px'); document.documentElement.style.setProperty('--safe-bottom', '${Math.max(
          0,
          Math.round(insets.bottom)
        )}px'); true;`
      );
      if (html) {
        webRef.current?.injectJavaScript(
          `window.KissPlayer && window.KissPlayer.setTheme(${JSON.stringify(
            resolvedTheme
          )}); true;`
        );
      }
      return;
    }
    if (message.type === 'loaded') {
      setStatus('');
      return;
    }
    if (message.type === 'playing') {
      setPlaying(!!message.value);
      return;
    }
    if (message.type === 'orientation') {
      return;
    }
    if (message.type === 'fullscreen') {
      await handleFullscreen(!!message.value);
      return;
    }
    if (message.type === 'back') {
      router.back();
      return;
    }
    if (message.type === 'theme') {
      patchSettings({ theme: message.value === 'dark' ? 'dark' : 'light' });
      return;
    }
    if (message.type === 'prefs') {
      patchSettings({ subtitle: message.prefs as SubtitlePrefs });
      return;
    }
    if (message.type === 'open-external' && typeof message.url === 'string') {
      Linking.openURL(message.url).catch(() => {});
      return;
    }
    if (message.type === 'copy-link' && typeof message.url === 'string') {
      await Clipboard.setStringAsync(message.url);
      return;
    }
    if (message.type === 'retranslate') {
      retranslate().catch((error) => {
        webRef.current?.injectJavaScript(
          `window.KissPlayer && window.KissPlayer.toast(${JSON.stringify(
            `重新翻译失败：${error instanceof Error ? error.message : error}`
          )}); true;`
        );
      });
      return;
    }
    if (message.type === 'favorite') {
      const meta = payload?.meta;
      if (!meta) return;
      const exists = favorites.some((item) => item.videoId === meta.videoId);
      const added = toggleFavorite({
        videoId: meta.videoId,
        title: meta.title,
        author: meta.author,
        thumbnail: meta.thumbnail,
        savedAt: Date.now(),
      });
      webRef.current?.injectJavaScript(
        `window.KissPlayer && window.KissPlayer.setFavorite(${JSON.stringify(
          added
        )}); window.KissPlayer && window.KissPlayer.toast(${JSON.stringify(
          exists ? '已取消收藏' : '已加入收藏'
        )}); true;`
      );
      return;
    }
    if (message.type === 'error') {
      return;
    }
  };

  if (fatal) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.errorTitle}>播放失败</Text>
        <Text style={styles.errorText}>{fatal}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style={fullscreen || resolvedTheme === 'dark' ? 'light' : 'dark'} hidden={fullscreen} />
      {!html ? (
        <View style={styles.center}>
          <ActivityIndicator color="#8B72FF" />
          <Text style={styles.loadingText}>正在准备播放器…</Text>
        </View>
      ) : (
        <AnyWebView
          ref={webRef}
          source={{ html, baseUrl: 'https://www.youtube.com' }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={false}
          setSupportMultipleWindows={false}
          mixedContentMode="never"
          onMessage={onMessage}
          onError={(event: any) =>
            setFatal(
              `WebView 加载失败：${event.nativeEvent.description ?? '未知错误'}`
            )
          }
          onShouldStartLoadWithRequest={(request: any) => {
            const url = request.url;
            if (
              url.startsWith('about:') ||
              url.startsWith('https://www.youtube.com') ||
              url.startsWith('https://youtube.com') ||
              url.startsWith('https://consent.youtube.com') ||
              url.startsWith('https://www.google.com')
            ) {
              return true;
            }
            Linking.openURL(url).catch(() => {});
            return false;
          }}
        />
      )}
      {status ? (
        <View pointerEvents="none" style={styles.statusPill}>
          <ActivityIndicator size="small" color="#8B72FF" />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050407' },
  webview: { flex: 1, backgroundColor: '#050407' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050407',
    padding: 28,
  },
  loadingText: { color: 'rgba(255,255,255,.7)', fontSize: 13, marginTop: 12 },
  errorTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  errorText: { color: 'rgba(255,255,255,.6)', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  statusPill: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(18,14,26,.9)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  statusText: { color: '#fff', fontSize: 12 },
});
