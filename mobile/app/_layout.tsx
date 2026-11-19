import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '../src/core/store';
import { maybeAutoSync } from '../src/core/sync';
import { useAppTheme } from '../src/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const theme = useAppTheme();
  const hydrated = useAppStore((state) => state.hydrated);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync().catch(() => {});
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    maybeAutoSync().catch(() => {});
  }, [hydrated]);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          <Stack.Screen name="player" options={{ animation: 'fade' }} />
          <Stack.Screen name="subscriptions" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="add-subscription" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="settings/translation" />
          <Stack.Screen name="settings/webdav" />
          <Stack.Screen name="settings/subtitle" />
          <Stack.Screen name="settings/about" />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}
