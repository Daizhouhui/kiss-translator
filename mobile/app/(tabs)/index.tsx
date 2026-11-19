import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '../../src/core/store';
import { relativeTime } from '../../src/core/utils';
import { useFeed } from '../../src/hooks/useFeed';
import { IconButton, PrimaryButton } from '../../src/ui/components';
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

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
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
  }, [filter, items, query]);

  const header = (
    <View>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: theme.colors.text, fontSize: 29, fontWeight: '800', letterSpacing: -0.9 }}>
              Kiss 字幕
            </Text>
            <View
              style={{
                backgroundColor: theme.colors.primarySoft,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 7,
              }}
            >
              <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>
                BETA
              </Text>
            </View>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12.5, marginTop: 4 }}>
            在 YouTube 里，读懂每一句话
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <IconButton
            name="albums-outline"
            bg={theme.colors.card}
            color={theme.colors.text}
            onPress={() => router.push('/subscriptions' as any)}
          />
          <IconButton
            name="add"
            bg={theme.colors.primary}
            color="#fff"
            onPress={() => router.push('/add-subscription' as any)}
          />
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
          placeholder="搜索视频或频道"
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
          paddingBottom: 24,
          flexGrow: 1,
        }}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 14 }}>
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
});
