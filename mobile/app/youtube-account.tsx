import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { useAppStore } from '@/src/core/store';
import { Subscription } from '@/src/core/types';

const AnyWebView: any = WebView;

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

const LOGIN_URL = 'https://m.youtube.com/feed/channels?hl=zh-CN';

const LOGIN_EARLY = `
(function(){
  try {
    Object.defineProperty(navigator, 'webdriver', { get: function(){ return false; } });
    window.chrome = window.chrome || { runtime: {} };
    var ua = navigator.userAgent || '';
    if (ua.indexOf('wv') >= 0) {
      Object.defineProperty(navigator, 'userAgent', {
        get: function(){ return ua.replace(/; wv\\)/, ')').replace(/ wv\\./, '.'); }
      });
    }
  } catch(e) {}
})();
true;
`;

const CHANNEL_BRIDGE = `
(function(){
  function post(payload){ try{ window.ReactNativeWebView.postMessage(JSON.stringify(payload)); }catch(e){} }
  function textOf(value){
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value.simpleText) return value.simpleText;
    if (value.runs && value.runs.length) return value.runs.map(function(r){return r.text||'';}).join('');
    return '';
  }
  function thumbOf(value){
    try{
      if (value.thumbnail && value.thumbnail.thumbnails && value.thumbnail.thumbnails.length){
        var list=value.thumbnail.thumbnails;
        return list[list.length-1].url || '';
      }
    }catch(e){}
    return '';
  }
  function parseData(){
    var items=[];
    var seen={};
    function add(item){
      if(!item || !item.channelId) return;
      var id=String(item.channelId);
      if(id.indexOf('UC')!==0 || seen[id]) return;
      seen[id]=true;
      var title=textOf(item.title) || textOf(item.channelTitle) || '';
      if(!title) return;
      var handle='';
      try{
        var url=item.navigationEndpoint && item.navigationEndpoint.browseEndpoint &&
          item.navigationEndpoint.browseEndpoint.canonicalBaseUrl;
        if(url && url.charAt(0)==='@') handle=url;
      }catch(e){}
      items.push({ channelId:id, title:title, handle:handle, avatar:thumbOf(item) });
    }
    function walk(node, depth){
      if(!node || depth>10) return;
      if(Array.isArray(node)){ for(var i=0;i<node.length;i++) walk(node[i], depth+1); return; }
      if(typeof node!=='object') return;
      if(node.channelId && (node.title || node.channelTitle)) add(node);
      for(var key in node){
        if(key==='channelId'||key==='title'||key==='thumbnail'||key==='navigationEndpoint') continue;
        var value=node[key];
        if(value && typeof value==='object') walk(value, depth+1);
      }
    }
    try{ walk(window.ytInitialData, 0); }catch(e){}
    if(!items.length){
      try{
        var anchors=document.querySelectorAll('a[href^="/channel/UC"], a[href*="youtube.com/channel/UC"]');
        for(var j=0;j<anchors.length;j++){
          var href=anchors[j].getAttribute('href')||'';
          var match=href.match(/channel\\/(UC[^/?#]+)/);
          if(!match) continue;
          var id=match[1];
          if(seen[id]) continue;
          var container=anchors[j].closest('ytd-channel-renderer, ytm-channel-item-renderer, .channel-renderer, li') || anchors[j].parentElement;
          var titleEl=container && container.querySelector('#channel-title, .channel-title, yt-formatted-string, .title');
          var title=titleEl ? (titleEl.textContent||'').trim() : (anchors[j].textContent||'').trim();
          var img=container && container.querySelector('img');
          if(!title) continue;
          seen[id]=true;
          items.push({ channelId:id, title:title, handle:'', avatar:img?(img.src||''):'' });
        }
      }catch(e){}
    }
    post({ type:'channels', items:items, loggedIn: detectLogin(), count:items.length });
  }
  function detectLogin(){
    try{
      if(document.querySelector('a[href*="SignOutOptions"], #avatar-btn, ytm-account-button')) return true;
      var text=(document.body&&document.body.innerText||'').toLowerCase();
      if(text.indexOf('sign in')>=0 || text.indexOf('登录')>=0) return false;
      return true;
    }catch(e){ return false; }
  }
  function pageState(){
    var text='';
    try{ text=(document.body&&document.body.innerText||'').toLowerCase(); }catch(e){}
    var blocked = text.indexOf('disallowed_useragent')>=0 ||
      text.indexOf('此浏览器或应用可能不安全')>=0 ||
      text.indexOf('this browser or app may not be secure')>=0 ||
      text.indexOf('couldn\\'t sign you in')>=0 ||
      text.indexOf('无法登录')>=0;
    post({ type:'page', url:location.href, loggedIn:detectLogin(), blocked:blocked });
  }
  window.__kissExtractChannels = function(){
    var tries=0;
    post({type:'status', text:'正在加载频道列表…'});
    function step(){
      tries++;
      window.scrollTo(0, document.body.scrollHeight);
      if(tries<7){ setTimeout(step, 550); }
      else { setTimeout(parseData, 900); }
    }
    step();
    return true;
  };
  setTimeout(pageState, 900);
  setTimeout(pageState, 3500);
  true;
})();
true;
`;

