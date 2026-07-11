import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

async function empty() {
  console.log("Vaciando base de datos...");

  await db.execute(sql`DELETE FROM chat_messages`);
  await db.execute(sql`DELETE FROM driver_earnings`);
  await db.execute(sql`DELETE FROM order_status_history`);
  await db.execute(sql`DELETE FROM order_commerce_status`);
  await db.execute(sql`DELETE FROM order_items`);
  await db.execute(sql`DELETE FROM orders`);
  await db.execute(sql`DELETE FROM products`);
  await db.execute(sql`DELETE FROM customers`);
  await db.execute(sql`DELETE FROM drivers`);
  await db.execute(sql`DELETE FROM commerces`);
  await db.execute(sql`DELETE FROM categories`);
  await db.execute(sql`DELETE FROM users`);
  await db.execute(sql`DELETE FROM app_settings`);

  await db.execute(sql`SELECT setval('categories_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('commerces_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('products_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('drivers_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('customers_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('orders_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('order_items_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('users_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('driver_earnings_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('order_status_history_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('order_commerce_status_id_seq', 1, false)`);
  await db.execute(sql`SELECT setval('chat_messages_id_seq', 1, false)`);

  console.log("Base de datos vacia!");
  await pool.end();
  process.exit(0);
}

empty().catch(err => { console.error(err); process.exit(1); });
