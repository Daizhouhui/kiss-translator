import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { targetLabel } from '../../src/core/defaults';
import { useAppStore } from '../../src/core/store';
import { syncNow } from '../../src/core/sync';
import { relativeTime } from '../../src/core/utils';
import { Card, Header, Row, SectionTitle } from '../../src/ui/components';
import { useAppTheme } from '../../src/ui/theme';

const THEMES = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
] as const;

const SUBTITLE_LABELS: Record<string, string> = {
  bilingual: '双语',
  original: '仅原文',
  translation: '仅译文',
};

export default function MeScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const settings = useAppStore((state) => state.settings);
  const patchSettings = useAppStore((state) => state.patchSettings);
  const subscriptions = useAppStore((state) => state.subscriptions);
  const favorites = useAppStore((state) => state.favorites);
  const lastSyncAt = useAppStore((state) => state.lastSyncAt);
  const syncState = useAppStore((state) => state.syncState);
  const [syncing, setSyncing] = useState(false);

  const providerLabel =
    settings.provider === 'auto'
      ? '自动 · 免费优先'
      : {
          microsoft: '微软翻译',
          google: '谷歌翻译',
          deepseek: 'DeepSeek',
          siliconflow: 'SiliconFlow',
          openai: 'OpenAI 兼容',
        }[settings.provider] ?? settings.provider;

  const runSync = async () => {
    if (!settings.webdav.enabled) {
      router.push('/settings/webdav' as any);
      return;
    }
    setSyncing(true);
    try {
      const message = await syncNow();
      Alert.alert('同步完成', message);
    } catch (error) {
      Alert.alert('同步失败', error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 18,
          paddingBottom: 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Header title="我的" subtitle="翻译、订阅与同步，都在这里" />

        <LinearGradient
          colors={['#8B72FF', '#6C4DF6', '#5336D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1.1, y: 1.2 }}
          style={styles.hero}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.logo}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>K</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800', letterSpacing: -0.4 }}>
                Kiss 字幕
              </Text>
              <Text style={{ color: 'rgba(255,255,255,.72)', fontSize: 12, marginTop: 3 }}>
                把 YouTube 变成你的双语课堂
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,.16)',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                v{Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 22 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statValue}>{subscriptions.length}</Text>
              <Text style={styles.statLabel}>订阅频道</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statValue}>
                {settings.webdav.enabled ? (syncState === 'error' ? '异常' : '已开启') : '未开启'}
              </Text>
              <Text style={styles.statLabel}>WebDAV 同步</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statValue}>{targetLabel(settings.targetLang)}</Text>
              <Text style={styles.statLabel}>目标语言</Text>
            </View>
          </View>
        </LinearGradient>

        <SectionTitle title="翻译与字幕" />
        <Card style={{ paddingVertical: 2, paddingHorizontal: 16 }}>
          <Row
            icon="language-outline"
            title="翻译引擎"
            subtitle={settings.autoFallbackDeepSeek ? '失败时自动切 DeepSeek' : '仅使用所选引擎'}
            value={providerLabel}
            onPress={() => router.push('/settings/translation' as any)}
          />
          <Row
            icon="globe-outline"
            title="目标语言"
            value={targetLabel(settings.targetLang)}
            onPress={() => router.push('/settings/translation' as any)}
          />
          <Row
            icon="text-outline"
            title="字幕样式"
            value={SUBTITLE_LABELS[settings.subtitle.mode]}
            onPress={() => router.push('/settings/subtitle' as any)}
            last
          />
        </Card>

        <SectionTitle title="数据" />
        <Card style={{ paddingVertical: 2, paddingHorizontal: 16 }}>
          <Row
            icon="heart-outline"
            title="我的收藏"
            subtitle="播放器里点过心形的视频"
            value={`${favorites.length} 个`}
            onPress={() => router.push('/favorites' as any)}
          />
          <Row
            icon="albums-outline"
            title="订阅管理"
            subtitle="添加、导入或导出频道"
            value={`${subscriptions.length} 个`}
            onPress={() => router.push('/subscriptions' as any)}
          />
          <Row
            icon="cloud-outline"
            title="WebDAV 同步"
            subtitle={lastSyncAt ? `上次同步 ${relativeTime(lastSyncAt)}` : '与 Koofr 等网盘同步订阅和设置'}
            value={settings.webdav.enabled ? '已启用' : '未配置'}
            onPress={() => router.push('/settings/webdav' as any)}
            last={!settings.webdav.enabled}
          />
          {settings.webdav.enabled ? (
            <Pressable
              onPress={runSync}
              disabled={syncing}
              style={({ pressed }) => ({
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                opacity: pressed || syncing ? 0.6 : 1,
              })}
            >
              {syncing || syncState === 'syncing' ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons name="sync" size={17} color={theme.colors.primary} />
              )}
              <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '700' }}>
                {syncing ? '正在同步…' : '立即同步'}
              </Text>
            </Pressable>
          ) : null}
        </Card>

        <SectionTitle title="外观" />
        <Card>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {THEMES.map((item) => {
              const active = settings.theme === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => patchSettings({ theme: item.value })}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceAlt,
                  }}
                >
                  <Text
                    style={{
                      color: active ? theme.colors.primary : theme.colors.textSecondary,
                      fontSize: 12.5,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionTitle title="其他" />
        <Card style={{ paddingVertical: 2, paddingHorizontal: 16 }}>
          <Row
            icon="sparkles-outline"
            title="关于 Kiss 字幕"
            subtitle="基于 Kiss Translator 的移动端双语播放器"
            onPress={() => router.push('/settings/about' as any)}
          />
          <Row
            icon="logo-github"
            title="GitHub 仓库"
            subtitle="查看源码、构建与更新"
            onPress={() => Linking.openURL('https://github.com/Daizhouhui/kiss-translator')}
          />
          <Row
            icon="document-text-outline"
            title="开源协议"
            value="GPL-3.0"
            onPress={() => Linking.openURL('https://www.gnu.org/licenses/gpl-3.0.html')}
            last
          />
        </Card>

        <Text
          style={{
            color: theme.colors.textTertiary,
            fontSize: 11,
            textAlign: 'center',
            marginTop: 26,
            lineHeight: 17,
          }}
        >
          为小屏幕重做阅读节奏 · 不跟踪、不广告
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,.28)',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,.66)',
    fontSize: 10.5,
    marginTop: 3,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,.22)',
    marginHorizontal: 12,
  },
});
