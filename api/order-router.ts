import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, orderStatusHistory, products, drivers, commerces, customers, driverEarnings } from "@db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { emit } from "./events";

export const orderRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        customerId: z.number(),
        items: z.array(
          z.object({
            productId: z.number(),
            commerceId: z.number(),
            quantity: z.number().min(1),
          })
        ),
        deliveryAddress: z.string(),
        customerPhone: z.string(),
        paymentMethod: z.enum(["cash", "transfer"]),
        notes: z.string().optional(),
        deliveryFee: z.string().default("2.50"),
        commission: z.string().default("0.00"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      let subtotal = 0;
      const itemsData = [];

      for (const item of input.items) {
        const product = await db.select().from(products).where(eq(products.id, item.productId));
        if (product.length === 0) {
          throw new Error(`Producto no encontrado: ID ${item.productId}`);
        }
        const unitPrice = parseFloat(product[0].price);
        const total = unitPrice * item.quantity;
        subtotal += total;
        itemsData.push({
          productId: item.productId,
          commerceId: item.commerceId,
          productName: product[0].name,
          quantity: item.quantity,
          unitPrice: product[0].price,
          total: total.toFixed(2),
        });
      }

      const total = subtotal + parseFloat(input.deliveryFee) + parseFloat(input.commission);

      const result = await db.transaction(async (tx) => {
        const [newOrder] = await tx.insert(orders).values({
          customerId: input.customerId,
          status: "received",
          subtotal: subtotal.toFixed(2),
          deliveryFee: input.deliveryFee,
          commission: input.commission,
          total: total.toFixed(2),
          paymentMethod: input.paymentMethod,
          deliveryAddress: input.deliveryAddress,
          customerPhone: input.customerPhone,
          notes: input.notes,
        }).returning();

        const orderId = newOrder.id;

        for (const item of itemsData) {
          await tx.insert(orderItems).values({
            orderId,
            productId: item.productId,
            commerceId: item.commerceId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          });
        }

        await tx.insert(orderStatusHistory).values({
          orderId,
          status: "received",
          notes: "Pedido recibido",
        });

        // Emit SSE events to notify commerces about new order
        const commerceIds = [...new Set(itemsData.map(i => i.commerceId))];
        commerceIds.forEach(cId => {
          emit(`commerce:${cId}`, { type: "new_order", orderId });
        });

        return newOrder;
      });

      return { success: true, order: result };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const order = await db.select().from(orders).where(eq(orders.id, input.id));
      if (order.length === 0) return null;
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, input.id));
      const history = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, input.id))
        .orderBy(orderStatusHistory.createdAt);

      let driver = null;
      if (order[0].driverId) {
        const driverResult = await db
          .select({
            id: drivers.id,
            name: drivers.name,
            phone: drivers.phone,
            currentLat: drivers.currentLat,
            currentLng: drivers.currentLng,
          })
          .from(drivers)
          .where(eq(drivers.id, order[0].driverId));
        if (driverResult.length > 0) driver = driverResult[0];
      }

      const commerceIds = [...new Set(items.map((i) => i.commerceId))];
      const commerceList = commerceIds.length > 0
        ? await db
            .select({ id: commerces.id, name: commerces.name, logo: commerces.logo, lat: commerces.lat, lng: commerces.lng })
            .from(commerces)
            .where(sql`${commerces.id} IN (${sql.join(commerceIds, sql`, `)})`)
        : [];

      return { ...order[0], items, history, driver, commerces: commerceList };
    }),

  getByCustomer: publicQuery
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(orders)
        .where(eq(orders.customerId, input.customerId))
        .orderBy(desc(orders.createdAt));
    }),

  getByDriver: publicQuery
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(orders)
        .where(eq(orders.driverId, input.driverId))
        .orderBy(desc(orders.createdAt));
    }),

getAvailableForDriver: publicQuery.query(async () => {
    const db = getDb();
    const availableOrders = await db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        status: orders.status,
        subtotal: orders.subtotal,
        deliveryFee: orders.deliveryFee,
        commission: orders.commission,
        total: orders.total,
        paymentMethod: orders.paymentMethod,
        deliveryAddress: orders.deliveryAddress,
        customerPhone: orders.customerPhone,
        notes: orders.notes,
        createdAt: orders.createdAt,
        commerceName: commerces.name,
        commerceAddress: commerces.address,
        commerceLat: commerces.lat,
        commerceLng: commerces.lng,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .leftJoin(commerces, eq(commerces.id, orderItems.commerceId))
      .where(
        and(
          inArray(orders.status, ["accepted", "preparing"]),
          sql`${orders.driverId} IS NULL`
        )
      )
      .orderBy(orders.createdAt);

    const grouped = availableOrders.reduce((acc: any, o: any) => {
      if (!acc[o.id]) {
        acc[o.id] = { ...o, lat: o.commerceLat, lng: o.commerceLng };
      }
      return acc;
    }, {});

    return Object.values(grouped);
  }),

  updateStatus: publicQuery
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const result = await db.transaction(async (tx) => {
        const updateData: any = { status: input.status, updatedAt: new Date() };
        if (input.driverId && input.status !== "delivered") updateData.driverId = input.driverId;

        if (input.status === "delivered" && input.driverId) {
          const current = await tx.select().from(orders).where(eq(orders.id, input.id));
          const order = current[0];
          if (order && order.deliveryFee) {
            const today = new Date().toISOString().split("T")[0];
            await tx.insert(driverEarnings).values({
              driverId: input.driverId,
              orderId: input.id,
              amount: String(order.deliveryFee),
              type: "delivery_fee",
              date: today,
            });
            await tx.update(drivers)
              .set({ status: "online" })
              .where(eq(drivers.id, input.driverId));
          }
        }

        await tx.update(orders).set(updateData).where(eq(orders.id, input.id));

        await tx.insert(orderStatusHistory).values({
          orderId: input.id,
          status: input.status,
          notes: input.notes || `Estado actualizado a ${input.status}`,
        });

        if (input.driverId && input.status !== "delivered") {
          await tx.update(drivers).set({ status: "busy" }).where(eq(drivers.id, input.driverId));
        }

        const updated = await tx.select().from(orders).where(eq(orders.id, input.id));

        // Emit SSE event to notify order status change
        emit(`order:${input.id}`, { type: "status_update", status: input.status, driverId: input.driverId });

        // If order was accepted/preparing, notify drivers about available order
        if (input.status === "accepted" || input.status === "preparing") {
          emit("driver:all", { type: "new_available", orderId: input.id });
        }

        return updated[0];
      });

      return result;
    }),

  getCommerceOrders: publicQuery
    .input(z.object({ commerceId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.commerceId, input.commerceId))
        .orderBy(desc(orderItems.id));

      const orderIds = [...new Set(items.map(i => i.orderId))];
      const result = [];
      for (const oid of orderIds) {
        const order = await db.select().from(orders).where(eq(orders.id, oid));
        if (order.length > 0) {
          const orderItemsForOrder = items.filter(i => i.orderId === oid);
          let customerName = "";
          if (order[0].customerId) {
            const cust = await db.select().from(customers).where(eq(customers.id, order[0].customerId));
            if (cust.length > 0) {
              customerName = `${cust[0].firstName} ${cust[0].lastName}`;
            }
          }
          result.push({ ...order[0], items: orderItemsForOrder, customerName });
        }
      }
      return result;
    }),

  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }),
});
