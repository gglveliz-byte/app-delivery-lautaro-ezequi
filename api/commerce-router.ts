import { z } from "zod";
import { createRouter, publicQuery, merchantQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { commerces, products, orderItems, orders } from "@db/schema";
import { eq, and, like } from "drizzle-orm";

export const commerceRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(commerces).where(eq(commerces.status, "active"));
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const commerce = await db.select().from(commerces).where(eq(commerces.id, input.id));
      if (commerce.length === 0) return null;
      const prods = await db.select().from(products).where(eq(products.commerceId, input.id));
      return { ...commerce[0], products: prods };
    }),

  getByCategory: publicQuery
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(commerces).where(
        and(eq(commerces.categoryId, input.categoryId), eq(commerces.status, "active"))
      );
    }),

  search: publicQuery
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(commerces).where(
        and(like(commerces.name, `%${input.query}%`), eq(commerces.status, "active"))
      );
    }),

  update: merchantQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        logo: z.string().optional(),
        coverImage: z.string().optional(),
        minOrder: z.string().optional(),
        deliveryTime: z.string().optional(),
        status: z.enum(["active", "inactive", "suspended", "pending"]).optional(),
        isOpen: z.enum(["open", "closed"]).optional(),
        openHours: z.string().optional(),
        commissionRate: z.string().optional(),
        lat: z.string().optional(),
        lng: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(commerces).set(data).where(eq(commerces.id, id));
      const result = await db.select().from(commerces).where(eq(commerces.id, id));
      return result[0];
    }),

  toggleStatus: merchantQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const commerce = await db.select().from(commerces).where(eq(commerces.id, input.id));
      if (commerce.length === 0) return null;
      const newStatus = commerce[0].isOpen === "open" ? "closed" : "open";
      await db.update(commerces).set({ isOpen: newStatus }).where(eq(commerces.id, input.id));
      return { ...commerce[0], isOpen: newStatus };
    }),

  getStats: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const prods = await db.select().from(products).where(eq(products.commerceId, input.id));

      const orderItemsForCommerce = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.commerceId, input.id));

      const orderIds = [...new Set(orderItemsForCommerce.map(i => i.orderId))];

      let totalSales = 0;
      let totalOrders = 0;
      const productSales: Record<number, { name: string; qty: number; revenue: number }> = {};

      const dailyMap: Record<string, number> = {};

      for (const oid of orderIds) {
        const [order] = await db.select().from(orders).where(eq(orders.id, oid));
        if (!order) continue;

        const dayKey = new Date(order.createdAt).toLocaleDateString("es-ES", { weekday: "short" });

        if (order.status === "delivered") {
          totalSales += parseFloat(order.total);
          totalOrders++;
          if (!dailyMap[dayKey]) dailyMap[dayKey] = 0;
          dailyMap[dayKey] += parseFloat(order.total);

          const items = orderItemsForCommerce.filter(i => i.orderId === oid);
          for (const item of items) {
            if (!productSales[item.productId]) {
              productSales[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
            }
            productSales[item.productId].qty += item.quantity;
            productSales[item.productId].revenue += parseFloat(item.total);
          }
        }
      }

      const dayNames = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
      const dailySales = dayNames.map((day) => ({
        day: day.charAt(0).toUpperCase() + day.slice(1),
        sales: Math.round(dailyMap[day] || 0),
      }));

      const topProducts = Object.entries(productSales)
        .map(([, v]) => ({ name: v.name, sales: v.qty, revenue: v.revenue.toFixed(2) }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);

      const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

      return {
        totalProducts: prods.length,
        featuredProducts: prods.filter(p => p.isFeatured === "yes").length,
        totalSales: totalSales.toFixed(2),
        totalOrders,
        avgTicket: avgTicket.toFixed(2),
        topProducts,
        dailySales,
      };
    }),
});
