"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PREFERENCES, WATCH_STORAGE_KEY, parseRepository, type Pull, type Repository, type RepoEvent, type WatchedRepo, type WatchPreferences } from "@/lib/github/types";
import { changedPulls, readLocalWatch, requestJson, type Snapshot, type WatchStatus } from "@/lib/github/browser";

export function useRepoWatcher() {
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [watched, setWatched] = useState<WatchedRepo[]>([]);
  const [available, setAvailable] = useState<Repository[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [events, setEvents] = useState<RepoEvent[]>([]);
  const [readAt, setReadAt] = useState("");
  const [preferences, setPreferences] = useState<WatchPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState("");
  const [storageError, setStorageError] = useState(false);
  const syncing = useRef(false);
  const alive = useRef(true);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const snapshotRef = useRef(snapshots);
  useEffect(() => { snapshotRef.current = snapshots; }, [snapshots]);
  useEffect(() => {
    alive.current = true;
    const local = readLocalWatch();
    const controller = new AbortController();
    const boot = async () => {
      setWatched(local.watched); setEvents(local.events); setReadAt(local.readAt); setPreferences(local.preferences); setSnapshots(local.snapshots);
      try {
        const setup = await requestJson<WatchStatus>("/api/github/status", { signal: controller.signal });
        if (!alive.current) return;
        setStatus(setup);
        const auth = new URLSearchParams(window.location.search).get("auth");
        if (auth === "failed" || auth === "invalid-state") setError("GitHub connection could not be completed. Try connecting again from this browser.");
        if (setup.user) {
          setWatched([]); setEvents([]); setSnapshots({});
          const [repos, activity, prefs] = await Promise.all([
            requestJson<{ watched: WatchedRepo[]; available: Repository[] }>("/api/github/repositories", { signal: controller.signal }),
            requestJson<{ events: RepoEvent[]; readAt: string }>("/api/github/activity", { signal: controller.signal }),
            requestJson<{ preferences: WatchPreferences }>("/api/github/preferences", { signal: controller.signal }),
          ]);
          if (!alive.current) return;
          setWatched(repos.watched); setAvailable(repos.available); setEvents(activity.events); setReadAt(activity.readAt); setPreferences(prefs.preferences); setSnapshots({});
        }
      } catch (failure) { if (!controller.signal.aborted && alive.current) setError(failure instanceof Error ? failure.message : "Could not load repository settings."); }
      finally { if (alive.current) setReady(true); }
    };
    void boot();
    return () => { alive.current = false; controller.abort(); };
  }, []);
  useEffect(() => {
    if (!ready || !status || status.user) return;
    try { localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify({ watched, events, snapshots, readAt, preferences })); } catch { queueMicrotask(() => setStorageError(true)); }
  }, [ready, status, watched, events, snapshots, readAt, preferences]);

  const refresh = useCallback(async () => {
    if (syncing.current || !ready) return;
    syncing.current = true; setBusy(true); setError("");
    try {
      if (status?.user) {
        const activity = await requestJson<{ events: RepoEvent[]; readAt: string }>("/api/github/activity");
        if (alive.current) { setEvents(activity.events); setReadAt(activity.readAt); }
      }
      const results = await Promise.allSettled(watched.map(async item => {
        const data = await requestJson<{ pulls: Pull[]; fetchedAt: string }>(`/api/github/repository?repo=${encodeURIComponent(item.repo.fullName)}`);
        if (!alive.current) return;
        const changes = !status?.user ? changedPulls(item.repo.fullName, snapshotRef.current[item.repo.fullName], data.pulls) : [];
        setSnapshots(previous => ({ ...previous, [item.repo.fullName]: data }));
        if (changes.length) {
          setEvents(previous => [...changes, ...previous.filter(event => !changes.some(change => change.id === event.id))].slice(0, 100));
          if (preferences.browserNotifications && "Notification" in window && Notification.permission === "granted") new Notification(`Vesper · ${item.repo.fullName}`, { body: `${changes.length} pull request update(s).` });
        }
      }));
      const failed = results.find(result => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      if (alive.current) setNotice(`Checked ${new Date().toLocaleTimeString()}`);
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "Refresh failed. Retry in a moment."); }
    finally { syncing.current = false; if (alive.current) setBusy(false); }
  }, [ready, status, watched, preferences.browserNotifications]);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);
  const repoKey = watched.map(item => item.repo.fullName).join(",");
  useEffect(() => { if (ready && repoKey) void refreshRef.current(); }, [ready, repoKey]);
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => { if (!document.hidden) void refreshRef.current(); }, status?.user ? 60000 : 600000);
    return () => clearInterval(timer);
  }, [ready, status?.user]);

  const add = async (input: string) => {
    setError(""); setNotice(""); setBusy(true);
    try {
      const ref = parseRepository(input);
      if (watched.some(item => item.repo.fullName.toLowerCase() === ref.fullName.toLowerCase())) { setSelected(ref.fullName); setNotice("Already watching this repository."); return; }
      if (watched.length >= (status?.user ? 20 : 3)) throw new Error(status?.user ? "You can watch up to 20 repositories." : "Public mode supports three repositories. Connect GitHub for more.");
      const data = await requestJson<{ repo: Repository; pulls: Pull[]; fetchedAt: string }>(`/api/github/repository?repo=${encodeURIComponent(ref.fullName)}`);
      if (status?.user) {
        const result = await requestJson<{ watched: WatchedRepo[] }>("/api/github/repositories", { method: "POST", body: JSON.stringify({ repo: ref.fullName }) });
        setWatched(result.watched);
      } else setWatched(previous => [...previous, { repo: data.repo, addedAt: new Date().toISOString() }]);
      setSnapshots(previous => ({ ...previous, [data.repo.fullName]: data })); setSelected(data.repo.fullName); setNotice(`Watching ${data.repo.fullName}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not add repository."); }
    finally { setBusy(false); }
  };
  const remove = async (name: string) => {
    setBusy(true); setError("");
    try {
      if (status?.user) await requestJson("/api/github/repositories", { method: "DELETE", body: JSON.stringify({ repo: name }) });
      setWatched(previous => previous.filter(item => item.repo.fullName !== name));
      setSnapshots(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== name)));
      setEvents(previous => previous.filter(event => event.repo !== name));
      if (selected === name) setSelected("");
      setNotice(`Stopped watching ${name}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not remove repository."); } finally { setBusy(false); }
  };
  const markRead = async () => {
    const time = events[0]?.at || new Date().toISOString();
    try { if (status?.user) await requestJson("/api/github/activity", { method: "POST", body: JSON.stringify({ readAt: time }) }); setReadAt(time); } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not mark updates as read."); }
  };
  const savePreferences = async (next: WatchPreferences) => {
    try { if (status?.user) await requestJson("/api/github/preferences", { method: "PUT", body: JSON.stringify(next) }); setPreferences(next); setNotice("Notification preferences saved."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save preferences."); }
  };
  const enableNotifications = async () => {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) throw new Error("Notifications are not supported by this browser.");
      if (await Notification.requestPermission() !== "granted") throw new Error("Notifications are blocked. You can still use the activity inbox.");
      if (status?.user) {
        if (!status.pushPublicKey) throw new Error("Background push needs VAPID keys. Activity updates still work in the inbox.");
        const registration = await navigator.serviceWorker.register("/vesper-sw.js");
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: status.pushPublicKey });
        await requestJson("/api/github/push", { method: "POST", body: JSON.stringify(subscription.toJSON()) });
      }
      await savePreferences({ ...preferences, browserNotifications: true });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not enable notifications."); }
  };
  const disconnect = async (forget = false) => {
    setBusy(true);
    try {
      let subscription: PushSubscription | null = null;
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.active?.scriptURL.endsWith("/vesper-sw.js")) subscription = await registration.pushManager.getSubscription();
      }
      await requestJson("/api/github/auth/logout", { method: "POST", body: JSON.stringify({ forget, pushEndpoint: subscription?.endpoint }) });
      // The server has detached this device; browser cleanup must not prevent sign-out.
      if (subscription) await Promise.allSettled([subscription.unsubscribe()]);
      window.location.reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not disconnect."); setBusy(false); }
  };
  const visibleEvents = events.filter(event => preferences.kinds.includes(event.kind));
  return { status, watched, available, snapshots, events: visibleEvents, unread: visibleEvents.filter(event => event.at > readAt).length, readAt, preferences, ready, busy, error, notice, storageError, selected, setSelected, refresh, add, remove, markRead, savePreferences, enableNotifications, disconnect };
}
