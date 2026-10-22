import { publicApiFetch } from "@/lib/http/public-api";
import type { PublicWish } from "@/lib/wish-ticker";

type RealtimeClient = ReturnType<typeof import("@/lib/supabase/client").createClient>;
type RealtimeChannel = ReturnType<RealtimeClient["channel"]>;

// The API list works independently of realtime. Load its SDK only once the
// invitation's entrance has finished, outside the initial JavaScript bundle.
export function observePublicWishes(onWishes: (wishes: PublicWish[]) => void) {
  let active = true;
  let inFlight = false;
  let dirty = false;
  let connecting = false;
  let heroReady = false;
  let reloadTimer: number | undefined;
  let realtimeTimer: number | undefined;
  let idleTask: number | undefined;
  let controller: AbortController | undefined;
  let client: RealtimeClient | undefined;
  let channel: RealtimeChannel | undefined;

  const reload = async () => {
    reloadTimer = undefined;
    if (!active || document.hidden || inFlight) { dirty = true; return; }
    inFlight = true;
    dirty = false;
    const request = new AbortController();
    controller = request;
    const timeout = window.setTimeout(() => request.abort(), 15000);
    try {
      const response = await publicApiFetch("/api/wishes", { cache: "no-store", signal: request.signal });
      if (!response.ok) return;
      const result = await response.json() as { data?: PublicWish[] };
      if (active && !request.signal.aborted) onWishes(Array.isArray(result.data) ? result.data : []);
    } catch { /* Focus, reconnect and realtime events retry the public list. */ }
    finally {
      window.clearTimeout(timeout);
      inFlight = false;
      if (active && dirty && !document.hidden) scheduleReload();
    }
  };

  const scheduleReload = () => {
    dirty = true;
    if (!active || document.hidden || inFlight || reloadTimer !== undefined) return;
    reloadTimer = window.setTimeout(() => { void reload(); }, 250);
  };

  const disconnect = () => {
    if (channel && client) void client.removeChannel(channel);
    channel = undefined;
  };

  const connect = async () => {
    idleTask = undefined;
    realtimeTimer = undefined;
    if (!active || document.hidden || connecting || channel) return;
    connecting = true;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      if (!active || document.hidden) return;
      client ??= createClient();
      // DELETE events cannot be filtered; always reload the scoped API list.
      channel = client.channel("public-wishes")
        .on("postgres_changes", { event: "*", schema: "public", table: "public_wishes" }, scheduleReload)
        .subscribe((status) => { if (status === "SUBSCRIBED") scheduleReload(); });
    } catch { /* The API remains available when realtime is unavailable. */ }
    finally { connecting = false; }
  };

  const scheduleRealtime = () => {
    if (!active || document.hidden || connecting || channel || idleTask !== undefined || realtimeTimer !== undefined) return;
    if (typeof window.requestIdleCallback === "function") {
      idleTask = window.requestIdleCallback(() => { void connect(); }, { timeout: 1500 });
    } else {
      realtimeTimer = window.setTimeout(() => { void connect(); }, 100);
    }
  };

  const cancelScheduledRealtime = () => {
    window.clearTimeout(realtimeTimer);
    realtimeTimer = undefined;
    if (idleTask !== undefined) window.cancelIdleCallback(idleTask);
    idleTask = undefined;
  };

  const afterHero = () => {
    heroReady = true;
    window.clearTimeout(heroTimer);
    cancelScheduledRealtime();
    scheduleRealtime();
  };

  const onVisible = () => {
    if (document.hidden) {
      dirty = true;
      controller?.abort();
      cancelScheduledRealtime();
      disconnect();
    } else {
      scheduleReload();
      if (heroReady) scheduleRealtime();
    }
  };
  const onReconnect = () => {
    scheduleReload();
    if (heroReady) scheduleRealtime();
  };

  window.addEventListener("wedding:hero-ready", afterHero);
  window.addEventListener("focus", onReconnect);
  window.addEventListener("online", onReconnect);
  document.addEventListener("visibilitychange", onVisible);
  // Reduced motion may finish before React runs this effect. This fallback also
  // covers an interrupted animation-complete event without delaying the API.
  const heroTimer = window.setTimeout(afterHero, 2500);
  void reload();

  return () => {
    active = false;
    window.clearTimeout(reloadTimer);
    window.clearTimeout(heroTimer);
    cancelScheduledRealtime();
    controller?.abort();
    disconnect();
    window.removeEventListener("wedding:hero-ready", afterHero);
    window.removeEventListener("focus", onReconnect);
    window.removeEventListener("online", onReconnect);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
