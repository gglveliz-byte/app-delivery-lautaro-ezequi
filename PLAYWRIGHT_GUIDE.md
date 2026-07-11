# Guía para Automatización E2E con Playwright

Basado en el código real del frontend. Sin `data-testid`. Todos los selectores sugeridos son text/placeholder/role.

> **Importante:** Usar `browser.newContext()` para cada rol. Cada contexto mantiene cookies y localStorage separados, permitiendo correr los 4 flujos en paralelo en el mismo archivo.

---

## 1. FASE DE PREPARACIÓN — Admin crea comercio y repartidor

### Login de Admin (`/login`)

Archivo: `src/pages/Login.tsx`

```
Tab:          page.getByRole('button', { name: "Email" })
Email:        page.getByPlaceholder('admin@admin.com')
Password:     page.getByPlaceholder('••••••')
Submit:       page.getByRole('button', { name: "Iniciar sesión" })
```

Redirige a `/admin`.

---

### Crear Comercio (`/admin/commerces`)

Archivo: `src/pages/admin/Commerces.tsx:251-288`

| Paso | Selector |
|------|----------|
| Botón "Nuevo" | `page.getByRole('button', { name: "Nuevo" })` |
| Nombre Comercial | `page.getByPlaceholder('Ej: Pizzería Don Juan')` |
| Correo | `page.getByPlaceholder('contacto@pizzeria.com')` |
| Contraseña | `page.getByPlaceholder('Min. 6 caracteres')` |
| Categoría | `page.locator('select').selectOption('1')` (usar el value numérico de la categoría) |
| Guardar | `page.getByRole('button', { name: "Crear comercio" })` |

> El modal se llama "Nuevo comercio" y crea las credenciales del merchant (dueño del local).

---

### Crear Repartidor (`/admin/drivers`)

Archivo: `src/pages/admin/Drivers.tsx:193-253`

| Paso | Selector |
|------|----------|
| Botón "Nuevo" | `page.getByRole('button', { name: "Nuevo" })` |
| Nombre | `page.getByPlaceholder('Ej: Carlos Ramírez')` |
| Teléfono | `page.locator('input[type="tel"]')` |
| Contraseña | `page.getByPlaceholder('Min. 6 caracteres')` |
| Vehículo | `page.getByPlaceholder('Ej: Moto Honda 150')` |
| Patente | `page.getByPlaceholder('Ej: ABC-123')` |
| Guardar | `page.getByRole('button', { name: "Guardar repartidor" })` |

> El repartidor usará **Teléfono + Contraseña** para login (NO email).

---

## 2. FASE DE NEGOCIO — Comercio crea productos

### Login Comercio (`/login`)

Mismos pasos que admin login con email/password. Usar el email y contraseña creados en el paso anterior.

Redirige a `/commerce`.

---

### Crear Producto (`/commerce/products`)

Archivo: `src/pages/commerce/Products.tsx:185-267`

| Paso | Selector |
|------|----------|
| Botón "Nuevo" | `page.getByRole('button', { name: "Nuevo" })` |
| Nombre | `page.getByPlaceholder('Ej: Hamburguesa Doble Queso')` |
| Precio | `page.getByPlaceholder('Ej: 15.50')` |
| Tipo venta | `page.locator('select').selectOption('unit')` (values: `"unit"` o `"kg"`) |
| Guardar | `page.getByRole('button', { name: "Crear producto" })` |

> El `select` tiene labels visibles "Por Unidad (Ej: 1 Hamburguesa)" y "Por Kilogramo (Ej: Carnes, Helado)", pero los values son `"unit"` y `"kg"`.

---

## 3. FASE DE COMPRA — Cliente

### Registro (`/register`)

Archivo: `src/pages/customer/Register.tsx`

| Paso | Selector |
|------|----------|
| Nombre | `page.getByPlaceholder('Tu nombre')` |
| Apellido | `page.getByPlaceholder('Tu apellido')` |
| Teléfono | `page.locator('input[type="tel"]')` |
| Dirección | `page.getByPlaceholder('Calle, número, colonia, ciudad')` (es un `<textarea>`, getByPlaceholder funciona igual) |
| Geolocalización (opcional) | `page.getByRole('button', { name: "Usar mi ubicación actual" })` |
| Submit | `page.getByRole('button', { name: "Crear cuenta" })` |

Redirige a `/home` automáticamente.

---

### Flujo de Pedido

#### 1. Home (`/home`)
Archivo: `src/pages/customer/Home.tsx`

- Buscar comercio: `page.getByPlaceholder('¿Qué deseas pedir hoy?')`
- Click en comercio: `page.getByText('Nombre del Comercio')`
  - También sirve click en la tarjeta completa (navega a `/commerce/:id`)

