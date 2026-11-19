import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppStore } from '../src/core/store';
import { Subscription } from '../src/core/types';
import { resolveChannelInput } from '../src/core/youtube/channel';
import { GhostButton, NavHeader, PrimaryButton } from '../src/ui/components';
import { useAppTheme } from '../src/ui/theme';

export default function AddSubscriptionScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const addSubscription = useAppStore((state) => state.addSubscription);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Subscription | null>(null);
  const [error, setError] = useState('');

  const onChange = (value: string) => {
    setInput(value);
    setPreview(null);
    setError('');
  };

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) onChange(text.trim());
  };

  const resolve = async () => {
    if (!input.trim()) {
      setError('请先粘贴频道链接或 @handle');
      return;
    }
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const channel = await resolveChannelInput(input);
      setPreview(channel);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const subscribe = () => {
    if (!preview) return;
    addSubscription(preview);
    Alert.alert('已添加', `「${preview.title}」已加入首页订阅。`);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <NavHeader title="添加频道" subtitle="支持频道、视频链接与 Takeout CSV" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 20,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.border,
              padding: 18,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 11,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="link-outline" size={17} color={theme.colors.primary} />
              </View>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700' }}>
                粘贴频道地址
              </Text>
            </View>

            <TextInput
              value={input}
              onChangeText={onChange}
              placeholder="https://youtube.com/@handle"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={{
                minHeight: 74,
                borderRadius: 14,
                backgroundColor: theme.colors.surfaceAlt,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: theme.colors.text,
                fontSize: 14,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <GhostButton label="从剪贴板粘贴" icon="clipboard-outline" onPress={paste} />
              {input ? <GhostButton label="清空" icon="close-outline" onPress={() => onChange('')} /> : null}
            </View>

            {error ? (
              <Text style={{ color: theme.colors.danger, fontSize: 12, lineHeight: 18, marginTop: 10 }}>{error}</Text>
            ) : null}

            <PrimaryButton
              label={preview ? '重新识别' : '识别频道'}
              icon="search-outline"
              loading={loading}
              onPress={resolve}
              style={{ marginTop: 16 }}
            />
          </View>

          <Text
            style={{
              color: theme.colors.textTertiary,
              fontSize: 11.5,
              lineHeight: 18,
              marginTop: 12,
              paddingHorizontal: 4,
            }}
          >
            支持 youtube.com/@handle、youtube.com/channel/UC…、单个视频链接；也可以直接输入 @handle 或 UC 频道 ID。
          </Text>

          {preview ? (
            <View
              style={{
                marginTop: 20,
                backgroundColor: theme.colors.card,
                borderRadius: 20,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.border,
                padding: 18,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {preview.avatar ? (
                  <Image
                    source={{ uri: preview.avatar }}
                    style={{ width: 62, height: 62, borderRadius: 31 }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 31,
                      backgroundColor: theme.colors.primarySoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: theme.colors.primary, fontSize: 22, fontWeight: '900' }}>
                      {preview.title.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '800' }} numberOfLines={2}>
                    {preview.title}
                  </Text>
                  <Text style={{ color: theme.colors.textTertiary, fontSize: 11.5, marginTop: 4 }} numberOfLines={1}>
                    {preview.handle ?? preview.channelId}
                  </Text>
                </View>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: theme.colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" size={17} color={theme.colors.primary} />
                </View>
              </View>

              <PrimaryButton label="订阅这个频道" icon="add" onPress={subscribe} style={{ marginTop: 18 }} />
            </View>
          ) : null}

          <Pressable
            onPress={() => router.push('/subscriptions' as any)}
            style={({ pressed }) => ({
              marginTop: 22,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="download-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12.5, fontWeight: '600' }}>
              用 CSV 批量导入
            </Text>
          </Pressable>

          {loading ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 18, gap: 8 }}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>正在打开频道主页…</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
