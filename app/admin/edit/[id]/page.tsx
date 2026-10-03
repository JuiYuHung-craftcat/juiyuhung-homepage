import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getRepoPost } from "@/lib/github-posts";
import Editor from "../../editor";

export const dynamic = "force-dynamic";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const post = await getRepoPost((await params).id);
  if (!post) notFound();
  return <Editor initial={post} />;
}