#### 2. Detalle de Comercio (`/commerce/:id`)
Archivo: `src/pages/customer/CommerceDetail.tsx`

Productos agrupados por categoría. Cada uno tiene botón `+`.

**Para productos normales** (`unitType === "unit"`):
```js
page.locator('div').filter({ hasText: 'Nombre Producto' }).locator('button').click()
// Agrega directo al carrito
```

**Para productos por kg** (`unitType === "kg"`):
```js
// Click en botón + abre modal
page.locator('div').filter({ hasText: 'Nombre Producto' }).locator('button').click()
// En el modal:
page.getByRole('button', { name: "Por Kilos" })  // o "Por Importe"
page.fill('input[type="number"]', "1")
page.getByRole('button', { name: "Agregar al carrito" }).click()
```

#### 3. Carrito (`/cart`)
Archivo: `src/pages/customer/Cart.tsx`

```js
// Seleccionar método de pago
page.getByRole('button', { name: "Efectivo" }).click()
// O
page.getByRole('button', { name: "Transferencia" }).click()

// Confirmar pedido (primer paso)
page.getByRole('button', { name: "Confirmar pedido" }).click()
```

#### 4. Modal de Dirección

```js
// Elegir "Mi dirección"
page.locator('button:has-text("Mi dirección")').click()
// ⚠️ NO usar getByRole exacto, el accessible name incluye "Sin dirección guardada"
```

**Si se eligió Transferencia**, además aparece un bloque para subir comprobante:
```js
page.locator('input[type="file"]').setInputFiles('recibo.jpg')
```

**Confirmar pedido (paso final):**
```js
page.getByRole('button', { name: "Confirmar pedido" }).click()
```

#### 5. Post-Confirmación

Muestra "Pedido confirmado!" con el número de orden.

**Flujo de estados según método de pago:**
- **Efectivo (cash):** orden arranca en `received`
- **Transferencia:** orden arranca en `pending_payment` → necesita admin apruebe primero

---

## 4. FASE OPERATIVA — Admin, Comercio, Repartidor

### (Solo si pagó con transferencia) Admin aprueba pago

Archivo: `src/pages/admin/Orders.tsx:200-299`

```js
// Ir a /admin/orders
await page.goto('/admin/orders')

// Filtrar por "Por Pagar" (opcional)
await page.getByRole('button', { name: "Por Pagar" }).click()

// Click en ojito de detalles
await page.locator('button[title="Ver detalles"]').first().click()

// En el modal: Aprobar pago
await page.getByRole('button', { name: "Aprobar Pago" }).click()
```

**tRPC:** `admin.updateOrderStatus({ id, status: "received" })`

---

### Comercio prepara el pedido

Archivo: `src/pages/commerce/Orders.tsx:127-244`

```js
// Ir a /commerce/orders
await page.goto('/commerce/orders')

// (Opcional) Filtrar "Nuevos"
await page.getByRole('button', { name: "Nuevos" }).click()

// Preparar pedido (cambia received → preparing)
await page.getByRole('button', { name: "Preparar" }).click()

// Marcar listo (cambia preparing → ready_for_pickup)
await page.getByRole('button', { name: "Marcar listo" }).click()

// Verificar estado
await page.waitForSelector('text="Listo - esperando repartidor"')
```

---

### Repartidor entrega el pedido

#### Login Repartidor (`/login`)

```js
// El repartidor usa TELÉFONO + CONTRASEÑA
await page.getByRole('button', { name: "Teléfono" }).click()
await page.locator('input[type="tel"]').fill('111223344')
await page.getByPlaceholder('••••••').fill('password123')
await page.getByRole('button', { name: "Iniciar sesión" }).click()
// Redirige a /driver
```

#### Driver Home (`/driver`)
Archivo: `src/pages/driver/DriverHome.tsx`

El driver se pone **online automáticamente** al entrar a `/driver`.

```js
// Aceptar el primer pedido disponible
await page.getByRole('button', { name: "Aceptar" }).click()
// Redirige a /driver/order/:id
```

#### Driver Order (`/driver/order/:id`)
Archivo: `src/pages/driver/DriverOrder.tsx`

```js
// Esperar que el comercio esté listo (puede demorar por SSE)
await page.waitForSelector('text="Recoger"', { timeout: 30000 })

// Recoger de cada comercio
const recogerBtns = page.locator('button:has-text("Recoger")')
const count = await recogerBtns.count()
for (let i = 0; i < count; i++) {
  await recogerBtns.nth(0).click()
  await page.waitForTimeout(2000) // esperar actualización SSE
}

// Viajando al cliente
await page.getByRole('button', { name: "Camino al cliente" }).click()

// Completar entrega
await page.getByRole('button', { name: "Completar entrega" }).click()

// Verificar
await page.waitForSelector('text="Entrega completada!"')
// Auto-redirige a /driver después de 3s
```

