"use client";
import { useEffect, useRef, useState } from "react";
import { requestJson } from "@/lib/github/browser";
import { githubUrl, type PullDetail } from "@/lib/github/types";

export function PullDetails({ repo, number, close }: { repo: string; number: number; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<PullDetail | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { const element = dialog.current; if (element && !element.open) element.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    void requestJson<{ pull: PullDetail }>(`/api/github/repository?repo=${encodeURIComponent(repo)}&pull=${number}`, { signal: controller.signal }).then(result => setData(result.pull), failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load pull request."); });
    return () => controller.abort();
  }, [repo, number, attempt]);
  return <dialog ref={dialog} className="pull-dialog" aria-labelledby="pull-detail-title" onClose={close}>
    <div className="pull-dialog-heading"><span>{repo} / #{number}</span><button onClick={close} type="button">Back · Esc</button></div>
    <h2 id="pull-detail-title">{data?.title || `Pull request #${number}`}</h2>
    {!data && !error && <p role="status">Loading reviews and checks…</p>}
    {error && <div role="alert"><p>{error}</p><button onClick={() => { setError(""); setAttempt(value => value + 1); }}>Retry</button></div>}
    {data && <><p className="watch-muted">{data.author} · {data.draft ? "Draft" : data.state} · {data.changedFiles} files · +{data.additions} / −{data.deletions}</p><a href={githubUrl(data.url)} target="_blank" rel="noopener noreferrer">Open on GitHub ↗</a><h3>Description</h3><p className="pull-description">{data.body || "No description provided."}</p><h3>Reviews</h3>{data.reviews.length ? <ul>{data.reviews.map((review, i) => <li key={`${review.author}:${i}`}>{review.author} · {review.state.replaceAll("_", " ").toLowerCase()}</li>)}</ul> : <p>No reviews submitted.</p>}<h3>Checks</h3>{data.checks.length ? <ul>{data.checks.map((check, i) => <li key={`${check.name}:${i}`}>{check.url ? <a href={check.url} target="_blank" rel="noopener noreferrer">{check.name} ↗</a> : check.name} · {check.conclusion || check.status}</li>)}</ul> : <p>No check runs available.</p>}</>}
  </dialog>;
}
