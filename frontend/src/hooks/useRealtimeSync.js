import { useEffect, useRef } from "react";
import { supabase } from "../api/supabaseClient";

/**
 * useRealtimeSync:
 * Combines direct Supabase Realtime WebSocket listeners with
 * smart background polling so dashboards are guaranteed to update
 * in real-time when the database changes.
 *
 * @param {Object} options
 * @param {string[]} [options.tables] - Database tables to watch (e.g. ['parking_sessions', 'parking_slots'])
 * @param {Function} options.onUpdate - Callback function to refresh dashboard state
 * @param {number} [options.interval=4000] - Polling interval in ms (default: 4000ms)
 * @param {boolean} [options.enabled=true] - Whether synchronization is active
 */
export function useRealtimeSync({
  tables = [],
  onUpdate,
  interval = 4000,
  enabled = true,
}) {
  const callbackRef = useRef(onUpdate);

  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  // 1. Direct Supabase Realtime WebSocket Channel
  useEffect(() => {
    if (!enabled || !supabase || !tables.length) return;

    const channelName = `rt-${tables.join("-")}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          callbackRef.current?.();
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, tables]);

  // 2. Continuous Smart Background Sync
  useEffect(() => {
    if (!enabled || !interval) return;

    let timerId = null;

    const tick = () => {
      const effectiveInterval = document.hidden
        ? Math.max(interval * 2.5, 10000)
        : interval;

      timerId = setTimeout(() => {
        callbackRef.current?.();
        tick();
      }, effectiveInterval);
    };

    tick();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        callbackRef.current?.();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, interval]);
}
