import type { Metadata } from "next";
import Link from "next/link";
import { getAllPostIds, getPostData } from "@/lib/posts";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPostIds();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostData((await params).id);
  return { title: `${post.title} | JuiYuHung`, description: post.summary };
}

export default async function Post({ params }: Props) {
  const post = await getPostData((await params).id);

  return (
    <section className="pt-24 pb-12 px-4 mx-auto max-w-3xl relative z-10">
      <Link
        href="/posts"
        className="inline-block font-mono md:text-sm text-xs opacity-70 hover:opacity-100 hover:underline decoration-2"
      >
        $ cd ../posts
      </Link>

      <article className="animate-fade-in pt-6">
        <header>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono md:text-sm text-xs">
            <time dateTime={post.date}>{post.date}</time>
            <span className="px-2 py-0.5 rounded border border-terminal_green/50 uppercase tracking-wider text-[10px] md:text-xs">
              {post.type}
            </span>
            <span className="opacity-60">{post.readingMinutes} min read</span>
          </div>
          <h1 className="pt-3 md:text-3xl text-2xl font-bold leading-tight">{post.title}</h1>
          <hr className="border-terminal_green mt-4 mb-6 border-2" />
        </header>

        <div className="post-content" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      </article>
    </section>
  );
}
