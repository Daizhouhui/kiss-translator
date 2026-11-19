import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '../src/core/store';
import { Subscription } from '../src/core/types';
import { parseTakeoutCsv } from '../src/core/youtube/channel';
import { EmptyState, GhostButton, IconButton, NavHeader, PrimaryButton } from '../src/ui/components';
import { useAppTheme } from '../src/ui/theme';

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function SubscriptionsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const subscriptions = useAppStore((state) => state.subscriptions);
  const addSubscriptions = useAppStore((state) => state.addSubscriptions);
  const removeSubscription = useAppStore((state) => state.removeSubscription);
  const [busy, setBusy] = useState(false);

  const importCsv = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      const content = await FileSystem.readAsStringAsync(asset.uri);
      const parsed = parseTakeoutCsv(content);
      const before = new Set(subscriptions.map((sub) => sub.channelId));
      const fresh = parsed.filter((sub) => !before.has(sub.channelId));
      addSubscriptions(parsed);
      Alert.alert('导入完成', `识别 ${parsed.length} 个频道，其中新增 ${fresh.length} 个。`);
    } catch (error) {
      Alert.alert('导入失败', error instanceof Error ? error.message : String(error));
    }
  };

  const exportCsv = async () => {
    if (!subscriptions.length) {
      Alert.alert('还没有订阅', '先添加频道再导出。');
      return;
    }
    setBusy(true);
    try {
      const header = 'Channel ID,Channel Title,Channel URL';
      const lines = subscriptions.map((sub) => {
        const url = sub.handle
          ? `https://www.youtube.com/${sub.handle}`
          : `https://www.youtube.com/channel/${sub.channelId}`;
        return [sub.channelId, sub.title, url].map(csvEscape).join(',');
      });
      const csv = [header, ...lines].join('\n');
      const path = `${FileSystem.cacheDirectory}kiss-subscriptions.csv`;
      await FileSystem.writeAsStringAsync(path, csv);
      await Sharing.shareAsync(path, {
        mimeType: 'text/csv',
        dialogTitle: '导出 Kiss 字幕订阅',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error) {
      Alert.alert('导出失败', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (sub: Subscription) => {
    Alert.alert('取消订阅', `不再在首页显示「${sub.title}」？`, [
      { text: '取消', style: 'cancel' },
      { text: '移除', style: 'destructive', onPress: () => removeSubscription(sub.channelId) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <NavHeader
        title="订阅管理"
        subtitle={`${subscriptions.length} 个频道`}
        right={
          <IconButton
            name="add"
            bg={theme.colors.primary}
            color="#fff"
            onPress={() => router.push('/add-subscription' as any)}
          />
        }
      />
      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item.channelId}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: 18,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.border,
                padding: 16,
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                把订阅带走
              </Text>
              <Text style={{ color: theme.colors.textTertiary, fontSize: 12, lineHeight: 18, marginBottom: 14 }}>
                支持 YouTube Takeout 导出的 CSV，也可以随时导出备份。WebDAV 同步会自动合并两端频道。
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <GhostButton label="导入 CSV" icon="download-outline" onPress={importCsv} />
                <GhostButton label="导出 CSV" icon="share-outline" onPress={exportCsv} />
                {busy ? <Text style={{ color: theme.colors.textTertiary, fontSize: 11, alignSelf: 'center' }}>处理中…</Text> : null}
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: theme.colors.card,
              borderRadius: 16,
              padding: 12,
              marginBottom: 10,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.border,
            }}
          >
            {item.avatar ? (
              <Image
                source={{ uri: item.avatar }}
                style={{ width: 44, height: 44, borderRadius: 22 }}
                contentFit="cover"
                transition={180}
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '800' }}>
                  {item.title.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: theme.colors.text, fontSize: 14.5, fontWeight: '700' }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={{ color: theme.colors.textTertiary, fontSize: 11, marginTop: 3 }} numberOfLines={1}>
                {item.handle ?? item.channelId}
              </Text>
            </View>
            <Pressable
              onPress={() => confirmRemove(item)}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.surfaceAlt,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="albums-outline"
            title="还没有订阅"
            desc="添加频道，或用 YouTube Takeout 的 CSV 一次性导入。"
            action={
              <PrimaryButton
                label="添加第一个频道"
                icon="add"
                onPress={() => router.push('/add-subscription' as any)}
                style={{ width: 210 }}
              />
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
