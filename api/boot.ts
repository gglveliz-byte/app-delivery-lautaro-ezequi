import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { streamSSE } from "hono/streaming";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { subscribe } from "./events";

async function seedAdmin() {
  try {
    const { seedAdminUser } = await import("./login-router");
    await seedAdminUser();
  } catch (e) {
    console.warn("[boot] seedAdmin failed:", e);
  }
}

const app = new Hono<{ Bindings: HttpBindings }>();

seedAdmin();

app.use("*", async (c, next) => {
  await next();
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org; font-src 'self' data:; worker-src 'self' blob:;");
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// SSE endpoints for real-time updates
app.get("/api/events/orders/:orderId", async (c) => {
  const orderId = c.req.param("orderId");
  return streamSSE(c, async (stream) => {
    const unsubscribe = subscribe(`order:${orderId}`, (data) => {
      stream.writeSSE({ data: JSON.stringify(data), event: "update" });
    });

    // Keep connection alive
    while (true) {
      await stream.sleep(30000);
      stream.writeSSE({ data: "ping", event: "ping" });
    }

    unsubscribe();
  });
});

app.get("/api/events/commerce/:commerceId", async (c) => {
  const commerceId = c.req.param("commerceId");
  return streamSSE(c, async (stream) => {
    const unsubscribe = subscribe(`commerce:${commerceId}`, (data) => {
      stream.writeSSE({ data: JSON.stringify(data), event: "update" });
    });

    while (true) {
      await stream.sleep(30000);
      stream.writeSSE({ data: "ping", event: "ping" });
    }

    unsubscribe();
  });
});

app.get("/api/events/driver/:driverId", async (c) => {
  const driverId = c.req.param("driverId");
  return streamSSE(c, async (stream) => {
    const unsubscribe = subscribe(`driver:${driverId}`, (data) => {
      stream.writeSSE({ data: JSON.stringify(data), event: "update" });
    });

    while (true) {
      await stream.sleep(30000);
      stream.writeSSE({ data: "ping", event: "ping" });
    }

    unsubscribe();
  });
});

app.all("/api/trpc/*", async (c) => {
  console.log("[tRPC] matched:", c.req.method, c.req.path);
  try {
    return await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext,
    });
  } catch (err) {
    console.error("[tRPC] handler error:", err);
    throw err;
  }
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
