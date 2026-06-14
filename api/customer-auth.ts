import * as jose from "jose";
import { getDb } from "./queries/connection";
import { customers } from "@db/schema";
import { eq } from "drizzle-orm";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";

const JWT_ALG = "HS256";
const ACCESS_EXPIRY = "15 minutes";
const REFRESH_EXPIRY = "30 days";

export async function signCustomerTokens(customerId: number) {
  const secret = new TextEncoder().encode(env.appSecret);
  const accessPayload = { customerId, type: "access" };
  const refreshPayload = { customerId, type: "refresh", jti: crypto.randomUUID() };

  const [access, refresh] = await Promise.all([
    new jose.SignJWT(accessPayload)
      .setProtectedHeader({ alg: JWT_ALG })
      .setIssuedAt()
      .setExpirationTime(ACCESS_EXPIRY)
      .sign(secret),
    new jose.SignJWT(refreshPayload)
      .setProtectedHeader({ alg: JWT_ALG })
      .setIssuedAt()
      .setExpirationTime(REFRESH_EXPIRY)
      .sign(secret),
  ]);
  return { access, refresh };
}

export async function verifyAccessToken(token: string): Promise<number | null> {
  const secret = new TextEncoder().encode(env.appSecret);
  try {
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: [JWT_ALG] });
    if (payload.type !== "access") return null;
    return payload.customerId as number;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<number | null> {
  const secret = new TextEncoder().encode(env.appSecret);
  try {
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: [JWT_ALG] });
    if (payload.type !== "refresh") return null;
    return payload.customerId as number;
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

export async function setCustomerCookies(resHeaders: Headers, reqHeaders: Headers, customerId: number) {
  const db = getDb();
  const result = await db.select().from(customers).where(eq(customers.id, customerId));
  if (result.length === 0) return;
  const customer = result[0];
  const tokens = await signCustomerTokens(customerId);
  const cookieOpts = getSessionCookieOptions(reqHeaders);

  resHeaders.append("Set-Cookie", serializeCookie("quickgo_token", tokens.access, {
    ...cookieOpts,
    maxAge: 15 * 60,
    path: "/",
    httpOnly: true,
  }));
  resHeaders.append("Set-Cookie", serializeCookie("refresh_token", tokens.refresh, {
    ...cookieOpts,
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    httpOnly: true,
    sameSite: "None",
  }));
  return customer;
}

export async function clearCustomerCookies(resHeaders: Headers) {
  resHeaders.append("Set-Cookie", `quickgo_token=; Path=/; Max-Age=0; HttpOnly`);
  resHeaders.append("Set-Cookie", `refresh_token=; Path=/; Max-Age=0; HttpOnly`);
}