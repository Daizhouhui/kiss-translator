import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '../../src/core/store';
import { SubtitleMode, SubtitlePosition } from '../../src/core/types';
import { Card, NavHeader, SectionTitle, SettingSwitch } from '../../src/ui/components';
import { useAppTheme } from '../../src/ui/theme';

const MODES: { value: SubtitleMode; label: string; hint: string }[] = [
  { value: 'bilingual', label: '双语', hint: '原文 + 译文' },
  { value: 'original', label: '仅原文', hint: '只看英文' },
  { value: 'translation', label: '仅译文', hint: '只看中文' },
];

export default function SubtitleSettingsScreen() {
  const theme = useAppTheme();
  const subtitles = useAppStore((state) => state.settings.subtitle);
  const patchSettings = useAppStore((state) => state.patchSettings);

  const setSubtitle = (patch: Partial<typeof subtitles>) => {
    patchSettings({ subtitle: patch });
  };

  const sizeText = subtitles.fontSize;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <NavHeader title="字幕样式" subtitle="竖屏逐句稿与横屏字幕共用" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#241B38', '#0B0910']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, padding: 18, minHeight: 190, justifyContent: 'flex-end' }}
        >
          <View style={{ position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#8B72FF' }} />
            <Text style={{ color: 'rgba(255,255,255,.55)', fontSize: 10, fontWeight: '600' }}>字幕预览</Text>
          </View>

          <View
            style={{
              backgroundColor: `rgba(0,0,0,${subtitles.backgroundOpacity})`,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              alignSelf: 'stretch',
            }}
          >
            {subtitles.mode !== 'translation' ? (
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: sizeText,
                  lineHeight: sizeText * 1.35,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
                numberOfLines={3}
              >
                The strongest evidence we've found so far,
              </Text>
            ) : null}
            {subtitles.mode !== 'original' ? (
              <Text
                style={{
                  color: subtitles.mode === 'translation' ? '#FFFFFF' : '#C9BFFF',
                  fontSize: subtitles.mode === 'translation' ? sizeText : sizeText * 0.86,
                  lineHeight: sizeText * 1.3,
                  marginTop: subtitles.mode === 'bilingual' ? 4 : 0,
                  textAlign: 'center',
                }}
                numberOfLines={3}
              >
                迄今为止我们发现的最有力的证据，
              </Text>
            ) : null}
          </View>
        </LinearGradient>

        <SectionTitle title="显示模式" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {MODES.map((mode) => {
            const active = subtitles.mode === mode.value;
            return (
              <Pressable
                key={mode.value}
                onPress={() => setSubtitle({ mode: mode.value })}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: active ? theme.colors.primarySoft : theme.colors.card,
                  borderWidth: active ? 1 : StyleSheet.hairlineWidth,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: active ? theme.colors.primary : theme.colors.text,
                    fontSize: 13.5,
                    fontWeight: '700',
                  }}
                >
                  {mode.label}
                </Text>
                <Text style={{ color: theme.colors.textTertiary, fontSize: 10.5, marginTop: 3 }}>{mode.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle title="字号" />
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable
            onPress={() => setSubtitle({ fontSize: Math.max(14, subtitles.fontSize - 1) })}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 13,
              backgroundColor: theme.colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="remove" size={20} color={theme.colors.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '800' }}>{subtitles.fontSize}</Text>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 10.5, marginTop: 2 }}>
              横屏字幕字号 · 逐句稿同步
            </Text>
          </View>
          <Pressable
            onPress={() => setSubtitle({ fontSize: Math.min(30, subtitles.fontSize + 1) })}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 13,
              backgroundColor: theme.colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="add" size={20} color={theme.colors.text} />
          </Pressable>
        </Card>

        <SectionTitle title="位置与背景" />
        <Card style={{ paddingVertical: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 12 }}>
            {(['bottom', 'top'] as SubtitlePosition[]).map((position) => {
              const active = subtitles.position === position;
              return (
                <Pressable
                  key={position}
                  onPress={() => setSubtitle({ position })}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 11,
                    backgroundColor: active ? theme.colors.primarySoft : theme.colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: active ? theme.colors.primary : theme.colors.textSecondary,
                      fontSize: 12,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {position === 'bottom' ? '底部' : '顶部'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.colors.border,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11.5, fontWeight: '600', marginBottom: 9 }}>
              背景不透明度
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 0.3, 0.55, 0.8].map((opacity) => {
                const active = Math.abs(subtitles.backgroundOpacity - opacity) < 0.01;
                return (
                  <Pressable
                    key={opacity}
                    onPress={() => setSubtitle({ backgroundOpacity: opacity })}
                    style={{
                      flex: 1,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#fff' : theme.colors.textSecondary,
                        fontSize: 11,
                        fontWeight: active ? '700' : '500',
                      }}
                    >
                      {opacity === 0 ? '无' : `${Math.round(opacity * 100)}%`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        <SectionTitle title="显示内容" />
        <Card style={{ paddingVertical: 4 }}>
          <SettingRow
            title="在视频画面上显示字幕"
            desc="横屏全屏时叠加双语字幕"
            value={subtitles.showOnVideo}
            onChange={(value) => setSubtitle({ showOnVideo: value })}
          />
          <SettingRow
            title="显示逐句稿"
            desc="竖屏时按句高亮，方便跟读"
            value={subtitles.transcript}
            onChange={(value) => setSubtitle({ transcript: value })}
            last
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function SettingRow({
  title,
  desc,
  value,
  onChange,
  last,
}: {
  title: string;
  desc: string;
  value: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        gap: 12,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: theme.colors.textTertiary, fontSize: 11.5, marginTop: 3 }}>{desc}</Text>
      </View>
      <SettingSwitch value={value} onValueChange={onChange} />
    </View>
  );
}
