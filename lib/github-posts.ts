import matter from "gray-matter";

// Reads and writes posts/*.md in the GitHub repo. Every save is a commit,
// which makes Vercel redeploy the site with the new content.

const repo = () => process.env.GITHUB_REPO ?? "JuiYuHung-craftcat/juiyuhung-homepage";
const branch = () => process.env.GITHUB_BRANCH ?? "main";

export const githubConfigured = () => Boolean(process.env.GITHUB_TOKEN);

export const isValidSlug = (id: string) => /^[a-z0-9][a-z0-9-]{0,80}$/.test(id);

export interface EditablePost {
  id: string;
  title: string;
  type: string;
  date: string;
  summary: string;
  body: string;
  sha: string | null;
}

const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(`https://api.github.com/repos/${repo()}/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
  });
  return res;
};

const fail = async (res: Response, what: string) => {
  const body = await res.json().catch(() => ({}));
  throw new Error(`${what} failed (${res.status}): ${body.message ?? res.statusText}`);
};

export async function listRepoPosts() {
  const res = await api(`contents/posts?ref=${branch()}`);
  if (res.status === 404) return [];
  if (!res.ok) await fail(res, "Listing posts");
  const files: { name: string; type: string }[] = await res.json();
  const posts = await Promise.all(
    files
      .filter((f) => f.type === "file" && f.name.endsWith(".md"))
      .map((f) => getRepoPost(f.name.replace(/\.md$/, ""))),
  );
  return posts
    .filter((p): p is EditablePost => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getRepoPost(id: string): Promise<EditablePost | null> {
  if (!isValidSlug(id)) return null;
  const res = await api(`contents/posts/${id}.md?ref=${branch()}`);
  if (res.status === 404) return null;
  if (!res.ok) await fail(res, "Reading post");
  const file: { content: string; sha: string } = await res.json();
  const { data, content } = matter(Buffer.from(file.content, "base64").toString("utf8"));
  return {
    id,
    title: String(data.title ?? ""),
    type: String(data.type ?? "blog"),
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? ""),
    summary: String(data.summary ?? ""),
    body: content.replace(/^\n+/, ""),
    sha: file.sha,
  };
}

export async function saveRepoPost(post: Omit<EditablePost, "sha">, sha: string | null) {
  const data: Record<string, string> = { title: post.title, type: post.type, date: post.date };
  if (post.summary.trim()) data.summary = post.summary.trim();
  const markdown = matter.stringify(`\n${post.body.trim()}\n`, data);

  const res = await api(`contents/posts/${post.id}.md`, {
    method: "PUT",
    body: JSON.stringify({
      message: `${sha ? "Update" : "Add"} post: ${post.title}`,
      content: Buffer.from(markdown, "utf8").toString("base64"),
      branch: branch(),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) await fail(res, "Saving post");
  const out: { content: { sha: string }; commit: { html_url: string } } = await res.json();
  return { sha: out.content.sha, commitUrl: out.commit.html_url };
}

export async function deleteRepoPost(id: string, sha: string) {
  const res = await api(`contents/posts/${id}.md`, {
    method: "DELETE",
    body: JSON.stringify({ message: `Delete post: ${id}`, sha, branch: branch() }),
  });
  if (!res.ok) await fail(res, "Deleting post");
}
