import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import Editor from "../editor";

export const dynamic = "force-dynamic";

export default async function NewPost() {
  if (!(await isAdmin())) redirect("/admin");
  return <Editor initial={null} />;
}
