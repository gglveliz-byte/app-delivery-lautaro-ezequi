import { z } from "zod";
import { createRouter, publicQuery, driverQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { drivers, driverEarnings, orders, orderStatusHistory } from "@db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { emit } from "./events";

export const driverRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(drivers);
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(drivers).where(eq(drivers.id, input.id));
      return result[0] || null;
    }),

  getProfile: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const driver = await db.select().from(drivers).where(eq(drivers.id, input.id));
      if (driver.length === 0) return null;

      const earnings = await db.select().from(driverEarnings).where(eq(driverEarnings.driverId, input.id));
      const totalEarnings = earnings.reduce((acc, e) => acc + parseFloat(String(e.amount)), 0);

      return {
        ...driver[0],
        totalEarnings: totalEarnings.toFixed(2),
      };
    }),

  updateStatus: driverQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["online", "busy", "offline"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(drivers).set({ status: input.status }).where(eq(drivers.id, input.id));
      const result = await db.select().from(drivers).where(eq(drivers.id, input.id));
      return result[0];
    }),

  updateLocation: driverQuery
    .input(
      z.object({
        id: z.number(),
        lat: z.string(),
        lng: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(drivers)
        .set({ currentLat: input.lat, currentLng: input.lng })
        .where(eq(drivers.id, input.id));

      // Emit SSE event to notify about driver location update
      emit(`driver:${input.id}`, { type: "location_update", lat: input.lat, lng: input.lng });

      return { success: true };
    }),

  updateProfile: driverQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        vehicle: z.string().optional(),
        licensePlate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.vehicle !== undefined) updateData.vehicle = data.vehicle;
      if (data.licensePlate !== undefined) updateData.licensePlate = data.licensePlate;
      if (Object.keys(updateData).length > 0) {
        await db.update(drivers).set(updateData).where(eq(drivers.id, id));
      }
      const result = await db.select().from(drivers).where(eq(drivers.id, id));
      return result[0];
    }),

  getEarnings: driverQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      return db.select().from(driverEarnings).where(eq(driverEarnings.driverId, input.id));
    }),

  getActiveOrders: driverQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      return db
        .select({
          id: orders.id,
          status: orders.status,
          total: orders.total,
          deliveryFee: orders.deliveryFee,
          deliveryAddress: orders.deliveryAddress,
          customerPhone: orders.customerPhone,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.driverId, input.id),
            inArray(orders.status, ["driver_assigned", "preparing", "picked_up", "on_the_way"])
          )
        )
        .orderBy(desc(orders.createdAt));
    }),

  acceptOrder: driverQuery
    .input(z.object({ driverId: z.number(), orderId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const result = await db.transaction(async (tx) => {
        const orderResult = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId))
          .for("update");
        const order = orderResult[0];
        if (!order) throw new Error("Pedido no encontrado");
        if (order.driverId) throw new Error("Pedido ya asignado");

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
          notes: "Conductor asignado",
        });

        await tx.update(drivers).set({ status: "busy" }).where(eq(drivers.id, input.driverId));

        const updated = await tx.select().from(orders).where(eq(orders.id, input.orderId));

        // Emit SSE events to notify about order assignment
        emit(`order:${input.orderId}`, { type: "status_update", status: "driver_assigned", driverId: input.driverId });
        emit(`driver:${input.driverId}`, { type: "order_assigned", orderId: input.orderId });

        return updated[0];
      });

      return result;
    }),
});
