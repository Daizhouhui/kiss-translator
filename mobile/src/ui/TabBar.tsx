import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from './theme';

const LABELS: Record<string, string> = {
  index: '视频',
  me: '我的',
};

const ICONS: Record<string, any> = {
  index: 'play-circle',
  me: 'person',
};

export function KissTabBar({ state, navigation }: any) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
        paddingTop: 8,
        paddingBottom: Math.max(8, insets.bottom),
        paddingHorizontal: 24,
        gap: 12,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const label = LABELS[route.name] ?? route.name;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              if (!focused) navigation.navigate(route.name as never);
            }}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: focused ? theme.colors.primarySoft : 'transparent',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons
              name={focused ? ICONS[route.name] ?? 'ellipse' : `${ICONS[route.name] ?? 'ellipse'}-outline` as any}
              size={20}
              color={focused ? theme.colors.primary : theme.colors.textTertiary}
            />
            <Text
              style={{
                color: focused ? theme.colors.primary : theme.colors.textTertiary,
                fontSize: 12,
                fontWeight: focused ? '700' : '500',
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
