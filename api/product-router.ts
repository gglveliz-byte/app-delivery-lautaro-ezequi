import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products, commerces } from "@db/schema";
import { eq, like, and } from "drizzle-orm";

export const productRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(products).where(eq(products.isAvailable, "yes"));
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(products).where(eq(products.id, input.id));
      return result[0] || null;
    }),

  getByCommerce: publicQuery
    .input(z.object({ commerceId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(products).where(eq(products.commerceId, input.commerceId));
    }),

  getFeatured: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: products.id,
        commerceId: products.commerceId,
        name: products.name,
        description: products.description,
        price: products.price,
        image: products.image,
        category: products.category,
        isFeatured: products.isFeatured,
        isAvailable: products.isAvailable,
        preparationTime: products.preparationTime,
        commerceName: commerces.name,
      })
      .from(products)
      .leftJoin(commerces, eq(products.commerceId, commerces.id))
      .where(and(eq(products.isFeatured, "yes"), eq(products.isAvailable, "yes")));
    return rows;
  }),

  search: publicQuery
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(products).where(
        and(like(products.name, `%${input.query}%`), eq(products.isAvailable, "yes"))
      );
    }),

  create: publicQuery
    .input(
      z.object({
        commerceId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.string(),
        image: z.string().optional(),
        category: z.string().optional(),
        isFeatured: z.enum(["yes", "no"]).default("no"),
        isAvailable: z.enum(["yes", "no"]).default("yes"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(products).values(input).returning();
      return result[0];
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        image: z.string().optional(),
        category: z.string().optional(),
        isFeatured: z.enum(["yes", "no"]).optional(),
        isAvailable: z.enum(["yes", "no"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(products).set(data).where(eq(products.id, id));
      const result = await db.select().from(products).where(eq(products.id, id));
      return result[0];
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(products).where(eq(products.id, input.id));
      return { success: true };
    }),
});
