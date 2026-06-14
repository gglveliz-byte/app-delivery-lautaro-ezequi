# DeliveryCity - Rutas Disponibles

## Cliente (Customer) - Público
- http://localhost:3000/             → Bienvenida (botón "Crear cuenta")
- http://localhost:3000/register     → Registro (nombre, apellido, celular, dirección)
- http://localhost:3000/customer-login → Login para clientes existentes (solo teléfono)
- http://localhost:3000/home         → Pantalla principal (categorías, comercios, productos)
- http://localhost:3000/search       → Búsqueda de productos/comercios
- http://localhost:3000/commerce/:id → Perfil del comercio
- http://localhost:3000/cart         → Carrito de compras
- http://localhost:3000/order/:id    → Seguimiento del pedido
- http://localhost:3000/chat/:orderId → Chat con comercio/repartidor
- http://localhost:3000/profile      → Perfil del cliente

## Login General (Admin, Repartidor, Comercio)
- http://localhost:3000/login        → Inicio de sesión (email o teléfono + contraseña)

## Repartidor (Driver)
- http://localhost:3000/driver            → Pedidos disponibles
- http://localhost:3000/driver/order/:id  → Pedido activo
- http://localhost:3000/driver/earnings   → Ganancias
- http://localhost:3000/driver/profile    → Perfil

## Restaurante (Commerce)
- http://localhost:3000/commerce          → Dashboard
- http://localhost:3000/commerce/orders   → Pedidos recibidos
- http://localhost:3000/commerce/products → Gestión de productos
- http://localhost:3000/commerce/stats    → Estadísticas

## Administrador (Admin)
- http://localhost:3000/admin              → Dashboard general
- http://localhost:3000/admin/commerces    → Gestión de comercios
- http://localhost:3000/admin/drivers      → Gestión de repartidores
- http://localhost:3000/admin/orders       → Todas las órdenes
- http://localhost:3000/admin/products     → Todos los productos
- http://localhost:3000/admin/settings     → Configuración

## Notas
- **Clientes**: Se registran en `/register` → auto-login → `/home`
- **Admin**: Login en `/login` con email (admin@quickgo.com / admin123)
- **Repartidores**: Creados por admin, login en `/login` con teléfono + contraseña
- **Comercios**: Creados por admin, login en `/login` con email + contraseña