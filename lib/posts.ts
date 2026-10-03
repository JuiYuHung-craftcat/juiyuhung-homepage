import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import gfm from "remark-gfm";

const postsDirectory = path.join(process.cwd(), "posts");

export interface PostMeta {
  id: string;
  title: string;
  date: string;
  type: string;
  summary: string;
  readingMinutes: number;
}

export interface Post extends PostMeta {
  contentHtml: string;
}

const postFiles = () =>
  fs.existsSync(postsDirectory)
    ? fs.readdirSync(postsDirectory).filter((f) => f.endsWith(".md"))
    : [];

// ~200 English words or ~400 CJK characters per minute.
const readingMinutes = (text: string) => {
  const cjk = (text.match(/[぀-ヿ㐀-鿿]/g) ?? []).length;
  const words = text.replace(/[぀-ヿ㐀-鿿]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200 + cjk / 400));
};

// First paragraph of the post, stripped of markdown, as a fallback summary.
const excerpt = (text: string) => {
  const para =
    text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p && !/^(#|```|!\[|>|---|\|)/.test(p)) ?? "";
  const plain = para
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 160 ? `${plain.slice(0, 157)}...` : plain;
};

const readPost = (id: string) => {
  const { data, content } = matter(fs.readFileSync(path.join(postsDirectory, `${id}.md`), "utf8"));
  const meta: PostMeta = {
    id,
    title: String(data.title ?? id),
    // gray-matter turns unquoted YYYY-MM-DD into a Date.
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? ""),
    type: String(data.type ?? "blog"),
    summary: String(data.summary ?? excerpt(content)),
    readingMinutes: readingMinutes(content),
  };
  return { meta, content };
};

export function getSortedPostsData(): PostMeta[] {
  return postFiles()
    .map((f) => readPost(f.replace(/\.md$/, "")).meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllPostIds() {
  return postFiles().map((f) => ({ id: f.replace(/\.md$/, "") }));
}

export async function markdownToHtml(markdown: string) {
  return (await remark().use(gfm).use(html).process(markdown)).toString();
}

export async function getPostData(id: string): Promise<Post> {
  const { meta, content } = readPost(id);
  return { ...meta, contentHtml: await markdownToHtml(content) };
}
