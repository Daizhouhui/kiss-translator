import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/src/ui/theme';

export default function NotFoundScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <View
        style={{
          width: 78,
          height: 78,
          borderRadius: 39,
          backgroundColor: theme.colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <Ionicons name="compass-outline" size={32} color={theme.colors.primary} />
      </View>
      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800' }}>页面走丢了</Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
        这个地址不存在，回到首页继续看视频吧。
      </Text>
      <Pressable
        onPress={() => router.replace('/' as any)}
        style={({ pressed }) => ({
          marginTop: 22,
          height: 46,
          paddingHorizontal: 30,
          borderRadius: 14,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>返回首页</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({});
