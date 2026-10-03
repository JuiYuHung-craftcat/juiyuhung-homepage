"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EditablePost } from "@/lib/github-posts";

type View = "write" | "preview" | "split";
type Status = { kind: "idle" | "busy" | "ok" | "error"; text: string; link?: string };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

// Reads a JSON reply, or falls back to the status and raw text so failures are never silent.
const readReply = async (res: Response) => {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text) as Record<string, string>;
  } catch {
    const snippet = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
    return { error: `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}${snippet ? `: ${snippet}` : ""}` };
  }
};

const input =
  "w-full bg-transparent border-2 border-terminal_green/40 focus:border-terminal_green rounded px-2 py-1 outline-none";

export default function Editor({ initial }: { initial: EditablePost | null }) {
  const router = useRouter();
  const isNew = initial === null;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [id, setId] = useState(initial?.id ?? "");
  const [idTouched, setIdTouched] = useState(!isNew);
  const [type, setType] = useState(initial?.type ?? "blog");
  const [date, setDate] = useState(initial?.date ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [sha, setSha] = useState(initial?.sha ?? null);
  const [view, setView] = useState<View>("write");
  const [previewHtml, setPreviewHtml] = useState("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Default a new post to today in the author's timezone.
  useEffect(() => {
    if (isNew) setDate(new Date().toLocaleDateString("sv-SE"));
  }, [isNew]);

  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setDirty(true);
    };

  const onTitle = (v: string) => {
    edit(setTitle)(v);
    if (!idTouched) setId(slugify(v));
  };

  // Live preview, rendered by the same markdown pipeline as the public site.
  useEffect(() => {
    if (view === "write") return;
    const t = setTimeout(async () => {
      const res = await fetch("/api/admin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: body }),
      });
      if (res.ok) setPreviewHtml((await res.json()).html);
    }, 300);
    return () => clearTimeout(t);
  }, [body, view]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useCallback(async () => {
    if (status.kind === "busy") return;
    setStatus({ kind: "busy", text: "Committing to GitHub..." });
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, date, summary, body, sha }),
    });
    const out = await readReply(res);
    if (!res.ok) {
      setStatus({
        kind: "error",
        text:
          res.status === 409
            ? isNew
              ? "A post with this URL name already exists. Pick another one."
              : "This post was changed elsewhere since you opened it. Reload to get the latest version."
            : (out.error ?? `Save failed (HTTP ${res.status}).`),
      });
      return;
    }
    setSha(out.sha);
    setDirty(false);
    setStatus({
      kind: "ok",
      text: "Published. Vercel is redeploying, so the post goes live in about a minute.",
      link: out.commitUrl,
    });
    if (isNew) router.replace(`/admin/edit/${id}`);
  }, [status.kind, id, title, type, date, summary, body, sha, isNew, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const remove = async () => {
    if (!sha || !confirm(`Delete "${title}"? This commits a deletion to GitHub.`)) return;
    setStatus({ kind: "busy", text: "Deleting..." });
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha }),
    });
    if (!res.ok) {
      setStatus({ kind: "error", text: (await readReply(res)).error ?? `Delete failed (HTTP ${res.status}).` });
      return;
    }
    setDirty(false);
    router.push("/admin");
    router.refresh();
  };

  // Tab inserts two spaces instead of leaving the textarea.
  const onBodyKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: end } = el;
    const next = `${body.slice(0, s)}  ${body.slice(end)}`;
    edit(setBody)(next);
    requestAnimationFrame(() => {
      bodyRef.current?.setSelectionRange(s + 2, s + 2);
    });
  };

  const canSave = title.trim() && id && /^\d{4}-\d{2}-\d{2}$/.test(date) && status.kind !== "busy";

  const tab = (v: View, label: string, extra = "") => (
    <button
      type="button"
      onClick={() => setView(v)}
      className={`px-3 py-1 text-xs font-bold rounded ${extra} ${
        view === v ? "bg-terminal_green text-black" : "hover:bg-terminal_green/10"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <Link href="/admin" className="font-mono text-sm opacity-70 hover:opacity-100 hover:underline">
          $ cd ../admin
        </Link>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <a
                href={`/posts/${id}`}
                target="_blank"
                className="px-3 py-1 rounded border-2 border-terminal_green/50 hover:border-terminal_green text-sm font-bold"
              >
                VIEW
              </a>
              <button
                type="button"
                onClick={remove}
                className="px-3 py-1 rounded border-2 border-red-500/60 text-red-500 hover:border-red-500 text-sm font-bold"
              >
                DELETE
              </button>
            </>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            title="Ctrl/⌘ + S"
            className="px-4 py-1 rounded bg-terminal_green text-black text-sm font-bold disabled:opacity-40 hover:bg-terminal_green/80"
          >
            {status.kind === "busy" ? "SAVING..." : "PUBLISH"}
          </button>
        </div>
      </div>

      {status.text && (
        <p
          className={`text-sm mb-3 px-3 py-2 rounded border-l-4 ${
            status.kind === "error"
              ? "border-red-500 bg-red-500/10 text-red-400"
              : "border-terminal_green bg-terminal_green/10"
          }`}
        >
          {status.text}{" "}
          {status.link && (
            <a href={status.link} target="_blank" className="underline">
              View commit
            </a>
          )}
        </p>
      )}

      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Post title"
        className="w-full bg-transparent text-2xl md:text-3xl font-bold outline-none border-b-2 border-terminal_green/40 focus:border-terminal_green pb-2 placeholder:text-terminal_green/30"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 text-sm">
        <label className="flex flex-col gap-1 col-span-2 md:col-span-1">
          <span className="text-xs opacity-70">URL name</span>
          <div className="flex items-center">
            <span className="text-xs opacity-50 pr-1">/posts/</span>
            <input
              value={id}
              disabled={!isNew}
              onChange={(e) => {
                setIdTouched(true);
                edit(setId)(slugify(e.target.value));
              }}
              placeholder="my-post"
              className={`${input} disabled:opacity-50`}
            />
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-70">Type</span>
          <input value={type} onChange={(e) => edit(setType)(e.target.value)} list="post-types" className={input} />
          <datalist id="post-types">
            <option value="blog" />
            <option value="tech" />
            <option value="trading" />
          </datalist>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-70">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => edit(setDate)(e.target.value)}
            className={`${input} [color-scheme:dark]`}
          />
        </label>
        <label className="flex flex-col gap-1 col-span-2 md:col-span-4">
          <span className="text-xs opacity-70">Summary (optional, shown in the post list)</span>
          <input value={summary} onChange={(e) => edit(setSummary)(e.target.value)} className={input} />
        </label>
      </div>

      <div className="flex items-center gap-1 pt-5 pb-2">
        {tab("write", "WRITE")}
        {tab("preview", "PREVIEW")}
        {tab("split", "SPLIT", "hidden md:inline-block")}
        <span className="ml-auto text-xs opacity-50">Markdown · Ctrl/⌘+S to publish</span>
      </div>

      <div className={view === "split" ? "grid md:grid-cols-2 gap-4" : ""}>
        {view !== "preview" && (
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => edit(setBody)(e.target.value)}
            onKeyDown={onBodyKey}
            placeholder="Write your post in markdown..."
            spellCheck
            className="w-full min-h-[60vh] bg-black/40 border-2 border-terminal_green/30 focus:border-terminal_green/70 rounded-lg p-4 font-mono text-sm leading-relaxed outline-none resize-y"
          />
        )}
        {view !== "write" && (
          <div className="min-h-[60vh] rounded-lg border-2 border-terminal_green/20 p-4 overflow-auto">
            {body.trim() ? (
              <div className="post-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <p className="opacity-50 text-sm">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
