import { useCallback, useEffect, useRef, useState } from 'react';



import { translateTitles } from '../core/translate';

import { useAppStore } from '../core/store';

import { VideoItem } from '../core/types';

import { fetchSubscriptionFeed } from '../core/youtube/rss';



export function useFeed() {

  const subscriptions = useAppStore((state) => state.subscriptions);

  const translateTitlesEnabled = useAppStore((state) => state.settings.translateTitles);

  const [items, setItems] = useState<VideoItem[]>([]);

  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [updatedAt, setUpdatedAt] = useState(0);

  const requestRef = useRef(0);

  const subsKey = subscriptions.map((sub) => sub.channelId).sort().join(',');



  const load = useCallback(

    async (force = false) => {

      const subs = useAppStore.getState().subscriptions;

      if (!subs.length) {

        setItems([]);

        setLoading(false);

        setRefreshing(false);

        return;

      }

      const requestId = ++requestRef.current;

      if (force) setRefreshing(true);

      else setLoading(true);

      try {

        const feed = await fetchSubscriptionFeed(subs, force);

        if (requestId !== requestRef.current) return;

        const avatarMap = new Map(subs.map((sub) => [sub.channelId, sub.avatar]));

        const enriched = feed.map((item) => ({

          ...item,

          channelAvatar: item.channelAvatar ?? avatarMap.get(item.channelId),

        }));

        setItems(enriched);

        setUpdatedAt(Date.now());

        setLoading(false);

        setRefreshing(false);



        if (useAppStore.getState().settings.translateTitles) {

          const titles = Array.from(new Set(enriched.map((item) => item.title)));

          try {

            const translated = await translateTitles(titles);

            if (requestId !== requestRef.current) return;

            const map = new Map(titles.map((title, index) => [title, translated[index]]));

            setItems((current) =>

              current.map((item) => ({

                ...item,

                translatedTitle: map.get(item.title) ?? item.translatedTitle,

              }))

            );

          } catch {

            // A failed title translation must not hide the feed.

          }

        }

      } catch {

        if (requestId !== requestRef.current) return;

        setLoading(false);

        setRefreshing(false);

      }

    },

    []

  );



  useEffect(() => {

    load(false);

    return () => {

      requestRef.current += 1;

    };

  }, [subsKey, load]);



  useEffect(() => {

    if (!translateTitlesEnabled && items.some((item) => item.translatedTitle)) {

      setItems((current) => current.map((item) => ({ ...item, translatedTitle: undefined })));

    }

  }, [translateTitlesEnabled, items]);



  return {

    items,

    loading,

    refreshing,

    updatedAt,

    refresh: () => load(true),

  };

}

