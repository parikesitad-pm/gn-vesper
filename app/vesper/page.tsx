import type { Metadata } from "next";
import { RepoWatcher } from "@/components/organisms/repo-watcher/RepoWatcher";
import { aiConfigured } from "@/lib/providers";
export const metadata: Metadata = { title: "Vesper — Repository inbox", description: "Watch GitHub repositories, inspect pull requests, and follow updates from a compact command island." };
export const dynamic = "force-dynamic";
export default function VesperPage() { return <RepoWatcher year={new Date().getFullYear()} aiAvailable={aiConfigured(process.env)} />; }
