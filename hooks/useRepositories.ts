"use client";
import { createContext, useContext } from "react";
import type { useRepoWatcher } from "./useRepoWatcher";
export const RepoContext = createContext<ReturnType<typeof useRepoWatcher> | null>(null);
export function useRepositories() { const watcher = useContext(RepoContext); if (!watcher) throw new Error("RepoWatchProvider is required."); return watcher; }
