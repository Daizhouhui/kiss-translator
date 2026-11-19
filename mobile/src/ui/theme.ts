import { useColorScheme } from 'react-native';

import { useAppStore } from '../core/store';
import { getTheme, Theme } from '../theme';

export function useAppTheme(): Theme {
  const preference = useAppStore((state) => state.settings.theme);
  const system = useColorScheme();
  const mode =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  return getTheme(mode);
}
