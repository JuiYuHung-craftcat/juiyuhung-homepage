import type { Metadata } from "next";
import Link from "next/link";
import { getSortedPostsData } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Posts | JuiYuHung",
};

export default function Posts() {
  const posts = getSortedPostsData();

  return (
    <section className="pt-24 pb-12 px-4 mx-auto max-w-3xl relative z-10">
      <div className="animate-fade-in">
        <h2 className="text-xl md:text-left text-center font-bold tracking-wide">POSTS</h2>
        <hr className="border-terminal_green my-2 border-2" />
        <p className="md:text-sm text-xs opacity-70 font-mono pb-2">
          $ ls -t ./posts <span className="opacity-60"># {posts.length} total</span>
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="pt-8 text-center opacity-70">No posts yet. Stay tuned.</p>
      ) : (
        <ul className="space-y-3 pt-2">
          {posts.map((post) => (
            <li key={post.id} className="animate-slide-up">
              <Link
                href={`/posts/${post.id}`}
                className="group block p-4 rounded-lg border-l-4 border-transparent hover:border-terminal_green hover:bg-terminal_green/5 transition-all duration-300"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono md:text-sm text-xs">
                  <time dateTime={post.date}>{post.date}</time>
                  <span className="px-2 py-0.5 rounded border border-terminal_green/50 uppercase tracking-wider text-[10px] md:text-xs">
                    {post.type}
                  </span>
                  <span className="opacity-60">{post.readingMinutes} min read</span>
                </div>
                <h3 className="pt-2 md:text-lg text-base font-bold group-hover:translate-x-1 transition-transform duration-300">
                  {post.title}
                </h3>
                {post.summary && (
                  <p className="pt-1 md:text-sm text-xs opacity-80 leading-relaxed">{post.summary}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
