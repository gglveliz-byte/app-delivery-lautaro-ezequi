import { z } from "zod";
import { createRouter, adminQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, orderStatusHistory, orderCommerceStatus, commerces, products, drivers, driverEarnings, customers, categories, appSettings, users } from "@db/schema";
import { eq, sql, desc, and, ne, gte, lte, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { emit } from "./events";
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
    
    const [
      totalOrdersResult,
      activeCommercesResult,
      totalCommercesResult,
      driversResult,
      customersResult,
      revenueResult,
      pendingOrdersResult,
      deliveredOrdersResult
    ] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(orders),
      db.select({ count: sql<number>`COUNT(*)` }).from(commerces).where(eq(commerces.status, "active")),
      db.select({ count: sql<number>`COUNT(*)` }).from(commerces),
      db.select({ status: drivers.status, count: sql<number>`COUNT(*)` }).from(drivers).groupBy(drivers.status),
      db.select({ count: sql<number>`COUNT(*)` }).from(customers),
      db.select({
        totalRevenue: sql<number>`SUM(CAST(${orders.total} AS REAL))`,
        totalCommission: sql<number>`SUM(CAST(${orders.commission} AS REAL))`
      }).from(orders),
      db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.status, "received")),
      db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.status, "delivered"))
    ]);

    const onlineDrivers = driversResult.find(d => d.status === "online")?.count || 0;
    const busyDrivers = driversResult.find(d => d.status === "busy")?.count || 0;
    const totalDrivers = driversResult.reduce((acc, d) => acc + d.count, 0);

    return {
      totalOrders: totalOrdersResult[0].count,
      activeCommerces: activeCommercesResult[0].count,
      totalCommerces: totalCommercesResult[0].count,
      onlineDrivers,
      busyDrivers,
      totalDrivers,
      totalCustomers: customersResult[0].count,
      totalRevenue: (revenueResult[0].totalRevenue || 0).toFixed(2),
      totalCommission: (revenueResult[0].totalCommission || 0).toFixed(2),
      pendingOrders: pendingOrdersResult[0].count,
      deliveredOrders: deliveredOrdersResult[0].count,
    };
  }),

  salesByPeriod: adminQuery
    .input(z.object({ period: z.enum(["day", "week", "month", "year"]) }))
    .query(async ({ input }) => {
      const db = getDb();
      
      const cutoff = new Date();
      if (input.period === "day") cutoff.setDate(cutoff.getDate() - 30);
      else if (input.period === "week") cutoff.setDate(cutoff.getDate() - 90);
      else if (input.period === "month") cutoff.setMonth(cutoff.getMonth() - 24);
      else cutoff.setFullYear(cutoff.getFullYear() - 10);

      const allOrders = await db.select().from(orders).where(gte(orders.createdAt, cutoff));
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

  earningsByPeriod: adminQuery
    .input(z.object({ period: z.enum(["day", "week", "month", "year"]) }))
    .query(async ({ input }) => {
      const db = getDb();
      
      const cutoff = new Date();
      if (input.period === "day") cutoff.setDate(cutoff.getDate() - 30);
      else if (input.period === "week") cutoff.setDate(cutoff.getDate() - 90);
      else if (input.period === "month") cutoff.setMonth(cutoff.getMonth() - 24);
      else cutoff.setFullYear(cutoff.getFullYear() - 10);

      const deliveredOrders = await db.select().from(orders).where(and(eq(orders.status, "delivered"), gte(orders.createdAt, cutoff)));
      const orderIds = deliveredOrders.map(o => o.id);
      
      const allOrderItems = orderIds.length > 0 ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : [];
      const allCommerces = await db.select().from(commerces);
      const allDriverEarnings = await db.select().from(driverEarnings).where(and(eq(driverEarnings.type, "delivery_fee"), gte(driverEarnings.createdAt, cutoff)));
      
      const commMap = new Map(allCommerces.map((c) => [c.id, c]));
      const itemsByOrder = new Map();
      for (const item of allOrderItems) {
        if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
        itemsByOrder.get(item.orderId).push(item);
      }
      
      const grouped: Record<string, { date: string; commission: number; deliveryNet: number }> = {};
      
      const getKey = (dateObj: Date) => {
        if (input.period === "day") return dateObj.toISOString().split("T")[0];
        if (input.period === "week") {
          const weekStart = new Date(dateObj);
          weekStart.setDate(dateObj.getDate() - dateObj.getDay());
          return weekStart.toISOString().split("T")[0];
        }
        if (input.period === "month") return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        return String(dateObj.getFullYear());
      };

      for (const order of deliveredOrders) {
        const date = new Date(order.createdAt);
        const key = getKey(date);
        if (!grouped[key]) grouped[key] = { date: key, commission: 0, deliveryNet: 0 };
        
        grouped[key].deliveryNet += parseFloat(order.deliveryFee || "0");
        
        const items = itemsByOrder.get(order.id) || [];
        for (const item of items) {
          const comm = commMap.get(item.commerceId);
          const rate = parseFloat(comm?.commissionRate || "10");
          const itemTotal = parseFloat(item.total || "0");
          grouped[key].commission += itemTotal * (rate / 100);
        }
      }
      
      for (const earning of allDriverEarnings) {
        const date = new Date(earning.createdAt);
        const key = getKey(date);
        if (!grouped[key]) grouped[key] = { date: key, commission: 0, deliveryNet: 0 };
        grouped[key].deliveryNet -= parseFloat(earning.amount || "0");
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
      const productStats: Record<number, { id: number; name: string; commerceName: string; sold: number; revenue: number }> = {};
      
      for (const item of allOrderItems) {
        if (!productStats[item.productId]) {
          const commerce = await db.select().from(commerces).where(eq(commerces.id, item.commerceId));
          productStats[item.productId] = {
            id: item.productId,
            name: item.productName,
            commerceName: commerce[0]?.name || "",
            sold: 0,
            revenue: 0,
          };
        }
        productStats[item.productId].sold += item.quantity;
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
      const existing = await db.select().from(appSettings).where(eq(appSettings.key, input.key));
      if (existing.length > 0) {
        await db
          .update(appSettings)
          .set({ value: input.value, updatedAt: new Date() })
          .where(eq(appSettings.key, input.key));
      } else {
        await db
          .insert(appSettings)
          .values({ key: input.key, value: input.value, updatedAt: new Date() });
      }
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
    .mutation(async ({ input }) => {
      const db = getDb();
      const dateFrom = input.startDate ? new Date(input.startDate) : undefined;
      const dateTo = input.endDate ? new Date(input.endDate + "T23:59:59") : undefined;

      const withDate = dateFrom || dateTo
        ? and(dateFrom ? gte(orders.createdAt, dateFrom) : undefined, dateTo ? lte(orders.createdAt, dateTo) : undefined)
        : undefined;

      if (input.type === "sales") {
        const all = await db.select({
          date: sql<string>`${orders.createdAt}::date`,
          orders: sql<number>`count(*)`,
          revenue: sql<string>`sum(${orders.total})`,
          commission: sql<string>`sum(${orders.commission})`,
        }).from(orders).where(withDate).groupBy(sql`${orders.createdAt}::date`).orderBy(sql`${orders.createdAt}::date`);
        return { type: "sales", generatedAt: new Date().toISOString(), columns: ["Fecha", "Pedidos", "Ingresos", "Comisiones"], rows: all.map(r => ({ Fecha: r.date, Pedidos: r.orders, Ingresos: parseFloat(r.revenue || "0").toFixed(2), Comisiones: parseFloat(r.commission || "0").toFixed(2) })) };
      }

      if (input.type === "orders") {
        const all = await db.select().from(orders).where(withDate).orderBy(desc(orders.createdAt));
        return { type: "orders", generatedAt: new Date().toISOString(), columns: ["ID", "Estado", "Total", "Metodo Pago", "Direccion", "Telefono", "Fecha"], rows: all.map(r => ({ ID: r.id, Estado: r.status, Total: parseFloat(r.total).toFixed(2), "Metodo Pago": r.paymentMethod, Direccion: r.deliveryAddress, Telefono: r.customerPhone || "-", Fecha: r.createdAt?.toISOString().split("T")[0] })) };
      }

      if (input.type === "commerces") {
        const items = dateFrom || dateTo
          ? await db.select({
            commerceId: orderItems.commerceId,
            orders: sql<number>`count(distinct ${orderItems.orderId})`,
            revenue: sql<string>`sum(${orderItems.total})`,
          }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(withDate).groupBy(orderItems.commerceId)
          : await db.select({
            commerceId: orderItems.commerceId,
            orders: sql<number>`count(distinct ${orderItems.orderId})`,
            revenue: sql<string>`sum(${orderItems.total})`,
          }).from(orderItems).groupBy(orderItems.commerceId);
        const comms = await db.select({ id: commerces.id, name: commerces.name, status: commerces.status }).from(commerces);
        const map = new Map(comms.map(c => [c.id, c]));
        return { type: "commerces", generatedAt: new Date().toISOString(), columns: ["Comercio", "Pedidos", "Ingresos", "Estado"], rows: items.map(r => { const c = map.get(r.commerceId); return { Comercio: c?.name || "-", Pedidos: r.orders, Ingresos: parseFloat(r.revenue || "0").toFixed(2), Estado: c?.status || "-" }; }) };
      }

      if (input.type === "drivers") {
        const revDriverId = sql<number>`${orders.driverId}`;
        const stats = dateFrom || dateTo
          ? await db.select({ driverId: revDriverId, deliveries: sql<number>`count(*)` }).from(orders).where(and(eq(orders.status, "delivered"), withDate)).groupBy(revDriverId)
          : await db.select({ driverId: revDriverId, deliveries: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "delivered")).groupBy(revDriverId);
        const d = await db.select({ id: drivers.id, name: drivers.name, phone: drivers.phone, rating: drivers.rating, totalEarnings: drivers.totalEarnings }).from(drivers);
        const statsMap = new Map(stats.map(s => [s.driverId, s.deliveries]));
        return { type: "drivers", generatedAt: new Date().toISOString(), columns: ["Repartidor", "Telefono", "Entregas", "Ganancias", "Calif."], rows: d.map(r => ({ Repartidor: r.name, Telefono: r.phone, Entregas: statsMap.get(r.id) || 0, Ganancias: parseFloat(r.totalEarnings || "0").toFixed(2), "Calif.": r.rating || "4.5" })) };
      }

      if (input.type === "earnings") {
        const e = await db.select({
          driverId: driverEarnings.driverId,
          orderId: driverEarnings.orderId,
          amount: driverEarnings.amount,
          type: driverEarnings.type,
          date: driverEarnings.date,
        }).from(driverEarnings).orderBy(desc(driverEarnings.date));
        const d = await db.select({ id: drivers.id, name: drivers.name }).from(drivers);
        const dMap = new Map(d.map(r => [r.id, r.name]));
        return { type: "earnings", generatedAt: new Date().toISOString(), columns: ["Repartidor", "Pedido ID", "Monto", "Tipo", "Fecha"], rows: e.map(r => ({ Repartidor: dMap.get(r.driverId) || "-", "Pedido ID": r.orderId, Monto: parseFloat(r.amount || "0").toFixed(2), Tipo: r.type === "delivery_fee" ? "Envio" : r.type === "tip" ? "Propina" : "Bono", Fecha: r.date })) };
      }

      if (input.type === "commissions") {
        const all = await db.select({
          orderId: orders.id,
          commission: orders.commission,
          total: orders.total,
          createdAt: orders.createdAt,
        }).from(orders).where(withDate).orderBy(desc(orders.createdAt));
        const items = await db.select({ orderId: orderItems.orderId, commerceId: orderItems.commerceId }).from(orderItems);
        const comms = await db.select({ id: commerces.id, name: commerces.name }).from(commerces);
        const cMap = new Map(comms.map(c => [c.id, c.name]));
        const orderCommerces = new Map<number, string>();
        for (const it of items) {
          if (!orderCommerces.has(it.orderId)) orderCommerces.set(it.orderId, cMap.get(it.commerceId) || "-");
        }
        return { type: "commissions", generatedAt: new Date().toISOString(), columns: ["Comercio", "Pedido ID", "Comision", "Total Pedido", "Fecha"], rows: all.map(r => ({ Comercio: orderCommerces.get(r.orderId) || "-", "Pedido ID": r.orderId, Comision: parseFloat(r.commission || "0").toFixed(2), "Total Pedido": parseFloat(r.total || "0").toFixed(2), Fecha: r.createdAt?.toISOString().split("T")[0] })) };
      }

      return { type: input.type, generatedAt: new Date().toISOString(), columns: [], rows: [] };
    }),

  listCommerces: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(commerces);
  }),

  listProducts: adminQuery.query(async () => {
    const db = getDb();
    return db
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
        createdAt: products.createdAt,
        unitType: products.unitType,
        commerceName: commerces.name,
      })
      .from(products)
      .leftJoin(commerces, eq(products.commerceId, commerces.id))
      .orderBy(desc(products.createdAt));
  }),

  updateCommerce: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      status: z.enum(["active","inactive","suspended","pending"]).optional(),
      isOpen: z.string().optional(),
      commissionRate: z.string().optional(),
      deliveryTime: z.string().optional(),
      minOrder: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      description: z.string().optional(),
      logo: z.string().optional(),
      coverImage: z.string().optional(),
      categoryId: z.number().optional(),
      openHours: z.string().optional(),
      rating: z.string().optional(),
      lat: z.string().optional(),
      lng: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Partial<typeof commerces.$inferInsert> = {};
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined) updateData[key] = val;
      }
      if (Object.keys(updateData).length > 0) {
        await db.update(commerces).set(updateData).where(eq(commerces.id, id));
      }
      const result = await db.select().from(commerces).where(eq(commerces.id, id));
      emit("admin:dashboard", { type: "dashboard_update" });
      emit("commerces:global", { type: "commerce_update" });
      return result[0];
    }),

  createDriver: adminQuery
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(5),
      password: z.string().min(4),
      vehicle: z.string().optional(),
      licensePlate: z.string().optional(),
      commissionRate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const normalizedPhone = input.phone.replace(/\D/g, "");
      
      const existing = await db.select().from(drivers).where(eq(drivers.phone, normalizedPhone));
      if (existing.length > 0) {
        throw new Error("Ya existe un repartidor con ese número de teléfono");
      }

      const hash = await bcrypt.hash(input.password, 10);
      const result = await db.insert(drivers).values({
        name: input.name,
        phone: normalizedPhone,
        passwordHash: hash,
        vehicle: input.vehicle || null,
        licensePlate: input.licensePlate || null,
        commissionRate: input.commissionRate || "80.00",
      }).returning();
      emit("admin:dashboard", { type: "dashboard_update" });
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
      commissionRate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, password, phone, ...data } = input;
      const updateData: Partial<typeof drivers.$inferInsert> = { ...data };
      if (phone !== undefined) {
        const normalizedPhone = phone.replace(/\D/g, "");
        const existing = await db.select().from(drivers).where(eq(drivers.phone, normalizedPhone));
        if (existing.length > 0 && existing[0].id !== id) {
          throw new Error("Ya existe otro repartidor con ese número de teléfono");
        }
        updateData.phone = normalizedPhone;
      }
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }
      await db.update(drivers).set(updateData).where(eq(drivers.id, id));
      const result = await db.select().from(drivers).where(eq(drivers.id, id));
      emit("admin:dashboard", { type: "dashboard_update" });
      return result[0];
    }),

  commerceCommissions: adminQuery.query(async () => {
    const db = getDb();
    const items = await db
      .select({
        commerceId: orderItems.commerceId,
        totalSales: sql<string>`sum(${orderItems.total})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.status, "delivered"))
      .groupBy(orderItems.commerceId);

    const comms = await db.select({
      id: commerces.id,
      name: commerces.name,
      commissionRate: commerces.commissionRate,
    }).from(commerces);

    const commMap = new Map(comms.map(c => [c.id, c]));

    return items.map(item => {
      const comm = commMap.get(item.commerceId);
      const sales = parseFloat(item.totalSales || "0");
      const rate = parseFloat(comm?.commissionRate || "10.00");
      return {
        commerceId: item.commerceId,
        name: comm?.name || "-",
        totalSales: sales.toFixed(2),
        commissionRate: rate.toFixed(2),
        commissionEarned: (sales * rate / 100).toFixed(2),
      };
    }).sort((a, b) => parseFloat(b.commissionEarned) - parseFloat(a.commissionEarned));
  }),

  driverEarningsBreakdown: adminQuery.query(async () => {
    const db = getDb();
    const earnings = await db
      .select({
        driverId: driverEarnings.driverId,
        type: driverEarnings.type,
        amount: sql<string>`sum(${driverEarnings.amount})`,
      })
      .from(driverEarnings)
      .groupBy(driverEarnings.driverId, driverEarnings.type);

    const d = await db.select({
      id: drivers.id,
      name: drivers.name,
      commissionRate: drivers.commissionRate,
    }).from(drivers);

    const driverMap = new Map(d.map(r => [r.id, r]));
    const grouped = new Map<number, { driverId: number; name: string; commissionRate: string; deliveryFee: string; tips: string; bonuses: string; total: string }>();

    for (const e of earnings) {
      if (!grouped.has(e.driverId)) {
        const driver = driverMap.get(e.driverId);
        grouped.set(e.driverId, {
          driverId: e.driverId,
          name: driver?.name || "-",
          commissionRate: driver?.commissionRate || "80.00",
          deliveryFee: "0.00",
          tips: "0.00",
          bonuses: "0.00",
          total: "0.00",
        });
      }
      const entry = grouped.get(e.driverId)!;
      const val = parseFloat(e.amount || "0");
      if (e.type === "delivery_fee") entry.deliveryFee = val.toFixed(2);
      else if (e.type === "tip") entry.tips = val.toFixed(2);
      else if (e.type === "bonus") entry.bonuses = val.toFixed(2);
      entry.total = (parseFloat(entry.total) + val).toFixed(2);
    }

    return Array.from(grouped.values());
  }),

  adminDeliveryEarnings: adminQuery.query(async () => {
    const db = getDb();

    const [feeResult] = await db
      .select({
        total: sql<string>`coalesce(sum(${orders.deliveryFee}), '0')`,
      })
      .from(orders)
      .where(eq(orders.status, "delivered"));

    const [payoutResult] = await db
      .select({
        total: sql<string>`coalesce(sum(${driverEarnings.amount}), '0')`,
      })
      .from(driverEarnings)
      .where(eq(driverEarnings.type, "delivery_fee"));

    const totalFees = parseFloat(feeResult?.total || "0");
    const totalPayouts = parseFloat(payoutResult?.total || "0");

    return {
      totalDeliveryFees: totalFees.toFixed(2),
      totalDriverPayouts: totalPayouts.toFixed(2),
      adminNet: (totalFees - totalPayouts).toFixed(2),
    };
  }),

  createMerchant: adminQuery
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(4),
      categoryId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const hash = await bcrypt.hash(input.password, 10);
      
      const result = await db.transaction(async (tx) => {
        const userResult = await tx.insert(users).values({
          unionId: `merchant-${Date.now()}`,
          name: input.name,
          email: input.email,
          passwordHash: hash,
          role: "merchant",
        }).returning();
        
        const user = userResult[0];
        
        const cats = await tx.select().from(categories).limit(1);
        const defaultCat = cats.length > 0 ? cats[0].id : 1;
        const categoryId = input.categoryId ?? defaultCat;
        
        await tx.insert(commerces).values({
          name: input.name,
          address: "Dirección pendiente",
          phone: "0000000000",
          categoryId,
          status: "pending",
          merchantUserId: user.id,
        });
        
        return user;
      });
      
      emit("admin:dashboard", { type: "dashboard_update" });
      emit("commerces:global", { type: "commerce_update" });
      return result;
    }),

  createCommerce: adminQuery
    .input(z.object({
      name: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      categoryId: z.number(),
      merchantEmail: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      try {
        const [owner] = await db
          .select()
          .from(users)
          .where(and(eq(users.email, input.merchantEmail), eq(users.role, "merchant")));
        if (!owner) {
          throw new Error("Merchant no encontrado con ese email");
        }
        const [commerce] = await db.insert(commerces).values({
          name: input.name,
          email: input.email || null,
          phone: input.phone || "",
          address: input.address || "",
          categoryId: input.categoryId,
          status: "active",
          isOpen: "open",
          commissionRate: "8.00",
          merchantUserId: owner.id,
        }).returning();
        emit("admin:dashboard", { type: "dashboard_update" });
        emit("commerces:global", { type: "commerce_update" });
        return commerce;
      } catch (err) {
        console.error("[admin.createCommerce] error:", err);
        if (err instanceof Error) throw new Error(err.message);
        throw new Error("No se pudo crear el comercio");
      }
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
        "pending_payment",
        "received",
        "accepted",
        "preparing",
        "ready_for_pickup",
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
        const updateData: Partial<typeof orders.$inferInsert> = { status: input.status, updatedAt: new Date() };
        if (input.driverId) updateData.driverId = input.driverId;

        await tx.update(orders).set(updateData).where(eq(orders.id, input.id));
        
        // Sync the individual commerce statuses only if valid for commerces
        if (["preparing", "ready_for_pickup", "picked_up"].includes(input.status)) {
          await tx.update(orderCommerceStatus)
            .set({ status: input.status as any, updatedAt: new Date() })
            .where(eq(orderCommerceStatus.orderId, input.id));
        }

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

      // If status changed to received, notify commerces
      if (input.status === "received") {
        const orderItemsList = await db.select().from(orderItems).where(eq(orderItems.orderId, input.id));
        const cIds = [...new Set(orderItemsList.map(i => i.commerceId))];
        cIds.forEach(cId => {
          emit(`commerce:${cId}`, { type: "new_order", orderId: input.id });
        });
      }

      emit(`order:${input.id}`, { type: "status_update", status: input.status, driverId: input.driverId });
      emit("admin:dashboard", { type: "dashboard_update" });
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

      emit("admin:dashboard", { type: "dashboard_update" });
      return result;
    }),

  deleteCommerce: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.transaction(async (tx) => {
        const affectedOrderIds = (
          await tx
            .select({ orderId: orderItems.orderId })
            .from(orderItems)
            .where(eq(orderItems.commerceId, input.id))
            .groupBy(orderItems.orderId)
        ).map(r => r.orderId);

        if (affectedOrderIds.length > 0) {
          const mixedOrderIds = (
            await tx
              .select({ orderId: orderItems.orderId })
              .from(orderItems)
              .where(
                and(
                  inArray(orderItems.orderId, affectedOrderIds),
                  ne(orderItems.commerceId, input.id)
                )
              )
              .groupBy(orderItems.orderId)
          ).map(r => r.orderId);

          if (mixedOrderIds.length > 0) {
            throw new Error(
              `No se puede eliminar: hay ${mixedOrderIds.length} pedido(s) que mezclan productos de este comercio con otros. Cancelá esos pedidos primero.`
            );
          }

          for (const oid of affectedOrderIds) {
            await tx.delete(driverEarnings).where(eq(driverEarnings.orderId, oid));
            await tx.delete(orders).where(eq(orders.id, oid));
          }
        }

        await tx.delete(orderCommerceStatus).where(eq(orderCommerceStatus.commerceId, input.id));
        await tx.delete(products).where(eq(products.commerceId, input.id));
        
        const commerce = await tx.select().from(commerces).where(eq(commerces.id, input.id));
        const merchantId = commerce[0]?.merchantUserId;
        
        await tx.delete(commerces).where(eq(commerces.id, input.id));
        
        if (merchantId) {
          await tx.delete(users).where(eq(users.id, merchantId));
        }
      });
      emit("admin:dashboard", { type: "dashboard_update" });
      return { success: true };
    }),

  deleteDriver: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.transaction(async (tx) => {
        await tx.update(orders).set({ driverId: null }).where(eq(orders.driverId, input.id));
        await tx.delete(driverEarnings).where(eq(driverEarnings.driverId, input.id));
        await tx.delete(drivers).where(eq(drivers.id, input.id));
      });
      emit("admin:dashboard", { type: "dashboard_update" });
      return { success: true };
    }),

  listCategories: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(categories).orderBy(categories.sortOrder);
  }),
});
