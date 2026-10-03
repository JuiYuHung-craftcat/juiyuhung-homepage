import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  adminConfigured,
  checkPassword,
  createSessionToken,
} from "@/lib/admin-auth";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not set on the server." }, { status: 500 });
  }
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !checkPassword(password)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 1500));
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
