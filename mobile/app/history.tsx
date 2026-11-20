import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '../src/core/store';
import { relativeTime } from '../src/core/utils';
import { NavHeader } from '../src/ui/components';
import { useAppTheme } from '../src/ui/theme';

export default function HistoryScreen() {
  const theme = useAppTheme();
  const history = useAppStore((state) => state.history);
  const clearHistory = useAppStore((state) => state.clearHistory);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <NavHeader
        title="历史记录"
        subtitle={`${history.length} 个最近打开的视频`}
        right={
          history.length ? (
            <Pressable
              hitSlop={8}
              onPress={() =>
                Alert.alert('清空历史', '确定清空全部观看记录吗？', [
                  { text: '取消', style: 'cancel' },
                  { text: '清空', style: 'destructive', onPress: clearHistory },
                ])
              }
            >
              <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>清空</Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800', marginTop: 12 }}>
              还没有观看记录
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 6, textAlign: 'center' }}>
              打开过的视频会自动出现在这里，方便继续学习。
            </Text>
          </View>
        ) : (
          history.map((item) => (
            <Pressable
              key={item.videoId}
              onPress={() =>
                router.push({
                  pathname: '/player',
                  params: { videoId: item.videoId, title: item.title, author: item.author },
                } as any)
              }
              style={({ pressed }) => ({ flexDirection: 'row', gap: 12, paddingVertical: 10, opacity: pressed ? 0.8 : 1 })}
            >
              <Image
                source={{ uri: item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` }}
                style={styles.thumb}
                contentFit="cover"
                transition={160}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700', lineHeight: 19 }} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11.5, marginTop: 5 }} numberOfLines={1}>
                  {item.author || 'YouTube'}
                </Text>
                <Text style={{ color: theme.colors.textTertiary, fontSize: 10.5, marginTop: 4 }}>
                  打开于 {relativeTime(item.savedAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} style={{ alignSelf: 'center' }} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 132, aspectRatio: 16 / 9, borderRadius: 11, backgroundColor: '#241C33' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
});
