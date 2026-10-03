import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { deleteRepoPost, githubConfigured, isValidSlug, saveRepoPost } from "@/lib/github-posts";

type Ctx = { params: Promise<{ id: string }> };

const guard = async (id: string) => {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!githubConfigured()) {
    return NextResponse.json({ error: "GITHUB_TOKEN is not set on the server." }, { status: 500 });
  }
  if (!isValidSlug(id)) {
    return NextResponse.json(
      { error: "URL name may only use lowercase letters, numbers and dashes." },
      { status: 400 },
    );
  }
  return null;
};

const safely =
  (handler: (req: Request, ctx: Ctx) => Promise<Response>) => async (req: Request, ctx: Ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      console.error("[admin/posts]", e);
      return NextResponse.json({ error: `Server error: ${(e as Error).message}` }, { status: 500 });
    }
  };

export const PUT = safely(async (req, { params }) => {
  const { id } = await params;
  const denied = await guard(id);
  if (denied) return denied;

  const b = await req.json();
  const title = String(b.title ?? "").trim();
  const date = String(b.date ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date must look like 2026-10-03." }, { status: 400 });
  }

  try {
    const out = await saveRepoPost(
      {
        id,
        title,
        date,
        type: String(b.type ?? "blog").trim() || "blog",
        summary: String(b.summary ?? ""),
        body: String(b.body ?? ""),
      },
      typeof b.sha === "string" ? b.sha : null,
    );
    return NextResponse.json(out);
  } catch (e) {
    console.error("[admin/posts] save", e);
    const msg = (e as Error).message;
    // 409/422 from GitHub: the file changed since it was loaded, or already exists.
    const status = /\((409|422)\)/.test(msg) ? 409 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
});

export const DELETE = safely(async (req, { params }) => {
  const { id } = await params;
  const denied = await guard(id);
  if (denied) return denied;

  const { sha } = await req.json();
  try {
    await deleteRepoPost(id, String(sha));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/posts] delete", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
});
