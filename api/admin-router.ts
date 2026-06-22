import { z } from "zod";
import { createRouter, adminQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, orderStatusHistory, orderCommerceStatus, commerces, products, drivers, driverEarnings, customers, categories, appSettings, users } from "@db/schema";
import { eq, sql, desc, and, ne, gte, lte, inArray } from "drizzle-orm";
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
            await tx.delete(orders).where(eq(orders.id, oid));
          }
        }

        await tx.delete(orderCommerceStatus).where(eq(orderCommerceStatus.commerceId, input.id));
        await tx.delete(products).where(eq(products.commerceId, input.id));
        await tx.delete(commerces).where(eq(commerces.id, input.id));
      });
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
      return { success: true };
    }),
});
