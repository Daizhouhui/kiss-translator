import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { targetLabel } from '../../src/core/defaults';
import { useAppStore } from '../../src/core/store';
import { syncNow } from '../../src/core/sync';
import { relativeTime } from '../../src/core/utils';
import { useAppTheme } from '../../src/ui/theme';

const SUBTITLE_LABELS: Record<string, string> = {
  bilingual: '双语',
  original: '仅原文',
  translation: '仅译文',
};

function MeRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  danger,
  last,
  showChevron = true,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
  showChevron?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.055)' },
        pressed && onPress ? { opacity: 0.68 } : null,
      ]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={21} color={danger ? '#FF7A7A' : '#C4B5FD'} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: danger ? '#FF8A8A' : '#F1ECFA',
            fontSize: 14.5,
            fontWeight: '600',
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: '#817791', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={{ color: '#998FAA', fontSize: 12, marginLeft: 8, maxWidth: 128 }} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={16} color="#6F6580" style={{ marginLeft: 6 }} />
      ) : null}
    </Pressable>
  );
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

export default function MeScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const settings = useAppStore((state) => state.settings);
  const subscriptions = useAppStore((state) => state.subscriptions);
  const favorites = useAppStore((state) => state.favorites);
  const historyCount = useAppStore((state) => state.history.length);
  const lastSyncAt = useAppStore((state) => state.lastSyncAt);
  const syncState = useAppStore((state) => state.syncState);
  const [syncing, setSyncing] = useState(false);

  const providerLabel =
    settings.provider === 'auto'
      ? '自动 · 免费优先'
      : {
          microsoft: '微语',
          google: '谷歌',
          deepseek: 'DeepSeek',
          siliconflow: 'SiliconFlow',
          openai: 'OpenAI',
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
          paddingTop: insets.top + 10,
          paddingHorizontal: 18,
          paddingBottom: 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>我的</Text>
            <Text style={styles.subtitle}>账户、学习记录与播放设置</Text>
          </View>
          <View style={styles.betaPill}>
            <Ionicons name="sparkles" size={13} color="#C4B5FD" />
            <Text style={styles.betaText}>BETA</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.accountCard, pressed && { opacity: 0.9 }]}
          onPress={() => router.push('/youtube-account' as any)}
        >
          <View style={styles.accountAvatar}>
            <Ionicons name="logo-youtube" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.accountTitle}>登录 YouTube</Text>
            <Text style={styles.accountText}>
              {subscriptions.length
                ? `已订阅 ${subscriptions.length} 个频道 · 同步账号播放权限`
                : '同步你的订阅频道，尽量解锁高清与账号限定内容'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color="#8E84A1" />
        </Pressable>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{subscriptions.length}</Text>
            <Text style={styles.statLabel}>订阅</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{favorites.length}</Text>
            <Text style={styles.statLabel}>收藏</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{historyCount}</Text>
            <Text style={styles.statLabel}>看过</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{settings.webdav.enabled ? '开' : '关'}</Text>
            <Text style={styles.statLabel}>同步</Text>
          </View>
        </View>

        <Group title="账户与内容">
          <MeRow
            icon="person-circle-outline"
            title="账户"
            subtitle="YouTube 登录、头像与订阅同步"
            onPress={() => router.push('/youtube-account' as any)}
          />
          <MeRow
            icon="time-outline"
            title="历史记录"
            value={`${historyCount} 条`}
            onPress={() => router.push('/history' as any)}
          />
          <MeRow
            icon="bookmark-outline"
            title="学习与收藏"
            subtitle="集中查看收藏的视频"
            value={`${favorites.length} 个`}
            onPress={() => router.push('/learning' as any)}
          />
          <MeRow
            icon="albums-outline"
            title="订阅管理"
            subtitle="添加、导入 CSV 或导出频道"
            value={`${subscriptions.length} 个`}
            onPress={() => router.push('/subscriptions' as any)}
            last
          />
        </Group>

        <Group title="翻译与字幕">
          <MeRow
            icon="color-wand-outline"
            title="翻译引擎"
            value={providerLabel}
            onPress={() => router.push('/settings/translation' as any)}
          />
          <MeRow
            icon="globe-outline"
            title="语言设置"
            value={targetLabel(settings.targetLang)}
            onPress={() => router.push('/settings/translation' as any)}
          />
          <MeRow
            icon="text-outline"
            title="字幕样式"
            value={`${SUBTITLE_LABELS[settings.subtitle.mode]} · ${settings.subtitle.fontSize}px`}
            onPress={() => router.push('/settings/subtitle' as any)}
            last
          />
        </Group>

        <Group title="播放与同步">
          <MeRow
            icon="cloud-outline"
            title="WebDAV 同步"
            subtitle={lastSyncAt ? `上次同步 ${relativeTime(lastSyncAt)}` : '与 Koofr 等网盘同步订阅和设置'}
            value={settings.webdav.enabled ? (syncState === 'error' ? '异常' : '已开启') : '未配置'}
            onPress={() => router.push('/settings/webdav' as any)}
          />
          {settings.webdav.enabled ? (
            <Pressable onPress={runSync} disabled={syncing} style={({ pressed }) => [styles.syncRow, pressed && { opacity: 0.7 }]}>
              {syncing || syncState === 'syncing' ? (
                <ActivityIndicator size="small" color="#C4B5FD" />
              ) : (
                <Ionicons name="sync-outline" size={17} color="#C4B5FD" />
              )}
              <Text style={{ color: '#C4B5FD', fontSize: 12.5, fontWeight: '700' }}>
                {syncing ? '正在同步…' : '立即同步'}
              </Text>
            </Pressable>
          ) : null}
        </Group>

        <Group title="其他">
          <MeRow
            icon="share-social-outline"
            title="分享"
            onPress={() =>
              Share.share({
                message: 'Kiss 字幕：在 YouTube 里读懂每一句话。https://github.com/Daizhouhui/kiss-translator',
              }).catch(() => {})
            }
          />
          <MeRow
            icon="chatbubble-ellipses-outline"
            title="反馈问题"
            onPress={() => Linking.openURL('https://github.com/Daizhouhui/kiss-translator/issues').catch(() => {})}
          />
          <MeRow
            icon="information-circle-outline"
            title="关于"
            value="1.1.0"
            onPress={() => router.push('/settings/about' as any)}
            last
          />
        </Group>

        <Text style={styles.footerText}>Kiss 字幕 · 把 YouTube 变成你的双语课堂</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { color: '#F7F3FF', fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: '#A7A0B6', fontSize: 12.5, marginTop: 4 },
  betaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
    backgroundColor: 'rgba(124,92,255,0.08)',
  },
  betaText: { color: '#C4B5FD', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 },
  accountCard: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1B1427',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.2)',
    padding: 14,
  },
  accountAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#7C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitle: { color: '#F5F2FF', fontSize: 15.5, fontWeight: '800' },
  accountText: { color: '#948AA7', fontSize: 11.5, marginTop: 3, lineHeight: 16 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(27,20,39,0.9)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A2238',
    paddingVertical: 13,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#F1ECFA', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#817791', fontSize: 10, marginTop: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: '#2E2440' },
  groupTitle: { color: '#817791', fontSize: 11, fontWeight: '700', marginLeft: 4, marginBottom: 8, letterSpacing: 0.3 },
  groupCard: {
    backgroundColor: 'rgba(27,20,39,0.92)',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A2238',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: 14, gap: 6, paddingVertical: 7 },
  rowIcon: { width: 32, alignItems: 'flex-start' },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 2 },
  footerText: { color: '#5F566E', fontSize: 10.5, textAlign: 'center', marginTop: 26 },
});
