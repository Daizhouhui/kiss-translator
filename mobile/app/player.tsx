import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { getSettings, useAppStore } from '@/src/core/store';
import { translateCueList } from '@/src/core/translate';
import { Cue } from '@/src/core/types';
import {
  fetchCaptionCues,
  getVideoMeta,
  pickCaptionTrack,
} from '@/src/core/youtube/innertube';

const AnyWebView: any = WebView;

const WATCH_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const WATCH_CSS = `
html,body{background:#000!important;margin:0!important;overflow:hidden!important;}
#masthead-container,#secondary,#comments,#below,ytd-watch-metadata,ytd-comments,
#related,#chat,#chat-container,ytd-merch-shelf-renderer,ytd-donation-shelf-renderer,
ytd-clarification-renderer,#ticker,ytd-miniplayer,.ytd-watch-next-secondary-results-renderer,
#meta,#info,#owner,#actions,#description{display:none!important;}
#player-container-outer,#player-container-inner,#player-container,#player,
#player-full-bleed-container{width:100vw!important;height:100vh!important;max-width:none!important;
max-height:none!important;min-height:0!important;padding:0!important;margin:0!important;}
#content,#page-container{min-height:0!important;padding:0!important;margin:0!important;}
#player{position:fixed!important;left:0!important;top:0!important;}
.ytp-chrome-bottom,.ytp-gradient-bottom,.ytp-caption-window-container,.ytp-pause-overlay,
.ytp-ce-element,.ytp-ad-overlay-container,.ytp-paid-content-overlay,.ytp-share-button,
.ytp-watch-later-button,.ytp-title,.ytp-watermark,.ytp-large-play-button{display:none!important;}
.html5-video-player,.html5-video-container,video{width:100%!important;height:100%!important;}
video{object-fit:contain!important;background:#000!important;}
`;

function playerBridgeScript() {
  return `
(function(){
  try {
    if (window.__kissBridge && window.__kissBridge.timer) clearInterval(window.__kissBridge.timer);
    var bridge = window.__kissBridge = { mode: 'watch' };
    function send(payload){
      try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch(e) {}
    }
    function getPlayer(){
      return document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    }
    function getVideo(){ return document.querySelector('video'); }
    function setQuality(){
      try {
        var p = getPlayer();
        if (p && p.setPlaybackQualityRange) {
          p.setPlaybackQualityRange('hd1080','hd1080');
          if (p.setPlaybackQuality) p.setPlaybackQuality('hd1080');
        }
      } catch(e) {}
    }
    function report(){
      var v = getVideo();
      var p = getPlayer();
      if (!v) return;
      var quality = '';
      try { quality = p && p.getPlaybackQuality ? p.getPlaybackQuality() : ''; } catch(e) {}
      send({
        type: 'time',
        current: Number(v.currentTime) || 0,
        duration: Number(v.duration) || 0,
        playing: !v.paused && !v.ended,
        ready: v.readyState >= 2,
        rate: v.playbackRate,
        quality: quality
      });
    }
    function bind(){
      var v = getVideo();
      if (!v) { setTimeout(bind, 700); return; }
      if (!v.__kissBound) {
        v.__kissBound = true;
        ['timeupdate','play','playing','pause','ended','durationchange','loadedmetadata','seeking','seeked','ratechange'].forEach(function(name){
          v.addEventListener(name, report);
        });
        v.addEventListener('error', function(){
          send({ type:'problem', reason:'video-error', code: v.error ? v.error.code : 0 });
        });
        try { v.playsInline = true; } catch(e) {}
        send({ type:'ready' });
        setQuality();
        var playPromise = null;
        try { playPromise = v.play(); } catch(e) {}
        if (playPromise && playPromise.catch) playPromise.catch(function(){ send({type:'blocked'}); });
        report();
      }
      if (!bridge.timer) {
        bridge.timer = setInterval(report, 900);
        bridge.qualityTimer = setInterval(setQuality, 5000);
      }
      setQuality();
    }
    window.__kiss = {
      play: function(){ var v=getVideo(); try{ var r=v&&v.play(); if(r&&r.catch)r.catch(function(){}); }catch(e){}; return true; },
      pause: function(){ var v=getVideo(); try{ v&&v.pause(); }catch(e){}; return true; },
      seek: function(seconds){ var v=getVideo(); try{ if(v){ v.currentTime=Math.max(0, Number(seconds)||0); } }catch(e){}; return true; },
      rate: function(rate){ var v=getVideo(); try{ if(v)v.playbackRate=Number(rate)||1; }catch(e){}; return true; },
      quality: function(){ setQuality(); return true; }
    };
    bind();
    document.addEventListener('yt-navigate-finish', function(){ setTimeout(bind, 400); }, true);
    setTimeout(function(){
      var v=getVideo();
      var p=getPlayer();
      var state=-1;
      try{ state = p && p.getPlayerState ? p.getPlayerState() : -1; }catch(e){}
      var text='';
      try{ text=(document.body&&document.body.innerText||'').toLowerCase(); }catch(e){}
      var bad = !v || state===5 ||
        text.indexOf('video unavailable')>=0 ||
        text.indexOf('playback on other websites has been disabled')>=0 ||
        text.indexOf('this video is unavailable')>=0 ||
        text.indexOf('error 101')>=0 || text.indexOf('error 150')>=0 || text.indexOf('error 153')>=0;
      if (bad) send({ type:'problem', reason:'unavailable', state: state, text: text.slice(0,160) });
    }, 6500);
  } catch (error) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'problem', reason:'bridge', text:String(error)})); } catch(e) {}
  }
})();
true;
`;
}