type ExtractedChannel = {
  channelId: string;
  title: string;
  handle?: string;
  avatar?: string;
};

export default function YoutubeAccountScreen() {
  const insets = useSafeAreaInsets();
  const addSubscriptions = useAppStore((state) => state.addSubscriptions);
  const subscriptions = useAppStore((state) => state.subscriptions);
  const webRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('请在下方网页中登录 YouTube 账号');
  const [extracting, setExtracting] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [blockedByGoogle, setBlockedByGoogle] = useState(false);
  const [lastCount, setLastCount] = useState<number | null>(null);

  const extract = () => {
    setExtracting(true);
    setStatus('正在读取你的订阅频道…');
    webRef.current?.injectJavaScript('window.__kissExtractChannels && window.__kissExtractChannels(); true;');
  };

  const onMessage = (event: WebViewMessageEvent) => {
    let message: any = null;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (message?.type === 'status') {
      setStatus(String(message.text ?? ''));
      return;
    }
    if (message?.type === 'page') {
      if (typeof message.loggedIn === 'boolean') setLoggedIn(message.loggedIn);
      if (typeof message.blocked === 'boolean') setBlockedByGoogle(message.blocked);
      if (message.blocked) {
        setStatus('Google 拦截了应用内登录，请改用 CSV 导入订阅。');
      }
      return;
    }
    if (message?.type === 'channels') {
      setExtracting(false);
      if (typeof message.loggedIn === 'boolean') setLoggedIn(message.loggedIn);
      const incoming: Subscription[] = (message.items as ExtractedChannel[] | undefined ?? [])
        .filter((item) => item.channelId?.startsWith('UC') && item.title)
        .map((item) => ({
          channelId: item.channelId,
          title: item.title,
          handle: item.handle || undefined,
          avatar: item.avatar || undefined,
          addedAt: Date.now(),
        }));
      const before = subscriptions.length;
      addSubscriptions(incoming);
      const after = useAppStore.getState().subscriptions.length;
      const added = Math.max(0, after - before);
      setLastCount(incoming.length);
      setStatus(
        incoming.length === 0
          ? '没有读取到频道。请确认已登录，并停在“订阅频道”页面后重试。'
          : `读取到 ${incoming.length} 个频道，新增 ${added} 个。`
      );
      if (incoming.length > 0) {
        Alert.alert(
          '订阅已导入',
          `读取到 ${incoming.length} 个频道，新增 ${added} 个。已自动去重。`,
          [
            { text: '继续登录', style: 'cancel' },
            { text: '回到发现页', onPress: () => router.replace('/' as any) },
          ]
        );
      }
      return;
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top) }]}>
        <Pressable style={styles.iconButton} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#F5F2FF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>YouTube 账户</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {loggedIn ? '已检测到登录态' : '登录后可同步订阅，并使用账号播放权限'}
          </Text>
        </View>
        <View style={[styles.avatar, loggedIn && styles.avatarOn]}>
          <Ionicons name={loggedIn ? 'checkmark' : 'person'} size={18} color="#FFFFFF" />
        </View>
      </View>

      <View style={[styles.notice, blockedByGoogle && styles.noticeBlocked]}>
        <Ionicons
          name={blockedByGoogle ? 'alert-circle-outline' : 'information-circle-outline'}
          size={17}
          color={blockedByGoogle ? '#FF9D8A' : '#C4B5FD'}
        />
        <Text style={styles.noticeText}>
          {blockedByGoogle
            ? 'Google 不允许在应用内嵌网页里登录。可以在电脑/手机浏览器登录后导出订阅 CSV，再从这里导入；已登录的账号权限仍可在播放器里尝试。'
            : '先在这里登录 YouTube，再点“导入订阅”。登录成功的 Cookie 会与播放器共享；若 Google 提示“此浏览器或应用可能不安全”，用 CSV 导入即可。'}
        </Text>
      </View>

      <View style={styles.webCard}>
        <AnyWebView
          ref={webRef}
          source={{ uri: LOGIN_URL }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          userAgent={Platform.OS === 'ios' ? IOS_UA : ANDROID_UA}
          injectedJavaScript={LOGIN_EARLY + CHANNEL_BRIDGE}
          cacheEnabled
          javaScriptCanOpenWindowsAutomatically
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => {
            setLoading(false);
            webRef.current?.injectJavaScript(CHANNEL_BRIDGE);
          }}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={(request: any) => {
            const url = String(request.url || '');
            if (
              url.startsWith('about:') ||
              url.includes('youtube.com') ||
              url.includes('google.com') ||
              url.includes('gstatic.com') ||
              url.includes('googleusercontent.com')
            ) {
              return true;
            }
            Linking.openURL(url).catch(() => {});
            return false;
          }}
        />
        {loading ? (
          <View style={styles.webLoading} pointerEvents="none">
            <ActivityIndicator color="#A78BFA" />
            <Text style={styles.webLoadingText}>正在打开 YouTube…</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(14, insets.bottom) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.status} numberOfLines={2}>
            {status}
          </Text>
          {lastCount !== null ? (
            <Text style={styles.count}>上次读取 {lastCount} 个频道 · 当前共 {subscriptions.length} 个</Text>
          ) : null}
        </View>
        <Pressable
          style={[styles.importButton, extracting && { opacity: 0.6 }]}
          disabled={extracting}
          onPress={extract}
        >
          {extracting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.importText}>{extracting ? '读取中…' : '导入订阅'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0812' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingBottom: 10 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F5F2FF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: '#8D849D', fontSize: 11, marginTop: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(124,92,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarOn: { backgroundColor: '#2FB980' },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#1B1427', marginHorizontal: 14, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#2B223B' },
  noticeBlocked: { backgroundColor: '#2A1719', borderColor: '#63302F' },
  noticeText: { flex: 1, color: '#A99FBA', fontSize: 11.5, lineHeight: 17 },
  webCard: { flex: 1, backgroundColor: '#FFFFFF', marginHorizontal: 14, marginTop: 10, borderRadius: 18, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#FFFFFF' },
  webLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F0B17',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  webLoadingText: { color: '#A99FBA', fontSize: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  status: { color: '#C9C0DA', fontSize: 11.5, lineHeight: 16 },
  count: { color: '#7C728D', fontSize: 10, marginTop: 3 },
  importButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C5CFF', borderRadius: 14, height: 44, paddingHorizontal: 16 },
  importText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
