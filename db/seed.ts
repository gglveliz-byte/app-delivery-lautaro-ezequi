import "dotenv/config";
import { getDb } from "../api/queries/connection";
import { categories, commerces, products, appSettings, users } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  const db = getDb();

  // Clear all tables
  await db.execute(sql`DELETE FROM order_status_history`);
  await db.execute(sql`DELETE FROM chat_messages`);
  await db.execute(sql`DELETE FROM driver_earnings`);
  await db.execute(sql`DELETE FROM order_items`);
  await db.execute(sql`DELETE FROM orders`);
  await db.execute(sql`DELETE FROM products`);
  await db.execute(sql`DELETE FROM commerces`);
  await db.execute(sql`DELETE FROM categories`);
  await db.execute(sql`DELETE FROM customers`);
  await db.execute(sql`DELETE FROM drivers`);
  await db.execute(sql`DELETE FROM users`);
  await db.execute(sql`DELETE FROM app_settings`);

  // Reset auto-increment sequences
  await db.execute(sql`SELECT setval('categories_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('commerces_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('products_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('drivers_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('customers_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('orders_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('order_items_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('driver_earnings_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('app_settings_id_seq', 1, false)`);

  console.log("Seeding categories...");
  await db.insert(categories).values([
    { name: "Comidas", icon: "UtensilsCrossed", color: "#E65100", sortOrder: 1 },
    { name: "Panaderías", icon: "Croissant", color: "#F9A825", sortOrder: 2 },
    { name: "Supermercados", icon: "ShoppingCart", color: "#2E7D32", sortOrder: 3 },
    { name: "Farmacias", icon: "Pill", color: "#1565C0", sortOrder: 4 },
    { name: "Heladerías", icon: "IceCreamCone", color: "#AD1457", sortOrder: 5 },
    { name: "Bebidas", icon: "Coffee", color: "#6A1B9A", sortOrder: 6 },
    { name: "Mascotas", icon: "Dog", color: "#5D4037", sortOrder: 7 },
    { name: "Otros", icon: "MoreHorizontal", color: "#757575", sortOrder: 8 },
  ]);

  console.log("Skipping commerces seeding for test bot...");

  console.log("Skipping products seeding for test bot...");

  // Seed app settings
  console.log("Seeding app settings...");
  await db.insert(appSettings).values([
    { key: "app_name", value: "YA LLEGA" },
    { key: "support_phone", value: "+54 9 11 1234-5678" },
    { key: "delivery_fee", value: "500" },
    { key: "commission_rate", value: "15" },
    { key: "min_order_amount", value: "2000" },
  ]);

  // Seed admin user
  console.log("Seeding admin user...");
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await db.insert(users).values([
    {
      unionId: "admin-local",
      email: "admin@admin.com",
      name: "Administrador",
      passwordHash: adminHash,
      role: "admin",
    },
  ]);

  console.log("Skipping merchant users seeding for test bot...");

  console.log("Seed completed!");
}

seed().catch(console.error);
