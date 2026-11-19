import { getSecret } from '../secrets';
import { getSettings, useAppStore } from '../store';
import { Settings, Subscription, WebDavConfig } from '../types';
import { WebdavClient } from './webdav';

type SubscriptionsFile = {
  version: 1;
  updatedAt: number;
  items: Subscription[];
};

type SettingsFile = {
  version: 1;
  updatedAt: number;
  settings: Omit<Settings, 'webdav'>;
};

export async function getWebdavConfig(): Promise<WebDavConfig> {
  const settings = getSettings();
  const storedPassword = await getSecret('webdavPassword');
  return {
    ...settings.webdav,
    password: settings.webdav.password || storedPassword,
  };
}

export function mergeSubscriptions(
  local: Subscription[],
  remote: Subscription[]
): Subscription[] {
  const map = new Map<string, Subscription>();
  for (const item of local) map.set(item.channelId, item);
  for (const item of remote) {
    if (!map.has(item.channelId)) map.set(item.channelId, item);
  }
  return Array.from(map.values()).sort((a, b) => b.addedAt - a.addedAt);
}

function syncableSettings(settings: Settings): Omit<Settings, 'webdav'> {
  const { webdav, ...rest } = settings;
  return rest;
}

export async function testWebdav(config?: WebDavConfig): Promise<void> {
  const resolved = config ?? (await getWebdavConfig());
  if (!resolved.url.trim()) throw new Error('请填写 WebDAV 地址');
  if (!resolved.username.trim()) throw new Error('请填写 WebDAV 用户名');
  if (!resolved.password) throw new Error('请填写 WebDAV 应用密码');
  const client = new WebdavClient(resolved);
  await client.test();
}

export async function syncNow(): Promise<string> {
  const config = await getWebdavConfig();
  if (!config.enabled) throw new Error('WebDAV 同步未启用');
  if (!config.url.trim() || !config.username.trim() || !config.password) {
    throw new Error('请先填写完整的 WebDAV 配置');
  }
  const state = useAppStore.getState();
  state.setSync('syncing', '正在同步…');

  try {
    const client = new WebdavClient(config);
    await client.ensureFolder();

    const localSubs = state.subscriptions;
    const remoteSubs = await client.getJson<SubscriptionsFile>(
      'subscriptions.json'
    );
    const merged = mergeSubscriptions(
      localSubs,
      remoteSubs.data?.items ?? []
    );
    const changed =
      merged.length !== localSubs.length ||
      merged.some(
        (item, index) => item.channelId !== localSubs[index]?.channelId
      );
    if (changed || !remoteSubs.data) {
      const payload: SubscriptionsFile = {
        version: 1,
        updatedAt: Date.now(),
        items: merged,
      };
      try {
        await client.putJson('subscriptions.json', payload, remoteSubs.etag);
      } catch (error) {
        if (String(error).includes('412')) {
          const retry = await client.getJson<SubscriptionsFile>(
            'subscriptions.json'
          );
          const secondMerge = mergeSubscriptions(
            merged,
            retry.data?.items ?? []
          );
          await client.putJson(
            'subscriptions.json',
            { version: 1, updatedAt: Date.now(), items: secondMerge },
            retry.etag
          );
        } else {
          throw error;
        }
      }
    }
    if (changed) state.setSubscriptions(merged);

    const settings = state.settings;
    const remoteSettings = await client.getJson<SettingsFile>('settings.json');
    const localUpdatedAt = state.settingsUpdatedAt || 0;
    if (
      remoteSettings.data?.settings &&
      Number(remoteSettings.data.updatedAt) > localUpdatedAt
    ) {
      state.replaceSettings({
        ...(remoteSettings.data.settings as Settings),
        webdav: settings.webdav,
      });
    } else {
      const payload: SettingsFile = {
        version: 1,
        updatedAt: localUpdatedAt || Date.now(),
        settings: syncableSettings(settings),
      };
      try {
        await client.putJson('settings.json', payload, remoteSettings.etag);
      } catch (error) {
        if (!String(error).includes('412')) throw error;
        const retry = await client.getJson<SettingsFile>('settings.json');
        await client.putJson(
          'settings.json',
          {
            version: 1,
            updatedAt: Date.now(),
            settings: syncableSettings(settings),
          },
          retry.etag
        );
      }
    }

    const now = Date.now();
    state.setSync('ok', `同步完成 · ${merged.length} 个订阅`, now);
    return `同步完成，共 ${merged.length} 个订阅`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state.setSync('error', message);
    throw error;
  }
}

let lastAutoSync = 0;

export async function maybeAutoSync(): Promise<void> {
  const settings = getSettings();
  if (!settings.webdav.enabled) return;
  if (Date.now() - lastAutoSync < 10 * 60 * 1000) return;
  lastAutoSync = Date.now();
  try {
    await syncNow();
  } catch {
    // Silent background sync: the settings page exposes the error.
  }
}
