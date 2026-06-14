import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { chatMessages } from "@db/schema";
import { eq, and, ne } from "drizzle-orm";

export const chatRouter = createRouter({
  send: publicQuery
    .input(
      z.object({
        orderId: z.number(),
        senderType: z.enum(["customer", "commerce", "driver"]),
        senderId: z.number(),
        senderName: z.string(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(chatMessages).values(input).returning();
      return result[0];
    }),

  getByOrder: publicQuery
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.orderId, input.orderId))
        .orderBy(chatMessages.createdAt);
    }),

  markAsRead: publicQuery
    .input(z.object({ orderId: z.number(), readerType: z.enum(["customer", "commerce", "driver"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(chatMessages)
        .set({ isRead: "yes" })
        .where(
          and(
            eq(chatMessages.orderId, input.orderId),
            ne(chatMessages.senderType, input.readerType)
          )
        );
      return { success: true };
    }),
});
