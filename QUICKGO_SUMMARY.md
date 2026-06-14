# 📋 Resumen General del Sistema QuickGo

## 🎯 ¿Qué es este sistema?
Plataforma de delivery multi-comercio que conecta a 4 tipos de usuarios dentro de una misma ciudad, funcionando como un "centro comercial virtual" con entrega a domicilio.

**Diferencia clave vs Rappi/PedidosYa/Uber Eats:**
- Apps tradicionales: 3 pedidos separados, 3 envíos, 3 entregas
- QuickGo: Todo en un solo pedido, un solo envío, una sola entrega

---

## 👥 Los 4 actores del sistema

| Actor | Quién es | Qué hace | Usa |
|-------|----------|----------|-----|
| 🧑 Cliente | Persona que pide comida/productos | Busca, compra y recibe pedidos | App móvil |
| 🏪 Comercio | Negocio que vende productos | Recibe pedidos y prepara lo vendido | Panel web |
| 🏍️ Repartidor | Persona que entrega | Recoge y lleva los pedidos | App móvil |
| ⚙️ Administrador | Dueño de la plataforma | Controla todo el negocio | Panel web |

---

## 🔄 Flujo principal de un pedido (ejemplo real)

**Juan quiere cenar: pizza, gaseosa y helado.**

1. Abre QuickGo y busca "pizza"
2. Agrega pizza a su carrito
3. Busca "gaseosa" y agrega al carrito
4. Busca "helado" y agrega al carrito
5. Confirma el pedido (3 comercios distintos)
6. QuickGo crea 3 sub-pedidos internos
7. Repartidor acepta el pedido único
8. Repartidor va a los 3 comercios
9. Repartidor entrega todo a Juan

---

## 💡 Función estrella: Pedido Multi-Comercio

El sistema automáticamente:
1. Divide el pedido en "sub-pedidos" para cada comercio
2. Calcula una ruta eficiente para el repartidor
3. Cobra un solo envío al cliente
4. Paga a cada comercio su parte

---

## 📱 Los 4 módulos del sistema

### 1. App Cliente (móvil)
- Registro simple: nombre, apellido, celular, dirección
- Buscador y 8 categorías
- Carrito multi-comercio
- Pago en efectivo o transferencia
- Seguimiento en tiempo real con mapa
- Chat con comercio y repartidor

### 2. App Repartidor (móvil)
- Ve pedidos disponibles cerca
- Acepta los que le convengan
- Sigue ruta con Google Maps
- Marca estados (camino al comercio → esperando → camino al cliente → entregado)
- Ve ganancias diarias/semanales/mensuales

### 3. Panel Comercio (web)
- Notificación instantánea de pedidos
- Acepta o rechaza pedidos
- Gestiona menú (productos, precios, fotos)
- Ve ubicación del repartidor en tiempo real
- Consulta estadísticas de ventas

### 4. Panel Administrativo (web)
- Ve TODO en tiempo real
- Aprueba o suspende comercios
- Controla repartidores (mapa en vivo)
- Configura comisiones y tarifas
- Genera reportes en PDF/Excel
- Rankings de mejores comercios/productos

---

## 💰 Modelo de negocio

1. **Comisión al comercio** (ej: 15% de cada venta)
2. **Costo de envío** (se cobra al cliente, se paga al repartidor, diferencia = ganancia)
3. **Comisión de servicio** (ej: 2% adicional al cliente)

---

## 🎨 Estilo visual
- **Color principal:** Verde (#2E7D32)
- **Fondo:** Blanco limpio
- **Tipografía:** Inter
- **Estilo:** Simple, fotos grandes, botones visibles
- **Inspiración:** PedidosYa, iFood, Uber Eats