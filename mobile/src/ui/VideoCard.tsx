import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VideoItem } from '../core/types';
import { formatTime, relativeTime } from '../core/utils';
import { useAppTheme } from './theme';

export function VideoCard({
  item,
  onPress,
}: {
  item: VideoItem;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.995 : 1 }],
      })}
    >
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: 20,
          padding: 10,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          ...theme.shadow.card,
        }}
      >
        <View
          style={{
            aspectRatio: 16 / 9,
            borderRadius: 14,
            overflow: 'hidden',
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={220}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play-circle-outline" size={38} color={theme.colors.textTertiary} />
            </View>
          )}
          {item.duration ? (
            <View
              style={{
                position: 'absolute',
                right: 8,
                bottom: 8,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: 'rgba(0,0,0,.72)',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                {formatTime(item.duration)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 4, paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            {item.channelAvatar ? (
              <Image
                source={{ uri: item.channelAvatar }}
                style={{ width: 22, height: 22, borderRadius: 11 }}
                contentFit="cover"
                transition={160}
              />
            ) : (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: '800' }}>
                  {(item.channelTitle || '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <Text
              style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', flexShrink: 1 }}
              numberOfLines={1}
            >
              {item.channelTitle}
            </Text>
            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.textTertiary }} />
            <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>{relativeTime(item.published)}</Text>
          </View>

          <Text
            style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22, letterSpacing: -0.2 }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.translatedTitle ? (
            <Text
              style={{ color: theme.colors.primary, fontSize: 13, lineHeight: 19, marginTop: 5, fontWeight: '500' }}
              numberOfLines={2}
            >
              {item.translatedTitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
