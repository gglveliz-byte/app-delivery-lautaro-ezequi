import { z } from "zod";
import { createRouter, publicQuery, merchantQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, orderStatusHistory, products, drivers, commerces, customers, driverEarnings, orderCommerceStatus } from "@db/schema";
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

        // Create per-commerce status rows (preparing by default)
        const commerceIds = [...new Set(itemsData.map(i => i.commerceId))];
        for (const cId of commerceIds) {
          await tx.insert(orderCommerceStatus).values({
            orderId,
            commerceId: cId,
            status: "preparing",
          });
        }

        // Emit SSE events to notify commerces about new order
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

      // Get per-commerce status
      const commerceStatuses = await db
        .select()
        .from(orderCommerceStatus)
        .where(eq(orderCommerceStatus.orderId, input.id));

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

      // Attach commerce status to each commerce
      const commercesWithStatus = commerceList.map(c => ({
        ...c,
        status: commerceStatuses.find(cs => cs.commerceId === c.id)?.status || "preparing",
      }));

      return { ...order[0], items, history, driver, commerces: commercesWithStatus, commerceStatuses };
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
          inArray(orders.status, ["ready_for_pickup"]),
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
          "ready_for_pickup",
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

        return updated[0];
      });

      // Notify online drivers when order is ready for pickup
      if (input.status === "ready_for_pickup") {
        const onlineDrivers = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.status, "online"));
        onlineDrivers.forEach((driver) => {
          emit(`driver:${driver.id}`, { type: "new_available", orderId: input.id });
        });
      }

      return result;
    }),

  markCommerceReady: merchantQuery
    .input(z.object({ orderId: z.number(), commerceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Verify the commerce owns items in this order
      const orderItemsResult = await db
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.orderId, input.orderId), eq(orderItems.commerceId, input.commerceId)));

      if (orderItemsResult.length === 0) {
        throw new Error("Este comercio no tiene items en este pedido");
      }

      // Update the commerce status to ready_for_pickup
      const result = await db.transaction(async (tx) => {
        await tx
          .update(orderCommerceStatus)
          .set({ status: "ready_for_pickup", updatedAt: new Date() })
          .where(and(eq(orderCommerceStatus.orderId, input.orderId), eq(orderCommerceStatus.commerceId, input.commerceId)));

        // Check if all commerces for this order are ready
        const allStatuses = await tx
          .select()
          .from(orderCommerceStatus)
          .where(eq(orderCommerceStatus.orderId, input.orderId));

        const allReady = allStatuses.every(s => s.status === "ready_for_pickup");

        if (allReady) {
          // Update order status to ready_for_pickup
          await tx
            .update(orders)
            .set({ status: "ready_for_pickup", updatedAt: new Date() })
            .where(eq(orders.id, input.orderId));

          await tx.insert(orderStatusHistory).values({
            orderId: input.orderId,
            status: "ready_for_pickup",
            notes: "Todos los comercios listos para retirar",
          });

          // Notify online drivers
          const onlineDrivers = await tx.select({ id: drivers.id }).from(drivers).where(eq(drivers.status, "online"));
          onlineDrivers.forEach((driver) => {
            emit(`driver:${driver.id}`, { type: "new_available", orderId: input.orderId });
          });

          emit(`order:${input.orderId}`, { type: "status_update", status: "ready_for_pickup" });
        }

        // Emit commerce ready event
        emit(`commerce:${input.commerceId}`, { type: "commerce_ready", orderId: input.orderId });
        emit(`order:${input.orderId}`, { type: "commerce_ready", commerceId: input.commerceId });

        return { allReady };
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

      // Get per-commerce statuses for these orders
      const commerceStatuses = await db
        .select()
        .from(orderCommerceStatus)
        .where(and(eq(orderCommerceStatus.commerceId, input.commerceId), inArray(orderCommerceStatus.orderId, orderIds)));

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
          // Find this commerce's status for this order
          const myCommerceStatus = commerceStatuses.find(cs => cs.orderId === oid && cs.commerceId === input.commerceId);
          result.push({ ...order[0], items: orderItemsForOrder, customerName, myCommerceStatus: myCommerceStatus?.status || "preparing" });
        }
      }
      return result;
    }),

  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }),
});
