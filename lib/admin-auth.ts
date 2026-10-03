import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // seconds

const password = () => process.env.ADMIN_PASSWORD ?? "";

// Derived from the password, so changing ADMIN_PASSWORD logs out every session.
const sign = (value: string) =>
  createHmac("sha256", `admin-session:${password()}`).update(value).digest("hex");

const sha = (s: string) => createHash("sha256").update(s).digest();

export const adminConfigured = () => password().length > 0;

export const checkPassword = (input: string) =>
  adminConfigured() && timingSafeEqual(sha(input), sha(password()));

export const createSessionToken = () => {
  const exp = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
};

const verifyToken = (token: string | undefined) => {
  if (!token || !adminConfigured()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = sign(exp);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

export const isAdmin = async () => verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
