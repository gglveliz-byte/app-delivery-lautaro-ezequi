import { z } from "zod";
import { createRouter, adminQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, orderStatusHistory, commerces, drivers, customers, categories, appSettings, users } from "@db/schema";
import { eq, sql, desc, and, gte, lte, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { verifyAdminRefreshToken, setAdminCookie } from "./admin-auth";

export const adminRouter = createRouter({
  refresh: publicQuery.mutation(async ({ ctx }) => {
    const cookieHeader = ctx.req?.headers?.get?.("cookie") || "";
    const tokenMatch = cookieHeader.match(/quickgo_admin_refresh=([^;]+)/);
    if (!tokenMatch) return { success: false, admin: null };

    const userId = await verifyAdminRefreshToken(tokenMatch[1]);
    if (!userId) return { success: false, admin: null };

    const db = getDb();
    const result = await db.select().from(users).where(eq(users.id, userId));
    if (result.length === 0 || result[0].role !== "admin") return { success: false, admin: null };

    const admin = result[0];
    await setAdminCookie(ctx.resHeaders, ctx.req.headers, admin.id);
    return { success: true, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } };
  }),

  dashboard: adminQuery.query(async () => {
    const db = getDb();
    const allOrders = await db.select().from(orders);
    const activeCommerces = await db.select().from(commerces).where(eq(commerces.status, "active"));
    const allDrivers = await db.select().from(drivers);
    const allCustomers = await db.select().from(customers);
    
    const totalRevenue = allOrders.reduce((acc, o) => acc + parseFloat(o.total || "0"), 0);
    const totalCommission = allOrders.reduce((acc, o) => acc + parseFloat(o.commission || "0"), 0);
    
    return {
      totalOrders: allOrders.length,
      activeCommerces: activeCommerces.length,
      totalCommerces: (await db.select().from(commerces)).length,
      onlineDrivers: allDrivers.filter(d => d.status === "online").length,
      busyDrivers: allDrivers.filter(d => d.status === "busy").length,
      totalDrivers: allDrivers.length,
      totalCustomers: allCustomers.length,
      totalRevenue: totalRevenue.toFixed(2),
      totalCommission: totalCommission.toFixed(2),
      pendingOrders: allOrders.filter(o => o.status === "received").length,
      deliveredOrders: allOrders.filter(o => o.status === "delivered").length,
    };
  }),

  salesByPeriod: adminQuery
    .input(z.object({ period: z.enum(["day", "week", "month", "year"]) }))
    .query(async ({ input }) => {
      const db = getDb();
      const allOrders = await db.select().from(orders);
      const grouped: Record<string, { date: string; sales: number; orders: number }> = {};
      
      for (const order of allOrders) {
        const date = new Date(order.createdAt);
        let key: string;
        
        if (input.period === "day") {
          key = date.toISOString().split("T")[0];
        } else if (input.period === "week") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
        } else if (input.period === "month") {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        } else {
          key = String(date.getFullYear());
        }
        
        if (!grouped[key]) grouped[key] = { date: key, sales: 0, orders: 0 };
        grouped[key].sales += parseFloat(order.total);
        grouped[key].orders += 1;
      }
      
      return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    }),

  topCommerces: adminQuery
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = getDb();
      const allOrderItems = await db.select().from(orderItems);
      const commerceStats: Record<number, { id: number; name: string; orders: number; revenue: number }> = {};
      
      for (const item of allOrderItems) {
        const commerce = await db.select().from(commerces).where(eq(commerces.id, item.commerceId));
        if (commerce.length === 0) continue;
        if (!commerceStats[item.commerceId]) {
          commerceStats[item.commerceId] = { id: item.commerceId, name: commerce[0].name, orders: 0, revenue: 0 };
        }
        commerceStats[item.commerceId].orders += item.quantity;
        commerceStats[item.commerceId].revenue += parseFloat(item.total);
      }
      
      return Object.values(commerceStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, input.limit);
    }),

  topProducts: adminQuery
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = getDb();
      const allOrderItems = await db.select().from(orderItems);
      const productStats: Record<number, { id: number; name: string; commerceName: string; quantity: number; revenue: number }> = {};
      
      for (const item of allOrderItems) {
        if (!productStats[item.productId]) {
          const commerce = await db.select().from(commerces).where(eq(commerces.id, item.commerceId));
          productStats[item.productId] = {
            id: item.productId,
            name: item.productName,
            commerceName: commerce[0]?.name || "",
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].revenue += parseFloat(item.total);
      }
      
      return Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, input.limit);
    }),

  categoryRanking: adminQuery.query(async () => {
    const db = getDb();
    const allOrderItems = await db.select().from(orderItems);
    const cats = await db.select().from(categories);
    const categoryStats: Record<number, { id: number; name: string; sales: number }> = {};
    
    for (const item of allOrderItems) {
      const commerce = await db.select().from(commerces).where(eq(commerces.id, item.commerceId));
      if (commerce.length === 0) continue;
      const catId = commerce[0].categoryId;
      if (!categoryStats[catId]) {
        const cat = cats.find(c => c.id === catId);
        categoryStats[catId] = { id: catId, name: cat?.name || "Otro", sales: 0 };
      }
      categoryStats[catId].sales += parseFloat(item.total);
    }
    
    return Object.values(categoryStats).sort((a, b) => b.sales - a.sales);
  }),

  driverPerformance: adminQuery.query(async () => {
    const db = getDb();
    const allDrivers = await db.select().from(drivers);
    return allDrivers.map(d => ({
      ...d,
      earnings: parseFloat(d.totalEarnings || "0"),
    }));
  }),

  settings: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(appSettings);
  }),

  updateSetting: adminQuery
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(appSettings)
        .set({ value: input.value, updatedAt: new Date() })
        .where(eq(appSettings.key, input.key));
      return { success: true };
    }),

  getReports: adminQuery
    .input(
      z.object({
        type: z.enum(["sales", "orders", "commerces", "drivers", "earnings", "commissions"]),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();

      const conditions = [];
      if (input.startDate) {
        conditions.push(gte(orders.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(orders.createdAt, new Date(input.endDate + "T23:59:59")));
      }

      const filteredOrders = conditions.length > 0
        ? await db.select().from(orders).where(and(...conditions))
        : await db.select().from(orders);

      const orderIds = filteredOrders.map(o => o.id);
      const filteredOrderItems = orderIds.length > 0
        ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
        : [];

      const allCommerces = await db.select().from(commerces);
      const allDrivers = await db.select().from(drivers);

      return {
        type: input.type,
        generatedAt: new Date().toISOString(),
        totalOrders: filteredOrders.length,
        totalRevenue: filteredOrders.reduce((a, o) => a + parseFloat(o.total || "0"), 0),
        totalCommission: filteredOrders.reduce((a, o) => a + parseFloat(o.commission || "0"), 0),
        orders: filteredOrders,
        items: filteredOrderItems,
        commerces: allCommerces,
        drivers: allDrivers,
      };
    }),

  listCommerces: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(commerces);
  }),

  updateCommerce: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      status: z.string().optional(),
      isOpen: z.string().optional(),
      commissionRate: z.string().optional(),
      deliveryTime: z.string().optional(),
      minOrder: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = {};
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined) updateData[key] = val;
      }
      if (Object.keys(updateData).length > 0) {
        await db.update(commerces).set(updateData).where(eq(commerces.id, id));
      }
      const result = await db.select().from(commerces).where(eq(commerces.id, id));
      return result[0];
    }),

  createDriver: adminQuery
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(5),
      password: z.string().min(4),
      vehicle: z.string().optional(),
      licensePlate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const hash = await bcrypt.hash(input.password, 10);
      const normalizedPhone = input.phone.replace(/\D/g, "");
      const result = await db.insert(drivers).values({
        name: input.name,
        phone: normalizedPhone,
        passwordHash: hash,
        vehicle: input.vehicle || null,
        licensePlate: input.licensePlate || null,
      }).returning();
      return result[0];
    }),

  updateDriver: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      password: z.string().optional(),
      vehicle: z.string().optional(),
      licensePlate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, password, phone, ...data } = input;
      const updateData: any = { ...data };
      if (phone !== undefined) {
        updateData.phone = phone.replace(/\D/g, "");
      }
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }
      await db.update(drivers).set(updateData).where(eq(drivers.id, id));
      const result = await db.select().from(drivers).where(eq(drivers.id, id));
      return result[0];
    }),

  createMerchant: adminQuery
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(4),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const hash = await bcrypt.hash(input.password, 10);
      const result = await db.insert(users).values({
        unionId: `merchant-${Date.now()}`,
        name: input.name,
        email: input.email,
        passwordHash: hash,
        role: "merchant",
      }).returning();
      return result[0];
    }),

  // Admin Orders
  orders: adminQuery.query(async () => {
    const db = getDb();
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    
    const enrichedOrders = [];
    for (const order of allOrders) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      let customerName = "";
      let customerPhone = order.customerPhone || "";
      if (order.customerId && !customerPhone) {
        const cust = await db.select().from(customers).where(eq(customers.id, order.customerId));
        if (cust.length > 0) {
          customerName = `${cust[0].firstName} ${cust[0].lastName}`;
          customerPhone = cust[0].phone;
        }
      } else if (order.customerId) {
        const cust = await db.select().from(customers).where(eq(customers.id, order.customerId));
        if (cust.length > 0) {
          customerName = `${cust[0].firstName} ${cust[0].lastName}`;
        }
      }
      let driverName = "";
      if (order.driverId) {
        const drv = await db.select().from(drivers).where(eq(drivers.id, order.driverId));
        if (drv.length > 0) {
          driverName = drv[0].name;
        }
      }
      let commerceName = "";
      if (items.length > 0) {
        const commerceIds = [...new Set(items.map(i => i.commerceId))];
        const coms = await db.select().from(commerces).where(sql`${commerces.id} IN (${sql.join(commerceIds, sql`, `)})`);
        commerceName = coms.length > 0 ? coms[0].name : "";
      }
      
      enrichedOrders.push({
        ...order,
        items,
        customerName,
        driverName,
        commerceName,
      });
    }
    
    return enrichedOrders;
  }),

  orderDetail: adminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const order = await db.select().from(orders).where(eq(orders.id, input.id));
      if (order.length === 0) return null;
      
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, input.id));
      let customer = null;
      if (order[0].customerId) {
        const cust = await db.select().from(customers).where(eq(customers.id, order[0].customerId));
        if (cust.length > 0) customer = cust[0];
      }
      let driver = null;
      if (order[0].driverId) {
        const drv = await db.select().from(drivers).where(eq(drivers.id, order[0].driverId));
        if (drv.length > 0) driver = drv[0];
      }
      
      const commerceIds = [...new Set(items.map(i => i.commerceId))];
      const coms = commerceIds.length > 0
        ? await db.select().from(commerces).where(sql`${commerces.id} IN (${sql.join(commerceIds, sql`, `)})`)
        : [];
      
      return { ...order[0], items, customer, driver, commerces: coms };
    }),

  updateOrderStatus: adminQuery
    .input(z.object({
      id: z.number(),
      status: z.enum([
        "received",
        "accepted",
        "preparing",
        "driver_assigned",
        "picked_up",
        "on_the_way",
        "delivered",
        "cancelled",
      ]),
      driverId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const result = await db.transaction(async (tx) => {
        const updateData: any = { status: input.status, updatedAt: new Date() };
        if (input.driverId) updateData.driverId = input.driverId;

        await tx.update(orders).set(updateData).where(eq(orders.id, input.id));

        await tx.insert(orderStatusHistory).values({
          orderId: input.id,
          status: input.status,
          notes: input.notes || `Estado actualizado a ${input.status}`,
        });

        if (input.driverId) {
          await tx.update(drivers).set({ status: "busy" }).where(eq(drivers.id, input.driverId));
        }

        const updated = await tx.select().from(orders).where(eq(orders.id, input.id));
        return updated[0];
      });

      return result;
    }),

  assignDriver: adminQuery
    .input(z.object({ orderId: z.number(), driverId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const result = await db.transaction(async (tx) => {
        const orderResult = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId))
          .for("update");
        const order = orderResult[0];
        if (!order) throw new Error("Pedido no encontrado");
        if (order.driverId) throw new Error("Pedido ya tiene repartidor asignado");

        await tx
          .update(orders)
          .set({
            driverId: input.driverId,
            status: "driver_assigned",
            updatedAt: new Date()
          })
          .where(eq(orders.id, input.orderId));

        await tx.insert(orderStatusHistory).values({
          orderId: input.orderId,
          status: "driver_assigned",
          notes: "Repartidor asignado por admin",
        });

        await tx.update(drivers).set({ status: "busy" }).where(eq(drivers.id, input.driverId));

        const updated = await tx.select().from(orders).where(eq(orders.id, input.orderId));
        return updated[0];
      });

      return result;
    }),
});
