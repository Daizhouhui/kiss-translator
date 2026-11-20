import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_SETTINGS } from './defaults';
import { FavoriteItem, Settings, Subscription } from './types';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(patch)) return base;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    const current = result[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = deepMerge(current, value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export type SyncState = 'idle' | 'syncing' | 'ok' | 'error';

type AppState = {
  hydrated: boolean;
  settings: Settings;
  settingsUpdatedAt: number;
  subscriptions: Subscription[];
  favorites: FavoriteItem[];
  history: FavoriteItem[];
  lastSyncAt: number;
  syncState: SyncState;
  syncMessage: string;
  setHydrated: (value: boolean) => void;
  patchSettings: (patch: DeepPartial<Settings>) => void;
  replaceSettings: (settings: Settings) => void;
  addSubscription: (item: Subscription) => void;
  addSubscriptions: (items: Subscription[]) => void;
  updateSubscription: (channelId: string, patch: Partial<Subscription>) => void;
  removeSubscription: (channelId: string) => void;
  setSubscriptions: (items: Subscription[]) => void;
  toggleFavorite: (item: FavoriteItem) => boolean;
  removeFavorite: (videoId: string) => void;
  recordHistory: (item: FavoriteItem) => void;
  clearHistory: () => void;
  setSync: (state: SyncState, message?: string, at?: number) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      settings: DEFAULT_SETTINGS,
      settingsUpdatedAt: 0,
      subscriptions: [],
      favorites: [],
      history: [],
      lastSyncAt: 0,
      syncState: 'idle',
      syncMessage: '',
      setHydrated: (value) => set({ hydrated: value }),
      patchSettings: (patch) =>
        set((state) => ({
          settings: deepMerge(state.settings, patch),
          settingsUpdatedAt: Date.now(),
        })),
      replaceSettings: (settings) =>
        set({
          settings: deepMerge(DEFAULT_SETTINGS, settings),
          settingsUpdatedAt: Date.now(),
        }),
      addSubscription: (item) => {
        const exists = get().subscriptions.some(
          (sub) => sub.channelId === item.channelId
        );
        if (exists) return;
        set((state) => ({ subscriptions: [item, ...state.subscriptions] }));
      },
      addSubscriptions: (items) => {
        const map = new Map(get().subscriptions.map((sub) => [sub.channelId, sub]));
        for (const item of items) {
          if (!map.has(item.channelId)) map.set(item.channelId, item);
        }
        set({ subscriptions: Array.from(map.values()) });
      },
      updateSubscription: (channelId, patch) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((sub) =>
            sub.channelId === channelId ? { ...sub, ...patch } : sub
          ),
        })),
      removeSubscription: (channelId) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter(
            (sub) => sub.channelId !== channelId
          ),
        })),
      setSubscriptions: (items) => set({ subscriptions: items }),
      toggleFavorite: (item) => {
        const exists = get().favorites.some((fav) => fav.videoId === item.videoId);
        if (exists) {
          set((state) => ({
            favorites: state.favorites.filter((fav) => fav.videoId !== item.videoId),
          }));
          return false;
        }
        set((state) => ({ favorites: [item, ...state.favorites] }));
        return true;
      },
      removeFavorite: (videoId) =>
        set((state) => ({
          favorites: state.favorites.filter((fav) => fav.videoId !== videoId),
        })),
      recordHistory: (item) =>
        set((state) => {
          const others = state.history.filter((entry) => entry.videoId !== item.videoId);
          return { history: [item, ...others].slice(0, 120) };
        }),
      clearHistory: () => set({ history: [] }),
      setSync: (syncState, syncMessage = '', at) =>
        set((state) => ({
          syncState,
          syncMessage,
          lastSyncAt: at ?? state.lastSyncAt,
        })),
    }),
    {
      name: 'kissmobile.app',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: {
          ...state.settings,
          webdav: { ...state.settings.webdav, password: '' },
        },
        subscriptions: state.subscriptions,
        favorites: state.favorites,
        history: state.history,
        lastSyncAt: state.lastSyncAt,
        settingsUpdatedAt: state.settingsUpdatedAt,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<AppState> | undefined;
        return {
          ...current,
          settings: deepMerge(DEFAULT_SETTINGS, saved?.settings),
          subscriptions: saved?.subscriptions ?? [],
          favorites: saved?.favorites ?? [],
          history: saved?.history ?? [],
          lastSyncAt: saved?.lastSyncAt ?? 0,
          settingsUpdatedAt: saved?.settingsUpdatedAt ?? 0,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export function getSettings(): Settings {
  return useAppStore.getState().settings;
}

export function getSubscriptions(): Subscription[] {
  return useAppStore.getState().subscriptions;
}
