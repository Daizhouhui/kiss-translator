import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '../../src/core/store';
import { relativeTime } from '../../src/core/utils';
import { useFeed } from '../../src/hooks/useFeed';
import { PrimaryButton } from '../../src/ui/components';
import { useAppTheme } from '../../src/ui/theme';
import { VideoCard } from '../../src/ui/VideoCard';

type Filter = 'all' | 'week';

export default function HomeScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const subscriptions = useAppStore((state) => state.subscriptions);
  const { items, loading, refreshing, updatedAt, refresh } = useFeed();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [channelFilter, setChannelFilter] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (channelFilter && item.channelId !== channelFilter) return false;
      if (filter === 'week' && Date.now() - item.published > 7 * 24 * 60 * 60 * 1000) {
        return false;
      }
      if (!needle) return true;
      return (
        item.title.toLowerCase().includes(needle) ||
        item.channelTitle.toLowerCase().includes(needle) ||
        (item.translatedTitle ?? '').toLowerCase().includes(needle)
      );
    });
  }, [channelFilter, filter, items, query]);

  const header = (
    <View>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.9 }}>
            发现
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12.5, marginTop: 4 }}>
            订阅更新 · 点开就能看双语字幕
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => router.push('/subscriptions' as any)}
            style={({ pressed }) => [styles.circleButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="albums-outline" size={19} color="#C4B5FD" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/add-subscription' as any)}
            style={({ pressed }) => [styles.circleButton, styles.circleButtonPrimary, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          backgroundColor: theme.colors.card,
          borderRadius: 16,
          paddingHorizontal: 14,
          height: 48,
          marginTop: 18,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        }}
      >
        <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索 YouTube"
          placeholderTextColor={theme.colors.textTertiary}
          style={{ flex: 1, color: theme.colors.text, fontSize: 14, height: '100%' }}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 14, gap: 8 }}>
        {(['all', 'week'] as Filter[]).map((value) => {
          const active = filter === value;
          return (
            <Pressable
              key={value}
              onPress={() => setFilter(value)}
              style={{
                paddingHorizontal: 14,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? theme.colors.primarySoft : 'transparent',
                borderWidth: active ? 0 : StyleSheet.hairlineWidth,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  color: active ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: 12,
                  fontWeight: active ? '700' : '500',
                }}
              >
                {value === 'all' ? '全部' : '7 天内'}
              </Text>
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        {updatedAt ? (
          <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>{relativeTime(updatedAt)}更新</Text>
        ) : null}
      </View>

      {subscriptions.length > 0 ? (
        <View style={{ marginTop: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>我的频道</Text>
            <Pressable onPress={() => router.push('/subscriptions' as any)} hitSlop={8}>
              <Text style={{ color: '#A78BFA', fontSize: 11.5, fontWeight: '700' }}>
                管理频道
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14, paddingRight: 4, paddingBottom: 4 }}
          >
            <Pressable
              onPress={() => setChannelFilter('')}
              style={{ alignItems: 'center', width: 56 }}
            >
              <View
                style={[
                  styles.channelAvatar,
                  { backgroundColor: theme.colors.surfaceAlt, borderColor: 'transparent' },
                  !channelFilter && { borderColor: '#A78BFA' },
                ]}
              >
                <Ionicons name="grid-outline" size={20} color={!channelFilter ? '#C4B5FD' : '#8D849D'} />
              </View>
              <Text style={{ color: !channelFilter ? '#C4B5FD' : '#8D849D', fontSize: 10, marginTop: 5 }} numberOfLines={1}>
                全部
              </Text>
            </Pressable>
            {subscriptions.slice(0, 15).map((sub) => {
              const active = channelFilter === sub.channelId;
              return (
                <Pressable
                  key={sub.channelId}
                  onPress={() => setChannelFilter(active ? '' : sub.channelId)}
                  style={{ alignItems: 'center', width: 56 }}
                >
                  <View
                    style={[
                      styles.channelAvatar,
                      active ? { borderColor: '#A78BFA' } : { borderColor: 'rgba(255,255,255,0.08)' },
                    ]}
                  >
                    {sub.avatar ? (
                      <Image
                        source={{ uri: sub.avatar }}
                        style={{ width: 50, height: 50, borderRadius: 25 }}
                        contentFit="cover"
                        transition={160}
                      />
                    ) : (
                      <Text style={{ color: '#C4B5FD', fontSize: 17, fontWeight: '900' }}>
                        {(sub.title || '?').slice(0, 1).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{ color: active ? '#C4B5FD' : theme.colors.textSecondary, fontSize: 10, marginTop: 5 }}
                    numberOfLines={1}
                  >
                    {sub.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <LinearGradient
        pointerEvents="none"
        colors={theme.dark ? ['#1D1730', theme.colors.bg] : ['#EEE7FF', theme.colors.bg]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
      />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.videoId}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 18,
          paddingBottom: 110,
          flexGrow: 1,
        }}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 2 }}>
            <VideoCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/player',
                  params: {
                    videoId: item.videoId,
                    title: item.title,
                    author: item.channelTitle,
                  },
                } as any)
              }
            />
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: 30, alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>正在拉取订阅视频…</Text>
            </View>
          ) : subscriptions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 46, paddingHorizontal: 24 }}>
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 18,
                }}
              >
                <Ionicons name="logo-youtube" size={36} color={theme.colors.primary} />
              </View>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', marginBottom: 7 }}>
                从第一个频道开始
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 13,
                  lineHeight: 20,
                  textAlign: 'center',
                  marginBottom: 22,
                }}
              >
                添加你常看的 YouTube 频道，首页会按更新时间汇总，点开即可看双语字幕。
              </Text>
              <PrimaryButton
                label="添加频道"
                icon="add"
                onPress={() => router.push('/add-subscription' as any)}
                style={{ width: 200 }}
              />
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 46 }}>
              <Ionicons name="search-outline" size={32} color={theme.colors.textTertiary} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 12 }}>
                没有找到匹配的视频
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          !loading && visible.length > 0 ? (
            <Text style={{ color: theme.colors.textTertiary, fontSize: 11, textAlign: 'center', paddingTop: 10 }}>
              已加载 {visible.length} 个视频 · 下拉刷新
            </Text>
          ) : (
            <View />
          )
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonPrimary: {
    backgroundColor: '#7C5CFF',
    borderColor: 'rgba(167,139,250,0.4)',
  },
  channelAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: '#231B32',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
