"use client";
import type { ReactNode } from "react";
import { useRepoWatcher } from "@/hooks/useRepoWatcher";
import { RepoContext } from "@/hooks/useRepositories";
export function RepoWatchProvider({ children }: { children: ReactNode }) { const watcher = useRepoWatcher(); return <RepoContext.Provider value={watcher}>{children}</RepoContext.Provider>; }
