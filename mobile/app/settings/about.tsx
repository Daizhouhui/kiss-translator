import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, NavHeader, Row, SectionTitle } from '../../src/ui/components';
import { useAppTheme } from '../../src/ui/theme';

export default function AboutScreen() {
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <NavHeader title="关于" subtitle="Kiss 字幕" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginTop: 14, marginBottom: 26 }}>
          <LinearGradient
            colors={['#8B72FF', '#6C4DF6', '#5336D9']}
            style={{
              width: 92,
              height: 92,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              ...theme.shadow.floating,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900' }}>K</Text>
          </LinearGradient>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', marginTop: 16, letterSpacing: -0.4 }}>
            Kiss 字幕
          </Text>
          <Text style={{ color: theme.colors.textTertiary, fontSize: 12, marginTop: 5 }}>
            v{Constants.expoConfig?.version ?? '1.0.0'} · {Constants.expoConfig?.ios?.buildNumber ?? '1'}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: 12.5,
              lineHeight: 19,
              textAlign: 'center',
              marginTop: 14,
              maxWidth: 300,
            }}
          >
            把 YouTube 的双语字幕做成一个安静的阅读器：竖屏逐句跟读，横屏沉浸观看，订阅与设置随 WebDAV 走。
          </Text>
        </View>

        <SectionTitle title="链接" />
        <Card style={{ paddingVertical: 2, paddingHorizontal: 16 }}>
          <Row
            icon="logo-github"
            title="GitHub 仓库"
            subtitle="源码、构建脚本与问题反馈"
            onPress={() => Linking.openURL('https://github.com/Daizhouhui/kiss-translator')}
          />
          <Row
            icon="git-branch-outline"
            title="Kiss Translator 上游"
            subtitle="桌面扩展与网页版的原始项目"
            onPress={() => Linking.openURL('https://github.com/fishjar/kiss-translator')}
          />
          <Row
            icon="document-text-outline"
            title="GPL-3.0 许可证"
            onPress={() => Linking.openURL('https://www.gnu.org/licenses/gpl-3.0.html')}
            last
          />
        </Card>

        <SectionTitle title="说明" />
        <Card>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12.5, lineHeight: 20 }}>
            本应用是 Kiss Translator 的移动端独立实现，不是浏览器套壳。视频播放使用 YouTube
            官方内嵌播放器，字幕由本应用抓取、翻译并绘制。字幕与翻译内容仅供个人学习使用，请尊重原视频版权。
          </Text>
          <View style={{ height: 12 }} />
          <Text style={{ color: theme.colors.textTertiary, fontSize: 11.5, lineHeight: 18 }}>
            没有广告、没有账号体系、不上传观看记录。API Key 与 WebDAV 密码保存在系统安全存储中。
          </Text>
        </Card>

        <Pressable
          onPress={() => Linking.openURL('https://github.com/Daizhouhui/kiss-translator/releases')}
          style={({ pressed }) => ({
            marginTop: 22,
            height: 48,
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 7,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Ionicons name="cloud-download-outline" size={17} color={theme.colors.text} />
          <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600' }}>查看最新构建</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
