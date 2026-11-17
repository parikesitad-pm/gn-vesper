import type { Metadata } from "next";
import { GitHubDocs } from "@/components/organisms/repo-watcher/GitHubDocs";
export const metadata: Metadata = { title: "Vesper GitHub integration — Setup & API", description: "Configure GitHub App authentication, repository monitoring, webhooks, persistent storage, and Web Push." };
export default function GitHubDocumentation() { return <GitHubDocs year={new Date().getFullYear()} />; }
