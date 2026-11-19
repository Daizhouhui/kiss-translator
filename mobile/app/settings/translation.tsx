import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PROVIDER_HINTS, TARGET_LANGUAGES } from '../../src/core/defaults';
import { getSecret, setSecret } from '../../src/core/secrets';
import { useAppStore } from '../../src/core/store';
import { ProviderId } from '../../src/core/types';
import { testTranslation } from '../../src/core/translate';
import { Card, NavHeader, SectionTitle, SettingSwitch } from '../../src/ui/components';
import { useAppTheme } from '../../src/ui/theme';

type Engine = {
  id: ProviderId;
  title: string;
  desc: string;
  icon: any;
  color: string;
  badge?: string;
};

const FREE: Engine[] = [
  {
    id: 'auto',
    title: '自动 · 免费优先',
    desc: '微软 → 谷歌 → DeepSeek 依次尝试',
    icon: 'flash',
    color: '#6C4DF6',
    badge: '推荐',
  },
  {
    id: 'microsoft',
    title: '微软翻译',
    desc: 'Edge 免费接口 · 无需 Key',
    icon: 'logo-windows',
    color: '#2563EB',
    badge: '免费',
  },
  {
    id: 'google',
    title: '谷歌翻译',
    desc: '网页免费接口 · 国内需代理',
    icon: 'logo-google',
    color: '#EA4335',
    badge: '免费',
  },
];

const AI: Engine[] = [
  {
    id: 'deepseek',
    title: 'DeepSeek',
    desc: '字幕翻译质量最好，按 token 计费',
    icon: 'sparkles',
    color: '#12B886',
    badge: '推荐',
  },
  {
    id: 'siliconflow',
    title: 'SiliconFlow',
    desc: '国内直连，可选免费模型',
    icon: 'layers',
    color: '#0EA5A4',
    badge: '需 Key',
  },
  {
    id: 'openai',
    title: 'OpenAI 兼容',
    desc: '任意兼容接口，自填 Base URL',
    icon: 'chatbubble-ellipses',
    color: '#111827',
    badge: '需 Key',
  },
];

