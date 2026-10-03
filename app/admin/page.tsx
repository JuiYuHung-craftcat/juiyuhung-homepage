import Link from "next/link";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { githubConfigured, listRepoPosts } from "@/lib/github-posts";
import LoginForm from "./login-form";
import LogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

const SetupNote = ({ missing }: { missing: string }) => (
  <div className="max-w-xl mx-auto pt-12 font-mono text-sm">
    <p className="text-red-500 font-bold pb-2">Admin is not set up.</p>
    <p>
      Add <code className="text-terminal_green">{missing}</code> in Vercel → Project → Settings →
      Environment Variables, then redeploy.
    </p>
  </div>
);

export default async function Admin() {
  if (!adminConfigured()) return <SetupNote missing="ADMIN_PASSWORD" />;
  if (!(await isAdmin())) return <LoginForm />;
  if (!githubConfigured()) return <SetupNote missing="GITHUB_TOKEN" />;

  let posts: Awaited<ReturnType<typeof listRepoPosts>> = [];
  let error = "";
  try {
    posts = await listRepoPosts();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-wide">EDIT POSTS</h2>
        <div className="flex gap-2">
          <Link
            href="/admin/new"
            className="px-3 py-1 rounded bg-terminal_green text-black text-sm font-bold hover:bg-terminal_green/80"
          >
            + NEW POST
          </Link>
          <LogoutButton />
        </div>
      </div>
      <hr className="border-terminal_green my-2 border-2" />
      <p className="text-xs opacity-60 pb-2">
        Read from GitHub, so this includes posts that are committed but still deploying.
      </p>

      {error && <p className="text-red-500 text-sm py-4">{error}</p>}
      {!error && posts.length === 0 && <p className="py-8 text-center opacity-70">No posts yet.</p>}

      <ul className="space-y-2">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              href={`/admin/edit/${p.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 rounded-lg border-l-4 border-transparent hover:border-terminal_green hover:bg-terminal_green/5 transition-all"
            >
              <span className="font-mono text-xs md:text-sm">{p.date}</span>
              <span className="px-2 py-0.5 rounded border border-terminal_green/50 uppercase text-[10px] md:text-xs">
                {p.type}
              </span>
              <span className="font-bold flex-1">{p.title}</span>
              <span className="text-xs opacity-60 font-mono">/posts/{p.id}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
