import { loginRouter } from "./login-router";
import { customerRouter } from "./customer-router";
import { commerceRouter } from "./commerce-router";
import { productRouter } from "./product-router";
import { driverRouter } from "./driver-router";
import { orderRouter } from "./order-router";
import { chatRouter } from "./chat-router";
import { adminRouter } from "./admin-router";
import { categoryRouter } from "./category-router";
import { settingsRouter } from "./settings-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  login: loginRouter,
  customer: customerRouter,
  commerce: commerceRouter,
  product: productRouter,
  driver: driverRouter,
  order: orderRouter,
  chat: chatRouter,
  admin: adminRouter,
  category: categoryRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