export default function TranslationSettingsScreen() {
  const theme = useAppTheme();
  const settings = useAppStore((state) => state.settings);
  const patchSettings = useAppStore((state) => state.patchSettings);
  const [provider, setProvider] = useState<ProviderId>(settings.provider);
  const [deepseekKey, setDeepseekKey] = useState('');
  const [siliconflowKey, setSiliconflowKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    Promise.all([getSecret('deepseek'), getSecret('siliconflow'), getSecret('openai')]).then(
      ([a, b, c]) => {
        setDeepseekKey(a);
        setSiliconflowKey(b);
        setOpenaiKey(c);
      }
    );
  }, []);

  const selectProvider = (id: ProviderId) => {
    setProvider(id);
    patchSettings({ provider: id });
  };

  const saveKeys = async () => {
    await Promise.all([
      setSecret('deepseek', deepseekKey.trim()),
      setSecret('siliconflow', siliconflowKey.trim()),
      setSecret('openai', openaiKey.trim()),
    ]);
    patchSettings({ provider });
    Alert.alert('已保存', '翻译引擎与密钥已更新。');
  };

  const test = async () => {
    const target = provider === 'auto' ? 'microsoft' : provider;
    setTesting(true);
    try {
      // The test must use the key currently typed in the field, not the one
      // that happened to be saved before the user started editing.
      if (provider === 'deepseek') await setSecret('deepseek', deepseekKey.trim());
      if (provider === 'siliconflow') await setSecret('siliconflow', siliconflowKey.trim());
      if (provider === 'openai') await setSecret('openai', openaiKey.trim());
      const text = await testTranslation(target);
      Alert.alert('连接成功', `返回：${text}`);
    } catch (error) {
      Alert.alert('连接失败', error instanceof Error ? error.message : String(error));
    } finally {
      setTesting(false);
    }
  };

  const renderEngine = (engine: Engine, last: boolean) => {
    const active = provider === engine.id;
    return (
      <Pressable
        key={engine.id}
        onPress={() => selectProvider(engine.id)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 13,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: active ? theme.colors.primarySoft : theme.colors.card,
          borderWidth: active ? 1 : StyleSheet.hairlineWidth,
          borderColor: active ? theme.colors.primary : theme.colors.border,
          marginBottom: last ? 0 : 8,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: `${engine.color}14`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={engine.icon} size={19} color={engine.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Text style={{ color: theme.colors.text, fontSize: 14.5, fontWeight: '700' }}>{engine.title}</Text>
            {engine.badge ? (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 5,
                  backgroundColor: active ? 'rgba(108,77,246,.14)' : theme.colors.surfaceAlt,
                }}
              >
                <Text
                  style={{
                    color: active ? theme.colors.primary : theme.colors.textTertiary,
                    fontSize: 9,
                    fontWeight: '700',
                  }}
                >
                  {engine.badge}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={{ color: theme.colors.textTertiary, fontSize: 11.5, marginTop: 3 }} numberOfLines={1}>
            {engine.desc}
          </Text>
        </View>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 1.5,
            borderColor: active ? theme.colors.primary : theme.colors.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? theme.colors.primary : 'transparent',
          }}
        >
          {active ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <NavHeader
        title="翻译引擎"
        subtitle="免费优先，AI 兜底"
        right={
          <Pressable onPress={saveKeys} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '700' }}>保存</Text>
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle title="免费引擎" />
        <View>{FREE.map((engine, index) => renderEngine(engine, index === FREE.length - 1))}</View>

        <SectionTitle title="AI 引擎" />
        <View>{AI.map((engine, index) => renderEngine(engine, index === AI.length - 1))}</View>

        <Text style={{ color: theme.colors.textTertiary, fontSize: 11.5, lineHeight: 18, marginTop: 10, paddingHorizontal: 4 }}>
          {PROVIDER_HINTS[provider]}
        </Text>

        {provider === 'deepseek' || provider === 'siliconflow' || provider === 'openai' ? (
          <View style={{ marginTop: 18 }}>
            <SectionTitle title="接口配置" />
            <Card style={{ gap: 14 }}>
              {provider === 'openai' ? (
                <>
                  <Field
                    label="Base URL"
                    value={settings.openaiBaseUrl}
                    onChangeText={(value) => patchSettings({ openaiBaseUrl: value })}
                    placeholder="https://api.openai.com/v1"
                    autoCapitalize="none"
                  />
                  <Field
                    label="模型"
                    value={settings.openaiModel}
                    onChangeText={(value) => patchSettings({ openaiModel: value })}
                    placeholder="gpt-4o-mini"
                    autoCapitalize="none"
                  />
                </>
              ) : null}
              {provider === 'deepseek' ? (
                <Field
                  label="模型"
                  value={settings.deepseekModel}
                  onChangeText={(value) => patchSettings({ deepseekModel: value })}
                  placeholder="deepseek-chat"
                  autoCapitalize="none"
                />
              ) : null}
              {provider === 'siliconflow' ? (
                <Field
                  label="模型"
                  value={settings.siliconflowModel}
                  onChangeText={(value) => patchSettings({ siliconflowModel: value })}
                  placeholder="Qwen/Qwen3.5-9B"
                  autoCapitalize="none"
                />
              ) : null}
              <Field
                label="API Key"
                value={
                  provider === 'deepseek' ? deepseekKey : provider === 'siliconflow' ? siliconflowKey : openaiKey
                }
                onChangeText={
                  provider === 'deepseek'
                    ? setDeepseekKey
                    : provider === 'siliconflow'
                      ? setSiliconflowKey
                      : setOpenaiKey
                }
                placeholder="sk-…"
                secureTextEntry
                autoCapitalize="none"
              />
              <Pressable
                onPress={test}
                disabled={testing}
                style={({ pressed }) => ({
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: theme.colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  opacity: pressed || testing ? 0.6 : 1,
                })}
              >
                {testing ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
                <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700' }}>
                  {testing ? '正在测试…' : '测试连接'}
                </Text>
              </Pressable>
            </Card>
          </View>
        ) : null}

        {provider === 'auto' || provider === 'microsoft' || provider === 'google' ? (
          <Pressable
            onPress={test}
            disabled={testing}
            style={({ pressed }) => ({
              marginTop: 18,
              height: 46,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              opacity: pressed || testing ? 0.65 : 1,
            })}
          >
            {testing ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons name="pulse" size={17} color={theme.colors.primary} />}
            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700' }}>
              {testing ? '正在测试免费接口…' : '测试当前免费接口'}
            </Text>
          </Pressable>
        ) : null}

        <SectionTitle title="目标语言" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TARGET_LANGUAGES.map((language) => {
            const active = settings.targetLang === language.code;
            return (
              <Pressable
                key={language.code}
                onPress={() => patchSettings({ targetLang: language.code })}
                style={{
                  height: 38,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? theme.colors.primary : theme.colors.card,
                  borderWidth: active ? 0 : StyleSheet.hairlineWidth,
                  borderColor: theme.colors.border,
                }}
              >
                <Text
                  style={{
                    color: active ? '#fff' : theme.colors.textSecondary,
                    fontSize: 12,
                    fontWeight: active ? '700' : '500',
                  }}
                >
                  {language.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle title="翻译策略" />
        <Card style={{ paddingVertical: 4 }}>
          <SettingRow
            title="免费失败自动用 DeepSeek"
            desc="仅在已填写 DeepSeek Key 时生效"
            value={settings.autoFallbackDeepSeek}
            onChange={(value) => patchSettings({ autoFallbackDeepSeek: value })}
          />
          <SettingRow
            title="翻译视频标题"
            desc="首页列表同时显示中文标题"
            value={settings.translateTitles}
            onChange={(value) => patchSettings({ translateTitles: value })}
            last
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const theme = useAppTheme();
  return (
    <View>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 11.5, fontWeight: '600', marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={{
          height: 44,
          borderRadius: 11,
          backgroundColor: theme.colors.surfaceAlt,
          paddingHorizontal: 12,
          color: theme.colors.text,
          fontSize: 13,
        }}
      />
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
