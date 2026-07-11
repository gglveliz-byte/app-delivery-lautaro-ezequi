import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

async function check() {
  console.log("\n═══════════════════════════════════════");
  console.log("  REVISION COMPLETA DE BD");
  console.log("═══════════════════════════════════════\n");

  async function count(table: string, label: string) {
    const r = await db.execute(sql.raw(`SELECT COUNT(*)::int AS count FROM ${table}`));
    console.log(`  ${label.padEnd(30)} ${r.rows[0].count} registros`);
  }
  await count("users", "Usuarios");
  await count("commerces", "Comercios");
  await count("drivers", "Repartidores");
  await count("customers", "Clientes");
  await count("products", "Productos");
  await count("orders", "Pedidos");
  await count("order_items", "Items de pedidos");
  await count("order_status_history", "Historial de estados");
  await count("order_commerce_status", "Estados por comercio");
  await count("driver_earnings", "Ganancias repartidores");
  await count("chat_messages", "Mensajes chat");
  await count("categories", "Categorias");
  await count("app_settings", "Configuracion");

  console.log("\n── USUARIOS ──");
  const users = await db.execute(sql`SELECT id, name, email, role FROM users ORDER BY id`);
  for (const u of users.rows) console.log(`  #${u.id} ${u.name} (${u.email}) [${u.role}]`);

  console.log("\n── COMERCIOS ──");
  const comms = await db.execute(sql`SELECT id, name, status, commission_rate FROM commerces ORDER BY id`);
  for (const c of comms.rows) console.log(`  #${c.id} ${c.name} | estado: ${c.status} | comision: ${c.commission_rate}%`);

  console.log("\n── REPARTIDORES ──");
  const drivers = await db.execute(sql`SELECT id, name, phone, status, commission_rate, total_earnings FROM drivers ORDER BY id`);
  for (const d of drivers.rows) console.log(`  #${d.id} ${d.name} (${d.phone}) | estado: ${d.status} | ganancia: ${d.commission_rate}% | total: $${d.total_earnings}`);

  console.log("\n── PRODUCTOS ──");
  const prods = await db.execute(sql`SELECT id, name, price, commerce_id, unit_type FROM products ORDER BY commerce_id, id`);
  for (const p of prods.rows) console.log(`  #${p.id} ${p.name} | $${p.price} | comercio #${p.commerce_id} | ${p.unit_type}`);

  console.log("\n── CLIENTES ──");
  const custs = await db.execute(sql`SELECT id, first_name, last_name, phone, address FROM customers ORDER BY id`);
  for (const c of custs.rows) console.log(`  #${c.id} ${c.first_name} ${c.last_name} (${c.phone}) | ${c.address}`);

  console.log("\n── PEDIDOS ──");
  const orders = await db.execute(sql`SELECT id, status, total, delivery_fee, commission, payment_method, customer_id, driver_id, created_at FROM orders ORDER BY id`);
  for (const o of orders.rows) {
    console.log(`  #${o.id} | ${o.status} | total: $${o.total} | envio: $${o.delivery_fee} | comision: $${o.commission} | pago: ${o.payment_method}`);
    console.log(`         cliente #${o.customer_id} | driver #${o.driver_id} | ${o.created_at}`);
  }

  if (orders.rows.length > 0) {
    console.log("\n── ITEMS DE PEDIDOS ──");
    const items = await db.execute(sql`SELECT oi.order_id, oi.commerce_id, oi.product_id, oi.quantity, oi.total, p.name AS product_name, c.name AS commerce_name FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id LEFT JOIN commerces c ON c.id = oi.commerce_id ORDER BY oi.order_id`);
    for (const i of items.rows) console.log(`  Pedido #${i.order_id} | ${i.commerce_name} | ${i.product_name} x${i.quantity} | $${i.total}`);
  }

  console.log("\n── GANANCIAS REPARTIDORES ──");
  const earnings = await db.execute(sql`SELECT de.driver_id, d.name, de.order_id, de.amount, de.type FROM driver_earnings de LEFT JOIN drivers d ON d.id = de.driver_id ORDER BY de.driver_id`);
  for (const e of earnings.rows) console.log(`  ${e.name} | pedido #${e.order_id} | $${e.amount} (${e.type})`);

  console.log("\n── APP SETTINGS ──");
  const settings = await db.execute(sql`SELECT key, value FROM app_settings ORDER BY key`);
  for (const s of settings.rows) console.log(`  ${s.key} = ${s.value}`);

  console.log("\n═══════════════════════════════════════\n");
  await pool.end();
  process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
