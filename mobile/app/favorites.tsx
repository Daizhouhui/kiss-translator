import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '../src/core/store';
import { EmptyState, NavHeader } from '../src/ui/components';
import { useAppTheme } from '../src/ui/theme';

export default function FavoritesScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const favorites = useAppStore((state) => state.favorites);
  const removeFavorite = useAppStore((state) => state.removeFavorite);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <NavHeader title="我的收藏" subtitle={`${favorites.length} 个视频`} />
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.videoId}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/player',
                params: { videoId: item.videoId, title: item.title, author: item.author },
              } as any)
            }
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                backgroundColor: theme.colors.card,
                borderRadius: 16,
                padding: 10,
                marginBottom: 10,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.border,
                alignItems: 'center',
              }}
            >
              <View style={{ width: 112, aspectRatio: 16 / 9, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt }}>
                {item.thumbnail ? (
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={180}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: theme.colors.text, fontSize: 13.5, fontWeight: '700', lineHeight: 19 }} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.colors.textTertiary, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                  {item.author}
                </Text>
              </View>
              <Pressable
                onPress={() => removeFavorite(item.videoId)}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons name="heart" size={17} color={theme.colors.primary} />
              </Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="还没有收藏"
            desc="在播放器右上角点心形，喜欢的视频会留在这里。"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
