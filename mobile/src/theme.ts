import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export type Theme = {
  mode: ThemeMode;
  dark: boolean;
  colors: {
    bg: string;
    bgElevated: string;
    surface: string;
    surfaceAlt: string;
    card: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    primary: string;
    primarySoft: string;
    primaryDeep: string;
    border: string;
    borderStrong: string;
    danger: string;
    success: string;
    warning: string;
    overlay: string;
    playerBg: string;
    playerSurface: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  space: (n: number) => number;
  shadow: {
    card: object;
    floating: object;
  };
};

const lightColors: Theme['colors'] = {
  bg: '#F7F5F0',
  bgElevated: '#FBF9F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EDE5',
  card: '#FFFFFF',
  text: '#15131A',
  textSecondary: '#6E6878',
  textTertiary: '#9B95A6',
  primary: '#6C4DF6',
  primarySoft: '#EDE7FF',
  primaryDeep: '#5336D9',
  border: '#E8E2D8',
  borderStrong: '#D8D0C3',
  danger: '#E5484D',
  success: '#2F9E68',
  warning: '#D9822B',
  overlay: 'rgba(15, 13, 20, 0.55)',
  playerBg: '#0B0910',
  playerSurface: '#17131F',
};

const darkColors: Theme['colors'] = {
  bg: '#0F0D14',
  bgElevated: '#131019',
  surface: '#18151F',
  surfaceAlt: '#211C2B',
  card: '#1B1723',
  text: '#F7F3FF',
  textSecondary: '#A7A0B6',
  textTertiary: '#7B748C',
  primary: '#8B72FF',
  primarySoft: '#2A2142',
  primaryDeep: '#6C4DF6',
  border: '#2B2537',
  borderStrong: '#3A3248',
  danger: '#FF6B6E',
  success: '#4ED18C',
  warning: '#F0A45B',
  overlay: 'rgba(0, 0, 0, 0.62)',
  playerBg: '#000000',
  playerSurface: '#121016',
};

export function getTheme(mode: ThemeMode): Theme {
  const dark = mode === 'dark';
  return {
    mode,
    dark,
    colors: dark ? darkColors : lightColors,
    radius: { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 },
    space: (n: number) => n * 4,
    shadow: {
      card: Platform.select({
        ios: {
          shadowColor: '#1A1426',
          shadowOpacity: dark ? 0.35 : 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        },
        android: { elevation: 2 },
        default: {},
      }) as object,
      floating: Platform.select({
        ios: {
          shadowColor: '#3A2A78',
          shadowOpacity: 0.28,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
        },
        android: { elevation: 8 },
        default: {},
      }) as object,
    },
  };
}

export const brandGradient = ['#8B72FF', '#6C4DF6', '#5336D9'] as const;
export const warmGradient = ['#FFF7EA', '#F7F5F0'] as const;
