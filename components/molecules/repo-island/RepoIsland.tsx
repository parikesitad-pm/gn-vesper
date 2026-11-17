"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { githubUrl } from "@/lib/github/types";
import type { Language } from "@/lib/intent/types";
import "./RepoIsland.css";

export function RepoIsland({ children, language }: { children: ReactNode; language: Language }) {
  const repo = useRepositories();
  const [tab, setTab] = useState("commands");
  const [url, setUrl] = useState("");
  const id = language === "id";
  const pulls = repo.watched.flatMap(item => (repo.snapshots[item.repo.fullName]?.pulls || []).map(pull => ({ ...pull, repo: item.repo.fullName })));
  const tabs = [["commands", id ? "Perintah" : "Commands"], ["repos", "Repositories"], ["pulls", "Pull requests"], ["activity", `${id ? "Aktivitas" : "Activity"}${repo.unread ? ` (${repo.unread})` : ""}`]];
  return <div className="repo-island">
    <div className="repo-island-tabs" role="group" aria-label={id ? "Pilihan Vesper" : "Vesper views"}>{tabs.map(([key, label]) => <button type="button" aria-pressed={tab === key} key={key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === "commands" ? <div className="repo-island-commands">{children}</div> : <div className="repo-island-content">
      {tab === "repos" && <><form onSubmit={event => { event.preventDefault(); if (url.trim()) { void repo.add(url); setUrl(""); } }}><label className="sr-only" htmlFor="island-repo-url">GitHub repository URL</label><input id="island-repo-url" value={url} onChange={event => setUrl(event.target.value)} placeholder="github.com/owner/repository" maxLength={300} required /><button disabled={repo.busy} type="submit">{id ? "Pantau" : "Watch"}</button></form>{repo.watched.map(item => <Link key={item.repo.id} href="/vesper" onClick={() => repo.setSelected(item.repo.fullName)}>{item.repo.fullName}<span>→</span></Link>)}{!repo.watched.length && <p>{id ? "Tempel URL repo publik untuk mulai. Tersimpan di browser ini." : "Paste a public repository URL to start. Saved in this browser."}</p>}</>}
      {tab === "pulls" && <>{pulls.slice(0, 5).map(pull => <a key={`${pull.repo}:${pull.number}`} href={githubUrl(pull.url)} target="_blank" rel="noopener noreferrer"><span><small>{pull.repo} · #{pull.number}</small>{pull.title}</span><span>↗</span></a>)}{!pulls.length && <p>{id ? "Belum ada PR terbuka yang dimuat. Tambahkan repo atau refresh di inbox." : "No open pull requests loaded. Add a repository or refresh the inbox."}</p>}</>}
      {tab === "activity" && <>{repo.events.slice(0, 4).map(event => <a key={event.id} href={githubUrl(event.url)} target="_blank" rel="noopener noreferrer"><span><small>{event.repo}</small>{event.title}</span><span>{event.at > repo.readAt ? "●" : "↗"}</span></a>)}{!repo.events.length && <p>{id ? "Belum ada pembaruan. Aktivitas muncul setelah pemantauan dimulai." : "No updates yet. Activity appears after monitoring starts."}</p>}{repo.unread > 0 && <button onClick={() => void repo.markRead()}>{id ? "Tandai dibaca" : "Mark all read"}</button>}</>}
      {repo.error && <p role="alert">{repo.error}</p>}
      <div className="repo-island-footer"><span>{repo.status?.user ? `@${repo.status.user.login}` : id ? "Mode publik · browser ini" : "Public mode · this browser"}</span><Link href="/vesper">{id ? "Buka inbox" : "Open inbox"} →</Link></div>
    </div>}
  </div>;
}
