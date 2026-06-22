import { z } from "zod";
import { createRouter, publicQuery, merchantQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products, commerces } from "@db/schema";
import { eq, like, and } from "drizzle-orm";
import { emit } from "./events";

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

  create: merchantQuery
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
      
      // Emitir eventos SSE
      emit(`commerce:${input.commerceId}`, { type: "products_update", action: "create" });
      emit("products:global", { type: "products_update", action: "create" });
      
      return result[0];
    }),

  update: merchantQuery
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
      
      const updateData: Record<string, any> = {};
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined) updateData[key] = val;
      }
      
      // Obtener producto actual para conocer commerceId
      const existing = await db.select().from(products).where(eq(products.id, id));
      const commerceId = existing[0]?.commerceId;
      
      if (Object.keys(updateData).length > 0) {
        await db.update(products).set(updateData).where(eq(products.id, id));
      }
      const result = await db.select().from(products).where(eq(products.id, id));
      
      // Emitir eventos SSE
      if (commerceId) {
        emit(`commerce:${commerceId}`, { type: "products_update", action: "update", productId: id });
        emit("products:global", { type: "products_update", action: "update", productId: id });
      }
      
      return result[0];
    }),

  delete: merchantQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      
      // Obtener producto antes de eliminar para conocer commerceId
      const existing = await db.select().from(products).where(eq(products.id, input.id));
      const commerceId = existing[0]?.commerceId;
      
      await db.delete(products).where(eq(products.id, input.id));
      
      // Emitir eventos SSE
      if (commerceId) {
        emit(`commerce:${commerceId}`, { type: "products_update", action: "delete", productId: input.id });
        emit("products:global", { type: "products_update", action: "delete", productId: input.id });
      }
      
      return { success: true };
    }),
});
