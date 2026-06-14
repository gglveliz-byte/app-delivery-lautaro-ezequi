import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Customer, User, Driver } from "@db/schema";
import { verifyAccessToken } from "./customer-auth";
import { verifyAdminToken } from "./admin-auth";
import { verifyDriverToken } from "./driver-auth";
import { verifyMerchantToken } from "./merchant-auth";
import { getDb } from "./queries/connection";
import { customers, users, drivers } from "@db/schema";
import { eq, and } from "drizzle-orm";
import * as cookie from "cookie";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  customer?: Customer;
  admin?: User;
  driver?: Driver;
  merchant?: User;
};

async function getCustomerFromCookie(headers: Headers): Promise<Customer | null> {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies["quickgo_token"];
  if (!token) return null;
  
  const customerId = await verifyAccessToken(token);
  if (!customerId) return null;
  
  const db = getDb();
  const result = await db.select().from(customers).where(eq(customers.id, customerId));
  return result[0] || null;
}

async function getAdminFromCookie(headers: Headers): Promise<User | null> {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies["quickgo_admin_token"];
  if (!token) return null;

  const adminId = await verifyAdminToken(token);
  if (!adminId) return null;

  const db = getDb();
  const result = await db.select().from(users).where(eq(users.id, adminId));
  const user = result[0];
  return user?.role === "admin" ? user : null;
}

async function getDriverFromCookie(headers: Headers): Promise<Driver | null> {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies["quickgo_driver_token"];
  if (!token) return null;

  const driverId = await verifyDriverToken(token);
  if (!driverId) return null;

  const db = getDb();
  const result = await db.select().from(drivers).where(eq(drivers.id, driverId));
  return result[0] || null;
}

async function getMerchantFromCookie(headers: Headers): Promise<User | null> {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies["quickgo_merchant_token"];
  if (!token) return null;

  const userId = await verifyMerchantToken(token);
  if (!userId) return null;

  const db = getDb();
  const result = await db.select().from(users).where(and(eq(users.id, userId), eq(users.role, "merchant")));
  return result[0] || null;
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.customer = await getCustomerFromCookie(opts.req.headers) ?? undefined;
    ctx.admin = await getAdminFromCookie(opts.req.headers) ?? undefined;
    ctx.driver = await getDriverFromCookie(opts.req.headers) ?? undefined;
    ctx.merchant = await getMerchantFromCookie(opts.req.headers) ?? undefined;
  } catch {}
  return ctx;
}