function formatTime(value: number) {
  if (!isFinite(value) || value < 0) value = 0;
  const total = Math.floor(value);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const FONT_STEPS = [15, 17, 19, 22, 26];

export default function PlayerScreen() {
  useKeepAwake();
  const params = useLocalSearchParams<{ videoId?: string; title?: string; author?: string }>();
  const videoId = String(params.videoId ?? '');
  const initialTitle = String(params.title ?? '');
  const initialAuthor = String(params.author ?? '');
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  const landscape = windowSize.width > windowSize.height;
  const settings = useAppStore((state) => state.settings);
  const patchSettings = useAppStore((state) => state.patchSettings);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const recordHistory = useAppStore((state) => state.recordHistory);
  const webRef = useRef<any>(null);
  const scrollRef = useRef<any>(null);
  const cueOffsets = useRef<Record<number, number>>({});
  const recordedRef = useRef(false);

  // A top-level watch page always has a real youtube.com origin. Loading an
  // embed URL directly has no HTTP Referer and YouTube rejects it with Error
  // 153, which was the root cause of the old "video unavailable" screen.
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState('');
  const [videoProblem, setVideoProblem] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [sourceCues, setSourceCues] = useState<Cue[]>([]);
  const [translatedCues, setTranslatedCues] = useState<Cue[] | null>(null);
  const [metaTitle, setMetaTitle] = useState(initialTitle);
  const [metaAuthor, setMetaAuthor] = useState(initialAuthor);
  const [status, setStatus] = useState('正在读取字幕…');
  const [progressWidth, setProgressWidth] = useState(0);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [trackKey, setTrackKey] = useState('');
  const [toast, setToast] = useState('');

  const isFavorite = favorites.some((item) => item.videoId === videoId);
  const subtitleMode = settings.subtitle.mode;
  const showTranslation = subtitleMode !== 'original';
  const fontSize = settings.subtitle.fontSize ?? 17;
  const cues = translatedCues ?? sourceCues;

  const activeIndex = useMemo(() => {
    if (!cues.length) return -1;
    const t = current;
    for (let i = 0; i < cues.length; i += 1) {
      const cue = cues[i];
      if (cue.start <= t + 0.12 && t <= cue.end + 0.2) return i;
      if (cue.start > t + 0.12) break;
    }
    return -1;
  }, [cues, current]);

  const activeCue = activeIndex >= 0 ? cues[activeIndex] : null;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    const subtitle = getSettings().subtitle;
    setStatus('正在读取字幕…');
    const load = async () => {
      try {
        const meta = await getVideoMeta(videoId);
        if (cancelled) return;
        setMetaTitle(meta.title || initialTitle);
        setMetaAuthor(meta.author || initialAuthor);
        const track = pickCaptionTrack(meta.captionTracks, 'en');
        if (!track) {
          setSourceCues([]);
          setStatus('这个视频没有可用英文字幕');
          return;
        }
        setTrackKey(`${track.languageCode}:${track.kind ?? 'manual'}`);
        const fetched = await fetchCaptionCues(track);
        if (cancelled) return;
        setSourceCues(fetched);
        setStatus('正在翻译字幕…');
        try {
          const translated = await translateCueList(
            videoId,
            fetched,
            `${track.languageCode}:${track.kind ?? 'manual'}`,
            { contextTitle: meta.title }
          );
          if (!cancelled) {
            setTranslatedCues(translated.cues);
            setStatus('');
          }
        } catch (error) {
          if (!cancelled) {
            setStatus(`翻译失败：${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(`字幕读取失败：${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [videoId, initialAuthor, initialTitle]);

  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    recordHistory({
      videoId,
      title: metaTitle || initialTitle || videoId,
      author: metaAuthor || initialAuthor,
      thumbnail: thumb,
      savedAt: Date.now(),
    });
  }, [videoId, metaTitle, metaAuthor, initialAuthor, initialTitle, recordHistory]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const y = cueOffsets.current[activeIndex];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  const exitFullscreen = async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch {}
    setFullscreen(false);
  };

  const handleFullscreen = async () => {
    try {
      if (landscape || fullscreen) {
        await exitFullscreen();
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setFullscreen(true);
      }
    } catch {}
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) {
        setSheet(false);
        return true;
      }
      if (fullscreen || landscape) {
        exitFullscreen();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [fullscreen, landscape, sheet]);

  const send = (script: string) => {
    webRef.current?.injectJavaScript(script);
  };

  const togglePlay = () => {
    if (playing) send('window.__kiss && window.__kiss.pause(); true;');
    else send('window.__kiss && window.__kiss.play(); true;');
    setPlaying(!playing);
    setBlocked(false);
  };

  const seekTo = (seconds: number) => {
    const next = Math.max(0, Math.min(duration || seconds, seconds));
    setCurrent(next);
    send(`window.__kiss && window.__kiss.seek(${next}); true;`);
  };

  const seekFromEvent = (locationX: number) => {
    if (!duration || !progressWidth) return;
    seekTo((locationX / progressWidth) * duration);
  };

  const seekBy = (delta: number) => seekTo(current + delta);

  const handleMessage = (event: WebViewMessageEvent) => {
    let message: any = null;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!message || typeof message.type !== 'string') return;
    if (message.type === 'ready') {
      setReady(true);
      setVideoProblem('');
      return;
    }
    if (message.type === 'blocked') {
      setBlocked(true);
      return;
    }
    if (message.type === 'time') {
      if (typeof message.current === 'number') setCurrent(message.current);
      if (typeof message.duration === 'number' && message.duration > 0) setDuration(message.duration);
      if (typeof message.playing === 'boolean') setPlaying(message.playing);
      if (message.quality) setQuality(String(message.quality));
      if (message.ready) setReady(true);
      return;
    }
    if (message.type === 'problem') {
      setReady(false);
      setVideoProblem('这个视频限制了站内播放，可能需要登录、年龄验证或作者关闭了外站播放。');
    }
  };

  const retry = () => {
    setVideoProblem('');
    setReady(false);
    setPlaying(false);
    setCurrent(0);
  };

  const shareVideo = async () => {
    try {
      await Share.share({
        title: metaTitle,
        message: `https://www.youtube.com/watch?v=${videoId}`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
    } catch {}
  };

  const saveFavorite = () => {
    const added = toggleFavorite({
      videoId,
      title: metaTitle || videoId,
      author: metaAuthor,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      savedAt: Date.now(),
    });
    setToast(added ? '已保存到学习页' : '已取消收藏');
  };

  const changeFontSize = (direction: 1 | -1) => {
    const index = FONT_STEPS.findIndex((size) => size >= fontSize);
    const currentIndex = index < 0 ? FONT_STEPS.length - 1 : index;
    const next = FONT_STEPS[Math.max(0, Math.min(FONT_STEPS.length - 1, currentIndex + direction))];
    patchSettings({ subtitle: { ...settings.subtitle, fontSize: next } });
  };

  const toggleTranslation = () => {
    patchSettings({
      subtitle: {
        ...settings.subtitle,
        mode: showTranslation ? 'original' : 'bilingual',
      },
    });
  };

  const displayTitle = metaTitle || initialTitle || 'YouTube';
  const displayAuthor = metaAuthor || initialAuthor;
  const webUrl = `https://www.youtube.com/watch?v=${videoId}&hl=zh-CN&autoplay=1&themeMode=dark`;

  if (!videoId) {
    return (
      <View style={[styles.center, { backgroundColor: '#08060D' }]}>
        <Text style={styles.errorTitle}>缺少视频参数</Text>
      </View>
    );
  }

  const videoBlock = (
    <View
      style={
        landscape
          ? styles.landscapeVideo
          : [styles.videoFrame, { aspectRatio: 16 / 9 }]
      }
    >
      <AnyWebView
        key="watch"
        ref={webRef}
        source={{ uri: webUrl }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        setSupportMultipleWindows={false}
        cacheEnabled
        javaScriptCanOpenWindowsAutomatically
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        userAgent={WATCH_UA}
        injectedJavaScript={playerBridgeScript()}
        onMessage={handleMessage}
        onLoadStart={() => setReady(false)}
        onLoadEnd={() => {
          send(playerBridgeScript());
          setTimeout(() => send('window.__kiss && window.__kiss.play(); true;'), 1200);
        }}
        onError={() => {
          setReady(false);
          setVideoProblem('播放器加载失败，请检查网络后重试，或在浏览器中打开该视频。');
        }}
        onShouldStartLoadWithRequest={(request: any) => {
          const url = String(request.url || '');
          if (
            url.startsWith('about:') ||
            url.startsWith('https://www.youtube.com') ||
            url.startsWith('https://youtube.com') ||
            url.startsWith('https://m.youtube.com') ||
            url.startsWith('https://consent.youtube.com') ||
            url.startsWith('https://accounts.google.com') ||
            url.startsWith('https://www.google.com')
          ) {
            return true;
          }
          Linking.openURL(url).catch(() => {});
          return false;
        }}
      />
      {!ready ? (
        <View style={styles.videoLoading} pointerEvents="none">
          <ActivityIndicator color="#A78BFA" />
          <Text style={styles.videoLoadingText}>
            {'正在连接 YouTube…'}
          </Text>
        </View>
      ) : null}
      {!playing ? (
        <Pressable style={styles.centerPlay} onPress={togglePlay}>
          <Ionicons name="play" size={34} color="#FFFFFF" />
        </Pressable>
      ) : null}
      <View style={styles.qualityChip} pointerEvents="none">
        <Text style={styles.qualityChipText}>
          {quality ? quality.toUpperCase() : 'HD1080'} · 优先
        </Text>
      </View>
      {videoProblem ? (
        <View style={styles.problemOverlay}>
          <Ionicons name="alert-circle-outline" size={30} color="#FCA5A5" />
          <Text style={styles.problemTitle}>YouTube 未能播放这个视频</Text>
          <Text style={styles.problemText}>{videoProblem}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable style={styles.problemButton} onPress={retry}>
              <Text style={styles.problemButtonText}>重试</Text>
            </Pressable>
            <Pressable
              style={[styles.problemButton, styles.problemButtonGhost]}
              onPress={() => router.push('/youtube-account' as any)}
            >
              <Text style={styles.problemButtonText}>登录 YouTube</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );

  const subtitleBlock = activeCue ? (
    <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
      <Text
        style={{
          color: '#F3B45B',
          fontSize: 19,
          fontWeight: '800',
          lineHeight: 26,
          letterSpacing: -0.2,
        }}
        numberOfLines={3}
      >
        {activeCue.text}
      </Text>
      {showTranslation && activeCue.translation ? (
        <Text style={styles.activeTranslation} numberOfLines={2}>
          {activeCue.translation}
        </Text>
      ) : null}
    </View>
  ) : null;

  const controls = (
    <View
      style={[
        styles.controls,
        landscape && { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
        { paddingBottom: landscape ? 18 : Math.max(14, insets.bottom) },
      ]}
    >
      {landscape && activeCue ? (
        <View style={{ paddingBottom: 8 }}>
          <Text style={styles.landscapeSubOriginal} numberOfLines={2}>
            {activeCue.text}
          </Text>
          {showTranslation && activeCue.translation ? (
            <Text style={styles.landscapeSubTranslation} numberOfLines={2}>
              {activeCue.translation}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={styles.progressTouch}
        onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => seekFromEvent(event.nativeEvent.locationX)}
        onResponderMove={(event) => {
          if (!duration || !progressWidth) return;
          setSeekPreview((event.nativeEvent.locationX / progressWidth) * duration);
        }}
        onResponderRelease={(event) => {
          seekFromEvent(event.nativeEvent.locationX);
          setSeekPreview(null);
        }}
      >
        <View style={styles.progressRail}>
          <View
            style={[
              styles.progressFill,
              {
                width: duration
                  ? Math.max(
                      0,
                      Math.min(
                        progressWidth,
                        ((seekPreview ?? current) / duration) * progressWidth
                      )
                    )
                  : 0,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.progressThumb,
            {
              left: duration
                ? Math.max(
                    0,
                    Math.min(
                      progressWidth,
                      ((seekPreview ?? current) / duration) * progressWidth
                    )
                  )
                : 0,
            },
          ]}
        />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(seekPreview ?? current)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
      <View style={styles.transport}>
        <Pressable onPress={() => seekBy(-10)} hitSlop={10} style={styles.transportSmall}>
          <Ionicons name="play-back" size={22} color="#F5F2FF" />
        </Pressable>
        <Pressable onPress={togglePlay} style={styles.playButton}>
          <Ionicons name={playing ? 'pause' : 'play'} size={24} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={() => seekBy(10)} hitSlop={10} style={styles.transportSmall}>
          <Ionicons name="play-forward" size={22} color="#F5F2FF" />
        </Pressable>
      </View>
      {!landscape ? (
        <View style={styles.bottomActions}>
          <Pressable style={styles.action} onPress={() => setSheet(true)}>
            <Ionicons name="options-outline" size={22} color="#C6BDDA" />
            <Text style={styles.actionLabel}>设置</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={saveFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? '#A78BFA' : '#C6BDDA'}
            />
            <Text style={[styles.actionLabel, isFavorite && { color: '#A78BFA' }]}>收藏</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={shareVideo}>
            <Ionicons name="share-social-outline" size={22} color="#C6BDDA" />
            <Text style={styles.actionLabel}>分享</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={handleFullscreen}>
            <Ionicons name="expand-outline" size={22} color="#C6BDDA" />
            <Text style={styles.actionLabel}>全屏</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const transcript = (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 }}
      showsVerticalScrollIndicator={false}
    >
      {cues.length === 0 ? (
        <View style={styles.emptyTranscript}>
          <Ionicons name="document-text-outline" size={34} color="#6F6685" />
          <Text style={styles.emptyTranscriptText}>{status || '这个视频还没有可用字幕'}</Text>
        </View>
      ) : (
        cues.map((cue, index) => {
          const active = index === activeIndex;
          const past = index < activeIndex;
          return (
            <Pressable
              key={`${cue.start}-${index}`}
              onLayout={(event) => {
                cueOffsets.current[index] = event.nativeEvent.layout.y;
              }}
              onPress={() => seekTo(cue.start)}
              style={[
                styles.cue,
                active && styles.cueActive,
                past && { opacity: 0.5 },
              ]}
            >
              <Text
                style={[
                  styles.cueOriginal,
                  { fontSize: Math.max(14, fontSize) },
                  active && styles.cueOriginalActive,
                  past && { color: '#8B829C' },
                ]}
              >
                {cue.text}
              </Text>
              {showTranslation && cue.translation ? (
                <Text
                  style={[
                    styles.cueTranslation,
                    { fontSize: Math.max(12, fontSize - 3) },
                    active && styles.cueTranslationActive,
                  ]}
                >
                  {cue.translation}
                </Text>
              ) : null}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );

  if (landscape) {
    return (
      <View style={styles.landscapeRoot}>
        <StatusBar style="light" hidden />
        {videoBlock}
        <Pressable
          style={[styles.landscapeBack, { top: Math.max(12, insets.top) }]}
          onPress={exitFullscreen}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={[styles.landscapeTitle, { top: Math.max(12, insets.top) }]} pointerEvents="none">
          <Text style={styles.landscapeTitleText} numberOfLines={1}>
            {displayTitle}
          </Text>
          {displayAuthor ? (
            <Text style={styles.landscapeAuthor} numberOfLines={1}>
              {displayAuthor}
            </Text>
          ) : null}
        </View>
        <Pressable
          style={[styles.landscapeMore, { top: Math.max(12, insets.top) }]}
          onPress={() => setSheet(true)}
        >
          <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
        </Pressable>
        {controls}
        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
        {sheetModal()}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top) }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#F5F2FF" />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
          {displayAuthor ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {displayAuthor}
            </Text>
          ) : null}
        </View>
        <Pressable style={styles.headerButton} onPress={() => setSheet(true)} hitSlop={10}>
          <Ionicons name="ellipsis-vertical" size={22} color="#F5F2FF" />
        </Pressable>
      </View>

      {videoBlock}

      {subtitleBlock}

      <View style={styles.transcriptHeader}>
        <Text style={styles.transcriptTitle}>字幕稿</Text>
        {status ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color="#A78BFA" />
            <Text style={styles.statusText} numberOfLines={1}>
              {status}
            </Text>
          </View>
        ) : (
          <Text style={styles.statusText}>点句子可跳转</Text>
        )}
      </View>

      {transcript}
      {controls}

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
      {sheetModal()}
    </View>
  );

  function sheetModal() {
    return (
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.sheetMask} onPress={() => setSheet(false)}>
          <Pressable
            style={[styles.sheetCard, { paddingBottom: Math.max(24, insets.bottom) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>更多设置</Text>

            <View style={styles.sheetGroup}>
              <SheetRow
                icon="language-outline"
                title="显示翻译"
                right={
                  <SwitchPill
                    value={showTranslation}
                    onPress={toggleTranslation}
                  />
                }
              />
              <SheetRow
                icon="text-outline"
                title="字体大小"
                right={
                  <View style={styles.fontStepper}>
                    <Pressable onPress={() => changeFontSize(-1)} style={styles.stepButton}>
                      <Ionicons name="remove" size={18} color="#E9E3F7" />
                    </Pressable>
                    <Text style={styles.fontStepValue}>{fontSize}px</Text>
                    <Pressable onPress={() => changeFontSize(1)} style={styles.stepButton}>
                      <Ionicons name="add" size={18} color="#E9E3F7" />
                    </Pressable>
                  </View>
                }
              />
              <SheetRow
                icon="color-wand-outline"
                title="翻译引擎"
                value={
                  settings.provider === 'auto'
                    ? '自动'
                    : settings.provider === 'microsoft'
                      ? 'Microsoft'
                      : settings.provider === 'google'
                        ? 'Google'
                        : settings.provider === 'deepseek'
                          ? 'DeepSeek'
                          : settings.provider === 'siliconflow'
                            ? 'SiliconFlow'
                            : 'OpenAI'
                }
                onPress={() => {
                  setSheet(false);
                  router.push('/settings/translation' as any);
                }}
              />
              <SheetRow
                icon="person-circle-outline"
                title="登录 YouTube"
                subtitle="同步订阅与账号播放权限"
                onPress={() => {
                  setSheet(false);
                  router.push('/youtube-account' as any);
                }}
              />
            </View>

            <View style={styles.sheetGroup}>
              <SheetRow icon="heart-outline" title={isFavorite ? '取消收藏' : '保存到学习页'} onPress={() => { saveFavorite(); setSheet(false); }} />
              <SheetRow icon="share-social-outline" title="分享视频" onPress={() => { shareVideo(); setSheet(false); }} />
              <SheetRow
                icon="refresh-outline"
                title="重新翻译字幕"
                onPress={() => {
                  setSheet(false);
                  retranslate();
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  async function retranslate() {
    if (!sourceCues.length || !trackKey) {
      setToast('没有可重新翻译的字幕');
      return;
    }
    setStatus('正在重新翻译…');
    try {
      const translated = await translateCueList(videoId, sourceCues, trackKey, {
        contextTitle: metaTitle,
      });
      setTranslatedCues(translated.cues);
      setStatus('');
      setToast('字幕已重新翻译');
    } catch (error) {
      setStatus(`翻译失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function SheetRow({
  icon,
  title,
  subtitle,
  value,
  right,
  onPress,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.sheetRow}>
      <View style={styles.sheetIcon}>
        <Ionicons name={icon} size={18} color="#C7B8FF" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.sheetRowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sheetRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.sheetRowValue}>{value}</Text> : null}
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={16} color="#756B86" style={{ marginLeft: 6 }} /> : null}
    </View>
  );
  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

function SwitchPill({ value, onPress }: { value: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.switchPill, value && styles.switchPillOn]}>
      <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0812' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#F5F2FF', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  headerSubtitle: { color: '#8D849D', fontSize: 11, marginTop: 2 },
  videoFrame: {
    width: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
    borderRadius: 0,
  },
  landscapeVideo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000' },
  webview: { flex: 1, backgroundColor: '#000000' },
  videoLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050309',
    gap: 8,
  },
  videoLoadingText: { color: '#B9AFCC', fontSize: 12 },
  centerPlay: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -34,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(10,8,16,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  qualityChip: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(12,9,18,0.68)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qualityChipText: { color: '#C9BFFF', fontSize: 10, fontWeight: '700' },
  problemOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,5,13,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  problemTitle: { color: '#F5F2FF', fontSize: 15, fontWeight: '800', marginTop: 8 },
  problemText: { color: '#9A90AB', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 6 },
  problemButton: {
    backgroundColor: '#7C5CFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  problemButtonGhost: { backgroundColor: 'rgba(255,255,255,0.1)' },
  problemButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  activeTranslation: { color: '#E7E1F5', fontSize: 16, lineHeight: 23, marginTop: 5 },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    paddingBottom: 2,
  },
  transcriptTitle: { color: '#F5F2FF', fontSize: 15, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '70%' },
  statusText: { color: '#8D849D', fontSize: 11, flexShrink: 1 },
  cue: { paddingVertical: 9, paddingHorizontal: 8, borderRadius: 12 },
  cueActive: { backgroundColor: 'rgba(124,92,255,0.13)' },
  cueOriginal: { color: '#A79EB9', lineHeight: 25, fontWeight: '600' },
  cueOriginalActive: { color: '#C4B5FD', fontWeight: '800' },
  cueTranslation: { color: '#746B85', lineHeight: 20, marginTop: 3 },
  cueTranslationActive: { color: '#F1ECFA' },
  emptyTranscript: { alignItems: 'center', paddingTop: 36, gap: 10 },
  emptyTranscriptText: { color: '#8D849D', fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
  controls: { backgroundColor: '#120E1B', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#241C33', paddingHorizontal: 18, paddingTop: 10 },
  progressTouch: { height: 24, justifyContent: 'center' },
  progressRail: { height: 4, borderRadius: 2, backgroundColor: '#2B2340', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#8B72FF' },
  progressThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C4B5FD',
    marginLeft: -6,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timeText: { color: '#8A8099', fontSize: 11, fontVariant: ['tabular-nums'] },
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, paddingVertical: 8 },
  transportSmall: { width: 42, height: 38, alignItems: 'center', justifyContent: 'center' },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C5CFF',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  bottomActions: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 },
  action: { alignItems: 'center', gap: 3, minWidth: 56, paddingVertical: 4 },
  actionLabel: { color: '#8A8099', fontSize: 10, fontWeight: '600' },
  landscapeRoot: { flex: 1, backgroundColor: '#000000' },
  landscapeBack: {
    position: 'absolute',
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeTitle: {
    position: 'absolute',
    left: 70,
    right: 70,
    alignItems: 'center',
  },
  landscapeTitleText: { color: '#F5F2FF', fontSize: 15, fontWeight: '800' },
  landscapeAuthor: { color: '#A9A0BC', fontSize: 11, marginTop: 2 },
  landscapeMore: {
    position: 'absolute',
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeSubOriginal: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center', textShadowColor: '#000', textShadowRadius: 6 },
  landscapeSubTranslation: { color: '#E4DEF2', fontSize: 14, textAlign: 'center', marginTop: 3, textShadowColor: '#000', textShadowRadius: 6 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 120,
    backgroundColor: 'rgba(30,22,46,0.94)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  toastText: { color: '#F5F2FF', fontSize: 12 },
  sheetMask: { flex: 1, backgroundColor: 'rgba(4,2,8,0.6)', justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: '#151020',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#4A4058', marginBottom: 12 },
  sheetTitle: { color: '#F5F2FF', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  sheetGroup: {
    backgroundColor: '#1C1628',
    borderRadius: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2138',
    paddingVertical: 6,
  },
  sheetIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#271E3A', alignItems: 'center', justifyContent: 'center' },
  sheetRowTitle: { color: '#EFE9FA', fontSize: 14.5, fontWeight: '600' },
  sheetRowSubtitle: { color: '#817791', fontSize: 11, marginTop: 2 },
  sheetRowValue: { color: '#A99FBA', fontSize: 12 },
  switchPill: { width: 46, height: 27, borderRadius: 14, backgroundColor: '#332A44', padding: 3 },
  switchPillOn: { backgroundColor: '#7C5CFF' },
  switchKnob: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#FFFFFF' },
  switchKnobOn: { alignSelf: 'flex-end' },
  fontStepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2238', borderRadius: 10, height: 32 },
  stepButton: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' },
  fontStepValue: { color: '#D9D0EB', fontSize: 11, width: 36, textAlign: 'center' },
  errorTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
