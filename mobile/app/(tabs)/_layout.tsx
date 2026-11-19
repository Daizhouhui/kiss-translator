import { Tabs } from 'expo-router';

import { KissTabBar } from '../../src/ui/TabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <KissTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: '视频' }} />
      <Tabs.Screen name="me" options={{ title: '我的' }} />
    </Tabs>
  );
}
