import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '../../src/core/store';
import { relativeTime } from '../../src/core/utils';
import { useAppTheme } from '../../src/ui/theme';

export default function LearningScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const favorites = useAppStore((state) => state.favorites);
  const removeFavorite = useAppStore((state) => state.removeFavorite);
  const history = useAppStore((state) => state.history);

  const weekCount = favorites.filter((item) => Date.now() - item.savedAt < 7 * 86400000).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <LinearGradient
        pointerEvents="none"
        colors={['#241B39', '#100C18']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 18,
          paddingBottom: 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>学习</Text>
            <Text style={styles.subtitle}>把收藏的视频集中到这里，随时接着看</Text>
          </View>
          <Pressable
            onPress={() => router.push('/favorites' as any)}
            style={styles.headerIcon}
            hitSlop={8}
          >
            <Ionicons name="heart-outline" size={21} color="#C4B5FD" />
          </Pressable>
        </View>

        <View style={styles.statsCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statsLabel}>收藏视频</Text>
            <Text style={styles.statsValue}>{favorites.length}</Text>
            <Text style={styles.statsHint}>本周新增 {weekCount} 个</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statsLabel}>最近观看</Text>
            <Text style={styles.statsValue}>{history.length}</Text>
            <Text style={styles.statsHint}>按打开时间排序</Text>
          </View>
          <View style={styles.statsArt}>
            <Ionicons name="bookmark" size={34} color="#C4B5FD" />
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>我的收藏</Text>
          {favorites.length > 0 ? (
            <Text style={styles.sectionHint}>点卡片直接播放</Text>
          ) : null}
        </View>

        {favorites.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bookmark-outline" size={34} color="#A78BFA" />
            </View>
            <Text style={styles.emptyTitle}>还没有收藏</Text>
            <Text style={styles.emptyText}>
              在播放器里点“收藏”，视频会出现在这里；不用再翻订阅流去找。
            </Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push('/' as any)}>
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>去发现视频</Text>
            </Pressable>
          </View>
        ) : (
          favorites.map((item) => (
            <Pressable
              key={item.videoId}
              onPress={() =>
                router.push({
                  pathname: '/player',
                  params: { videoId: item.videoId, title: item.title, author: item.author },
                } as any)
              }
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.thumbWrap}>
                <Image
                  source={{ uri: item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.playBadge}>
                  <Ionicons name="play" size={15} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardAuthor} numberOfLines={1}>
                  {item.author || 'YouTube'}
                </Text>
                <Text style={styles.cardMeta}>收藏于 {relativeTime(item.savedAt)}</Text>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => removeFavorite(item.videoId)}
                style={styles.removeButton}
              >
                <Ionicons name="heart" size={19} color="#A78BFA" />
              </Pressable>
            </Pressable>
          ))
        )}

        {history.length > 0 ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>最近观看</Text>
              <Pressable onPress={() => router.push('/history' as any)}>
                <Text style={styles.more}>全部</Text>
              </Pressable>
            </View>
            {history.slice(0, 4).map((item) => (
              <Pressable
                key={`history-${item.videoId}`}
                onPress={() =>
                  router.push({
                    pathname: '/player',
                    params: { videoId: item.videoId, title: item.title, author: item.author },
                  } as any)
                }
                style={styles.historyRow}
              >
                <Image
                  source={{ uri: item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` }}
                  style={styles.historyThumb}
                  contentFit="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.historyMeta} numberOfLines={1}>
                    {item.author} · {relativeTime(item.savedAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#6F6580" />
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: '#F7F3FF', fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: '#A7A0B6', fontSize: 12.5, marginTop: 4 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    marginTop: 20,
    backgroundColor: 'rgba(32,24,48,0.92)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.16)',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsLabel: { color: '#948AA7', fontSize: 11, fontWeight: '600' },
  statsValue: { color: '#F5F2FF', fontSize: 28, fontWeight: '900', marginTop: 2 },
  statsHint: { color: '#7F7590', fontSize: 10.5, marginTop: 2 },
  statsDivider: { width: 1, height: 54, backgroundColor: '#302643', marginHorizontal: 16 },
  statsArt: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(124,92,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { color: '#F5F2FF', fontSize: 17, fontWeight: '800' },
  sectionHint: { color: '#837A93', fontSize: 11 },
  more: { color: '#A78BFA', fontSize: 12, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(28,22,40,0.9)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.12)',
    padding: 28,
    paddingHorizontal: 22,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: 'rgba(124,92,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: '#F5F2FF', fontSize: 17, fontWeight: '800' },
  emptyText: { color: '#A79EB8', fontSize: 12.5, lineHeight: 19, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#7C5CFF',
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 9,
    paddingRight: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(28,22,40,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
  },
  thumbWrap: { width: 132, aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: '#241C33' },
  playBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.66)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { color: '#F2ECFB', fontSize: 14, fontWeight: '700', lineHeight: 19 },
  cardAuthor: { color: '#A79EB8', fontSize: 11.5, marginTop: 4 },
  cardMeta: { color: '#7A7089', fontSize: 10, marginTop: 4 },
  removeButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2238',
  },
  historyThumb: { width: 100, aspectRatio: 16 / 9, borderRadius: 9, backgroundColor: '#241C33' },
  historyTitle: { color: '#EAE4F5', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  historyMeta: { color: '#817791', fontSize: 10.5, marginTop: 4 },
});
