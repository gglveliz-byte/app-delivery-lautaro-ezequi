import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, drivers, commerces } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { env } from "./lib/env";
import { setAdminCookie, clearAdminCookie } from "./admin-auth";
import { setDriverCookie, clearDriverCookie } from "./driver-auth";
import { setMerchantCookie, clearMerchantCookie } from "./merchant-auth";

export async function seedAdminUser() {
  if (!env.adminEmail || !env.adminPassword) return;
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, env.adminEmail));
  if (existing.length > 0) return;
  const hash = await bcrypt.hash(env.adminPassword, 10);
  await db.insert(users).values({
    unionId: env.ownerUnionId || "admin-local",
    name: env.adminName,
    email: env.adminEmail,
    passwordHash: hash,
    role: "admin",
  });
  console.log("[seed] Admin user created:", env.adminEmail);
}

export const loginRouter = createRouter({
  login: publicQuery
    .input(z.object({
      email: z.string().optional(),
      phone: z.string().optional(),
      password: z.string().min(1, "Contraseña requerida"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      clearAdminCookie(ctx.resHeaders);
      clearDriverCookie(ctx.resHeaders);
      clearMerchantCookie(ctx.resHeaders);

      if (input.email) {
        const userResult = await db.select().from(users).where(eq(users.email, input.email));
        const user = userResult[0];
        if (user && user.passwordHash) {
          const valid = await bcrypt.compare(input.password, user.passwordHash);
          if (valid) {
            await db.update(users).set({ lastSignInAt: new Date() }).where(eq(users.id, user.id));
            if (user.role === "admin") {
              await setAdminCookie(ctx.resHeaders, ctx.req.headers, user.id);
            } else if (user.role === "merchant") {
              await setMerchantCookie(ctx.resHeaders, ctx.req.headers, user.id);
            }
            const result: any = {
              success: true,
              role: user.role,
              user: { id: user.id, name: user.name, email: user.email, role: user.role },
            };
            if (user.role === "merchant") {
              const commerceResult = await db.select().from(commerces).where(eq(commerces.name, user.name || ""));
              if (commerceResult.length > 0) {
                result.commerceId = commerceResult[0].id;
                result.user.commerceId = commerceResult[0].id;
              }
            }
            return result;
          }
        }
      }

      if (input.phone) {
        const normalizedPhone = input.phone.replace(/\D/g, "");
        const driverResult = await db.select().from(drivers).where(eq(drivers.phone, normalizedPhone));
        const driver = driverResult[0];
        if (driver && driver.passwordHash) {
          const valid = await bcrypt.compare(input.password, driver.passwordHash);
          if (valid) {
            await setDriverCookie(ctx.resHeaders, ctx.req.headers, driver.id);
            return {
              success: true,
              role: "driver",
              user: { id: driver.id, name: driver.name, phone: driver.phone, role: "driver" },
            };
          }
        }
      }

      return { success: false, message: "Credenciales inválidas" };
    }),

  seedAdmin: publicQuery.mutation(async () => {
    await seedAdminUser();
    return { success: true };
  }),
});