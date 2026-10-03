import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { markdownToHtml } from "@/lib/posts";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { markdown } = await req.json();
  return NextResponse.json({ html: await markdownToHtml(String(markdown ?? "")) });
}
