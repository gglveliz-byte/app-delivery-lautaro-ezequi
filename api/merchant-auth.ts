import * as jose from "jose";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";

const JWT_ALG = "HS256";
const ACCESS_EXPIRY = "24 hours";
const REFRESH_EXPIRY = "7 days";

export async function signMerchantToken(userId: number) {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT({ userId, role: "merchant", type: "access" })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRY)
    .sign(secret);
}

export async function signMerchantRefreshToken(userId: number) {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT({ userId, role: "merchant", type: "refresh", jti: crypto.randomUUID() })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRY)
    .sign(secret);
}

export async function verifyMerchantToken(token: string): Promise<number | null> {
  const secret = new TextEncoder().encode(env.appSecret);
  try {
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: [JWT_ALG] });
    if (payload.type !== "access" || payload.role !== "merchant") return null;
    return payload.userId as number;
  } catch {
    return null;
  }
}

export async function verifyMerchantRefreshToken(token: string): Promise<number | null> {
  const secret = new TextEncoder().encode(env.appSecret);
  try {
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: [JWT_ALG] });
    if (payload.type !== "refresh" || payload.role !== "merchant") return null;
    return payload.userId as number;
  } catch {
    return null;
  }
}

function serializeCookie(name: string, value: string, opts: Record<string, string | number | boolean | Date>): string {
  let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (opts.maxAge) str += `; Max-Age=${opts.maxAge}`;
  if (opts.path) str += `; Path=${opts.path}`;
  if (opts.httpOnly) str += "; HttpOnly";
  if (opts.secure) str += "; Secure";
  if (opts.sameSite) str += `; SameSite=${opts.sameSite}`;
  if (opts.expires) str += `; Expires=${(opts.expires as Date).toUTCString()}`;
  return str;
}

export async function setMerchantCookie(resHeaders: Headers, reqHeaders: Headers, userId: number) {
  const db = getDb();
  const result = await db.select().from(users).where(and(eq(users.id, userId), eq(users.role, "merchant")));
  if (result.length === 0) return null;
  const token = await signMerchantToken(userId);
  const refreshToken = await signMerchantRefreshToken(userId);
  const cookieOpts = getSessionCookieOptions(reqHeaders);
  resHeaders.append("Set-Cookie", serializeCookie("quickgo_merchant_token", token, {
    ...cookieOpts,
    maxAge: 24 * 60 * 60,
    path: "/",
    httpOnly: true,
  }));
  resHeaders.append("Set-Cookie", serializeCookie("quickgo_merchant_refresh", refreshToken, {
    ...cookieOpts,
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
    httpOnly: true,
  }));
  return result[0];
}

export async function clearMerchantCookie(resHeaders: Headers) {
  resHeaders.append("Set-Cookie", `quickgo_merchant_token=; Path=/; Max-Age=0; HttpOnly`);
  resHeaders.append("Set-Cookie", `quickgo_merchant_refresh=; Path=/; Max-Age=0; HttpOnly`);
}

export async function refreshMerchantAccessToken(refreshToken: string): Promise<{ access: string; refresh: string } | null> {
  const userId = await verifyMerchantRefreshToken(refreshToken);
  if (!userId) return null;
  const access = await signMerchantToken(userId);
  const refresh = await signMerchantRefreshToken(userId);
  return { access, refresh };
}
