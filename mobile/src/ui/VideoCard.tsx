import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { VideoItem } from '../core/types';
import { formatTime, relativeTime } from '../core/utils';
import { useAppTheme } from './theme';

export function VideoCard({ item, onPress }: { item: VideoItem; onPress: () => void }) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const thumbWidth = Math.min(164, Math.max(128, width * 0.4));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.84 : 1,
        transform: [{ scale: pressed ? 0.995 : 1 }],
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 9,
      })}
    >
      <View
        style={{
          width: thumbWidth,
          aspectRatio: 16 / 9,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceAlt,
        }}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="play-circle-outline" size={30} color={theme.colors.textTertiary} />
          </View>
        )}
        <View style={styles.playDot}>
          <Ionicons name="play" size={11} color="#FFFFFF" />
        </View>
        {item.duration ? (
          <View style={styles.duration}>
            <Text style={styles.durationText}>{formatTime(item.duration)}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 14.5,
            fontWeight: '700',
            lineHeight: 19.5,
            letterSpacing: -0.1,
          }}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {item.translatedTitle ? (
          <Text
            style={{
              color: '#A78BFA',
              fontSize: 12,
              lineHeight: 17,
              marginTop: 3,
              fontWeight: '500',
            }}
            numberOfLines={2}
          >
            {item.translatedTitle}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 }}>
          {item.channelAvatar ? (
            <Image
              source={{ uri: item.channelAvatar }}
              style={{ width: 17, height: 17, borderRadius: 9 }}
              contentFit="cover"
              transition={120}
            />
          ) : null}
          <Text
            style={{ color: theme.colors.textSecondary, fontSize: 10.5, flexShrink: 1 }}
            numberOfLines={1}
          >
            {item.channelTitle}
          </Text>
          <Text style={{ color: theme.colors.textTertiary, fontSize: 10 }}>·</Text>
          <Text style={{ color: theme.colors.textTertiary, fontSize: 10 }}>
            {relativeTime(item.published)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  playDot: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.74)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '700' },
});
