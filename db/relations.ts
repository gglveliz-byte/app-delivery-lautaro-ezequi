import { relations } from "drizzle-orm";
import { customers, drivers, categories, commerces, products, orders, orderItems, chatMessages, orderStatusHistory } from "./schema";

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const driversRelations = relations(drivers, ({ many }) => ({
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  commerces: many(commerces),
}));

export const commercesRelations = relations(commerces, ({ one, many }) => ({
  category: one(categories, { fields: [commerces.categoryId], references: [categories.id] }),
  products: many(products),
  orders: many(orderItems),
}));

export const productsRelations = relations(products, ({ one }) => ({
  commerce: one(commerces, { fields: [products.commerceId], references: [commerces.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  driver: one(drivers, { fields: [orders.driverId], references: [drivers.id] }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  messages: many(chatMessages),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  commerce: one(commerces, { fields: [orderItems.commerceId], references: [commerces.id] }),
}));