---

## 5. Ciclo Vital del Pedido (Estados)

```
EFECTIVO:
  received → preparing → ready_for_pickup → picked_up → on_the_way → delivered

TRANSFERENCIA:
  pending_payment →(admin aprueba)→ received → preparing → ready_for_pickup → picked_up → on_the_way → delivered

CANCELACIÓN (cualquier estado):
  → cancelled

RECHAZO DE PAGO:
  pending_payment → payment_rejected
```

| Estado | Quién actúa | Acción |
|--------|-------------|--------|
| `pending_payment` | Admin | "Aprobar Pago" → `received` |
| `received` | Commerce | "Preparar" → `preparing` |
| `preparing` | Commerce | "Marcar listo" → `ready_for_pickup` |
| `ready_for_pickup` | Driver | "Aceptar" + "Recoger" → `picked_up` |
| `picked_up` | Driver | "Camino al cliente" → `on_the_way` |
| `on_the_way` | Driver | "Completar entrega" → `delivered` |

---

## 6. Sesión y localStorage

```js
// Compartido por todos los roles
localStorage.setItem("qs_session", JSON.stringify({ role, ts }))

// Merchant (usuario de comercio)
localStorage.setItem("merchant_user", JSON.stringify({ id, name, email, ... }))

// Driver
localStorage.setItem("driver_user", JSON.stringify({ id, name, ... }))

// Customer: NO guarda en localStorage. Usa el hook useCustomerSession.
```

Playwright con `browser.newContext()` mantiene el `localStorage` y cookies separados por contexto. Cada rol en su propio contexto → no hay interferencia.

---

## 7. Estrategia de Selectores (sin data-testid)

| Estrategia | Ejemplo |
|------------|---------|
| Texto exacto | `page.getByRole('button', { name: "Preparar" })` |
| Texto contenido | `page.locator('button:has-text("Mi dirección")')` |
| Placeholder | `page.getByPlaceholder('admin@admin.com')` |
| Tipo de input | `page.locator('input[type="tel"]')`, `input[type="file"]` |
| Atributo title | `page.locator('button[title="Ver detalles"]')` |
| Combinación | `page.locator('div').filter({ hasText: 'Producto X' }).locator('button')` |

**⚠️ No usar clases de Tailwind como selectores:** las clases como `bg-[#2E7D32]` son dinámicas y frágiles.

---

## 8. Arquitectura recomendada del test

```
tests/e2e/
  fixtures/
    auth.ts             — Helpers: loginAdmin(), loginMerchant(), loginDriver(), registerCustomer()
    data.ts             — Datos de prueba: credenciales, nombres de comercio/producto
  flows/
    admin-setup.spec.ts — Crear comercio + repartidor (1 vez)
    customer-flow.spec.ts — Registro + orden
    admin-flow.spec.ts    — Aprobación de pago
    commerce-flow.spec.ts — Preparación y marcado
    driver-flow.spec.ts   — Aceptación y entrega
  full-cycle.spec.ts   — Test que coordina los 4 roles con page contexts paralelos
```

### full-cycle.spec.ts (pseudo-código)

```js
test('flujo completo multi-rol', async ({ browser }) => {
  // Crear 4 contextos independientes
  const ctxAdmin = await browser.newContext()
  const ctxCommerce = await browser.newContext()
  const ctxDriver = await browser.newContext()
  const ctxCustomer = await browser.newContext()

  // Cada contexto maneja su propia página
  const adminPage = await ctxAdmin.newPage()
  const commercePage = await ctxCommerce.newPage()
  const driverPage = await ctxDriver.newPage()
  const customerPage = await ctxCustomer.newPage()

  // 1. ADMIN: crear comercio y repartidor
  await loginAdmin(adminPage)
  await createCommerce(adminPage, commerceData)
  await createDriver(adminPage, driverData)

  // 2. COMMERCE: login y crear producto
  await loginMerchant(commercePage, commerceData)
  await createProduct(commercePage, productData)

  // 3. CUSTOMER: registrarse y hacer pedido
  await registerCustomer(customerPage, customerData)
  const orderId = await placeOrder(customerPage, productData, paymentMethod)

  // 4. ADMIN: (solo transfer) aprobar pago
  if (paymentMethod === 'transfer') {
    await approvePayment(adminPage, orderId)
  }

  // 5. COMMERCE: preparar y marcar listo
  await prepareOrder(commercePage, orderId)
  await markReady(commercePage, orderId)

  // 6. DRIVER: login, aceptar, recoger, entregar
  await loginDriver(driverPage, driverData)
  await acceptAndDeliver(driverPage, orderId)

  // 7. CUSTOMER: verificar tracking
  await verifyOrderDelivered(customerPage, orderId)
})
```
