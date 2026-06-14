import { getDb } from "../api/queries/connection";
import {
  categories,
  commerces,
  products,
  drivers,
  driverEarnings,
  customers,
  orders,
  orderItems,
  orderStatusHistory,
  chatMessages,
  appSettings,
  users,
} from "../db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  const db = getDb();

  // Clear existing data
  await db.delete(chatMessages);
  await db.delete(orderStatusHistory);
  await db.delete(orderItems);
  await db.delete(driverEarnings);
  await db.delete(orders);
  await db.delete(products);
  await db.delete(commerces);
  await db.delete(categories);
  await db.delete(drivers);
  await db.delete(customers);
  await db.delete(appSettings);

// Reset auto-increment sequences
   await db.execute(sql`SELECT setval('categories_id_seq', 1, false)`);
   await db.execute(sql`SELECT setval('commerces_id_seq', 1, false)`);
   await db.execute(sql`SELECT setval('products_id_seq', 1, false)`);
   await db.execute(sql`SELECT setval('drivers_id_seq', 1, false)`);
   await db.execute(sql`SELECT setval('customers_id_seq', 1, false)`);
   await db.execute(sql`SELECT setval('orders_id_seq', 1, false)`);
   await db.execute(sql`SELECT setval('order_items_id_seq', 1, false)`);
   await db.execute(sql`SELECT setval('driver_earnings_id_seq', 1, false)`);

  console.log("Seeding categories...");
  const cats = await db.insert(categories).values([
    { name: "Comidas", icon: "UtensilsCrossed", color: "#E65100", sortOrder: 1 },
    { name: "Panaderías", icon: "Croissant", color: "#F9A825", sortOrder: 2 },
    { name: "Supermercados", icon: "ShoppingCart", color: "#2E7D32", sortOrder: 3 },
    { name: "Farmacias", icon: "Pill", color: "#1565C0", sortOrder: 4 },
    { name: "Heladerías", icon: "IceCreamCone", color: "#AD1457", sortOrder: 5 },
    { name: "Bebidas", icon: "Coffee", color: "#6A1B9A", sortOrder: 6 },
    { name: "Mascotas", icon: "Dog", color: "#5D4037", sortOrder: 7 },
    { name: "Otros", icon: "MoreHorizontal", color: "#757575", sortOrder: 8 },
  ]);

  console.log("Seeding commerces...");
  const comms = await db.insert(commerces).values([
    {
      name: "Burger King Express",
      description: "Las mejores hamburguesas de la ciudad. Carne 100% nacional, pan artesanal y salsas caseras.",
      logo: "https://picsum.photos/seed/burger-logo/200/200",
      coverImage: "https://picsum.photos/seed/burger-cover/800/400",
      categoryId: 1,
      address: "Av. Principal 1234, Ciudad Central",
      phone: "555-0101",
      minOrder: "5.00",
      deliveryTime: "25-35 min",
      rating: "4.7",
      status: "active",
      isOpen: "open",
      openHours: "Lun-Dom: 10:00 - 22:00",
      commissionRate: "8.00",
      lat: "-33.45",
      lng: "-70.65",
    },
    {
      name: "Sushi Roll",
      description: "Auténtico sushi japonés preparado por chefs expertos. Frescura garantizada.",
      logo: "https://picsum.photos/seed/sushi-logo/200/200",
      coverImage: "https://picsum.photos/seed/sushi-cover/800/400",
      categoryId: 1,
      address: "Calle Los Robles 567, Barrio Norte",
      phone: "555-0102",
      minOrder: "8.00",
      deliveryTime: "30-40 min",
      rating: "4.8",
      status: "active",
      isOpen: "open",
      openHours: "Lun-Sáb: 12:00 - 23:00",
      commissionRate: "10.00",
      lat: "-33.44",
      lng: "-70.66",
    },
    {
      name: "Panadería San José",
      description: "Pan artesanal recién horneado todos los días. Pasteles, tartas y café de especialidad.",
      logo: "https://picsum.photos/seed/bakery-logo/200/200",
      coverImage: "https://picsum.photos/seed/bakery-cover/800/400",
      categoryId: 2,
      address: "Av. Libertad 890, Centro",
      phone: "555-0103",
      minOrder: "3.00",
      deliveryTime: "20-30 min",
      rating: "4.9",
      status: "active",
      isOpen: "open",
      openHours: "Lun-Dom: 06:00 - 21:00",
      commissionRate: "7.00",
      lat: "-33.46",
      lng: "-70.64",
    },
    {
      name: "SuperMax Ciudad",
      description: "Supermercado completo con entrega a domicilio. Frescos, abarrotes y productos de limpieza.",
      logo: "https://picsum.photos/seed/super-logo/200/200",
      coverImage: "https://picsum.photos/seed/super-cover/800/400",
      categoryId: 3,
      address: "Av. Las Américas 2345",
      phone: "555-0104",
      minOrder: "10.00",
      deliveryTime: "40-50 min",
      rating: "4.5",
      status: "active",
      isOpen: "open",
      openHours: "Lun-Dom: 08:00 - 22:00",
      commissionRate: "5.00",
      lat: "-33.43",
      lng: "-70.67",
    },
    {
      name: "Farmacias Salud",
      description: "Medicamentos, productos de cuidado personal y atención farmacéutica profesional.",
      logo: "https://picsum.photos/seed/pharma-logo/200/200",
      coverImage: "https://picsum.photos/seed/pharma-cover/800/400",
      categoryId: 4,
      address: "Calle Salud 456, Centro Médico",
      phone: "555-0105",
      minOrder: "5.00",
      deliveryTime: "20-25 min",
      rating: "4.6",
      status: "active",
      isOpen: "open",
      openHours: "24 horas",
      commissionRate: "6.00",
      lat: "-33.45",
      lng: "-70.63",
    },
    {
      name: "Helados Artesanales Primavera",
      description: "Helados hechos a mano con ingredientes naturales. Más de 30 sabores.",
      logo: "https://picsum.photos/seed/icecream-logo/200/200",
      coverImage: "https://picsum.photos/seed/icecream-cover/800/400",
      categoryId: 5,
      address: "Av. del Parque 789",
      phone: "555-0106",
      minOrder: "4.00",
      deliveryTime: "20-30 min",
      rating: "4.9",
      status: "active",
      isOpen: "open",
      openHours: "Lun-Dom: 11:00 - 21:00",
      commissionRate: "8.00",
      lat: "-33.47",
      lng: "-70.66",
    },
    {
      name: "Café Central",
      description: "Café de especialidad, jugos naturales y bebidas refrescantes.",
      logo: "https://picsum.photos/seed/cafe-logo/200/200",
      coverImage: "https://picsum.photos/seed/cafe-cover/800/400",
      categoryId: 6,
      address: "Calle Central 321",
      phone: "555-0107",
      minOrder: "3.50",
      deliveryTime: "15-25 min",
      rating: "4.7",
      status: "active",
      isOpen: "open",
      openHours: "Lun-Vie: 07:00 - 20:00",
      commissionRate: "7.00",
      lat: "-33.44",
      lng: "-70.65",
    },
    {
      name: "PetShop Amigo Fiel",
      description: "Todo para tu mascota. Alimentos, juguetes, accesorios y servicios.",
      logo: "https://picsum.photos/seed/petshop-logo/200/200",
      coverImage: "https://picsum.photos/seed/petshop-cover/800/400",
      categoryId: 7,
      address: "Av. Mascotas 654",
      phone: "555-0108",
      minOrder: "8.00",
      deliveryTime: "30-40 min",
      rating: "4.4",
      status: "active",
      isOpen: "open",
      openHours: "Lun-Sáb: 09:00 - 19:00",
      commissionRate: "9.00",
      lat: "-33.46",
      lng: "-70.68",
    },
    {
      name: "Pizza Napoli",
      description: "Pizza al horno de leña con ingredientes importados de Italia.",
      logo: "https://picsum.photos/seed/pizza-logo/200/200",
      coverImage: "https://picsum.photos/seed/pizza-cover/800/400",
      categoryId: 1,
      address: "Calle Italia 147",
      phone: "555-0109",
      minOrder: "6.00",
      deliveryTime: "30-40 min",
      rating: "4.6",
      status: "active",
      isOpen: "open",
      openHours: "Lun-Dom: 12:00 - 23:00",
      commissionRate: "9.00",
      lat: "-33.42",
      lng: "-70.64",
    },
    {
      name: "Mercado Verde",
      description: "Frutas, verduras y productos orgánicos de productores locales.",
      logo: "https://picsum.photos/seed/market-logo/200/200",
      coverImage: "https://picsum.photos/seed/market-cover/800/400",
      categoryId: 3,
      address: "Av. Verde 852",
      phone: "555-0110",
      minOrder: "7.00",
      deliveryTime: "35-45 min",
      rating: "4.8",
      status: "active",
      isOpen: "open",
      openHours: "Lun-Sáb: 07:00 - 19:00",
      commissionRate: "6.00",
      lat: "-33.48",
      lng: "-70.65",
    },
  ]);

  console.log("Seeding products...");
  const prods = await db.insert(products).values([
    // Burger King products
    { commerceId: 1, name: "Hamburguesa Clásica", description: "Carne 150g, queso cheddar, lechuga, tomate, cebolla y salsa especial", price: "6.50", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop", category: "Hamburguesas", isFeatured: "yes" },
    { commerceId: 1, name: "Hamburguesa Doble", description: "Doble carne 300g, doble queso, tocino, cebolla crispy", price: "9.90", image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300&h=300&fit=crop", category: "Hamburguesas", isFeatured: "yes" },
    { commerceId: 1, name: "Papas Fritas Grandes", description: "Papas fritas crujientes con sal marina", price: "3.50", image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=300&fit=crop", category: "Acompañamientos", isFeatured: "no" },
    { commerceId: 1, name: "Aros de Cebolla", description: "10 aros de cebón empanizados y fritos", price: "4.00", image: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=300&h=300&fit=crop", category: "Acompañamientos", isFeatured: "yes" },
    { commerceId: 1, name: "Refresco 500ml", description: "Coca-Cola, Fanta o Sprite", price: "1.50", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop", category: "Bebidas", isFeatured: "no" },
    { commerceId: 1, name: "Combo Familiar", description: "4 hamburguesas + 2 papas grandes + 4 refrescos", price: "24.90", image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=300&h=300&fit=crop", category: "Combos", isFeatured: "yes" },

    // Sushi Roll products
    { commerceId: 2, name: "Roll California", description: "Cangrejo, aguacate y pepino con sésamo", price: "7.50", image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300&h=300&fit=crop", category: "Rolls", isFeatured: "yes" },
    { commerceId: 2, name: "Roll Philadelfia", description: "Salmón fresco, queso crema y aguacate", price: "8.90", image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=300&h=300&fit=crop", category: "Rolls", isFeatured: "yes" },
    { commerceId: 2, name: "Sashimi Mixto", description: "12 piezas de sashimi: salmón, atún y pez blanco", price: "12.50", image: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=300&h=300&fit=crop", category: "Sashimi", isFeatured: "yes" },
    { commerceId: 2, name: "Nigiri Salmón", description: "4 piezas de nigiri de salmón fresco", price: "6.00", image: "https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=300&h=300&fit=crop", category: "Nigiri", isFeatured: "no" },
    { commerceId: 2, name: "Té Verde Japonés", description: "Té verde Matcha caliente", price: "2.50", image: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=300&h=300&fit=crop", category: "Bebidas", isFeatured: "no" },
    { commerceId: 2, name: "Combo Sushi 30 piezas", description: "Selección de 30 piezas variadas para 2 personas", price: "18.90", image: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=300&h=300&fit=crop", category: "Combos", isFeatured: "yes" },

    // Panadería San José products
    { commerceId: 3, name: "Croissant de Mantequilla", description: "Croissant francés recién horneado con mantequilla", price: "1.80", image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&h=300&fit=crop", category: "Panadería", isFeatured: "yes" },
    { commerceId: 3, name: "Pastel de Chocolate", description: "Pastel de chocolate belga con ganache", price: "4.50", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop", category: "Pasteles", isFeatured: "yes" },
    { commerceId: 3, name: "Café Americano", description: "Café espresso doble con agua caliente", price: "2.00", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=300&fit=crop", category: "Café", isFeatured: "yes" },
    { commerceId: 3, name: "Tarta de Frutas", description: "Base de hojaldre con crema pastelera y frutas frescas", price: "3.80", image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&h=300&fit=crop", category: "Pasteles", isFeatured: "yes" },
    { commerceId: 3, name: "Pan Integral", description: "Pan integral de masa madre, 500g", price: "2.50", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop", category: "Panadería", isFeatured: "no" },
    { commerceId: 3, name: "Medialunas x6", description: "6 medialunas dulces recién horneadas", price: "3.00", image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&h=300&fit=crop", category: "Panadería", isFeatured: "yes" },

    // SuperMax products
    { commerceId: 4, name: "Leche Entera 1L", description: "Leche pasteurizada entera", price: "1.20", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&h=300&fit=crop", category: "Lácteos", isFeatured: "yes" },
    { commerceId: 4, name: "Pan de Molde", description: "Pan blanco de molde, 500g", price: "1.50", image: "https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=300&h=300&fit=crop", category: "Panadería", isFeatured: "no" },
    { commerceId: 4, name: "Huevos Docena", description: "12 huevos frescos de gallina campera", price: "2.80", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&h=300&fit=crop", category: "Frescos", isFeatured: "yes" },
    { commerceId: 4, name: "Arroz 1kg", description: "Arroz grano largo extra", price: "1.80", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop", category: "Abarrotes", isFeatured: "no" },
    { commerceId: 4, name: "Pollo Entero", description: "Pollo fresco de 1.5kg aprox.", price: "5.50", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=300&fit=crop", category: "Carnes", isFeatured: "yes" },
    { commerceId: 4, name: "Detergente 2L", description: "Detergente líquido para ropa", price: "3.20", image: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", category: "Limpieza", isFeatured: "no" },

    // Farmacia products
    { commerceId: 5, name: "Paracetamol 500mg x20", description: "Analgésico y antipirético", price: "3.50", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=300&fit=crop", category: "Medicamentos", isFeatured: "yes" },
    { commerceId: 5, name: "Ibuprofeno 400mg x20", description: "Antiinflamatorio no esteroideo", price: "4.00", image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop", category: "Medicamentos", isFeatured: "yes" },
    { commerceId: 5, name: "Vitamina C 1000mg", description: "60 comprimidos efervescentes", price: "6.90", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=300&fit=crop", category: "Vitaminas", isFeatured: "yes" },
    { commerceId: 5, name: "Protector Solar SPF50", description: "Protector solar facial 50ml", price: "8.50", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300&h=300&fit=crop", category: "Cuidado Personal", isFeatured: "yes" },
    { commerceId: 5, name: "Gel Antibacterial 250ml", description: "Gel desinfectante para manos", price: "2.50", image: "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=300&h=300&fit=crop", category: "Higiene", isFeatured: "no" },
    { commerceId: 5, name: "Pañales Talla M x40", description: "Pañales desechables talla mediana", price: "12.90", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=300&fit=crop", category: "Bebés", isFeatured: "no" },

    // Heladería products
    { commerceId: 6, name: "Helado de Vainilla", description: "Helado artesanal de vainilla Madagascar", price: "3.00", image: "https://images.unsplash.com/photo-1560008581-09826d1de69e?w=300&h=300&fit=crop", category: "Helados", isFeatured: "yes" },
    { commerceId: 6, name: "Helado de Chocolate", description: "Helado de chocolate belga 70% cacao", price: "3.20", image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=300&fit=crop", category: "Helados", isFeatured: "yes" },
    { commerceId: 6, name: "Sundae de Fresa", description: "Helado de vainilla con salsa de fresa y crema", price: "4.50", image: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=300&fit=crop", category: "Especiales", isFeatured: "yes" },
    { commerceId: 6, name: "Cono Mixto", description: "Helado de vainilla y chocolate en cono", price: "2.80", image: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=300&fit=crop", category: "Helados", isFeatured: "no" },
    { commerceId: 6, name: "Batido de Oreo", description: "Batido de helado con galletas Oreo", price: "4.00", image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300&h=300&fit=crop", category: "Batidos", isFeatured: "yes" },
    { commerceId: 6, name: "Litro de Helado", description: "Litro de helado artesanal, sabor a elección", price: "8.90", image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=300&fit=crop", category: "Familiares", isFeatured: "yes" },

    // Café Central products
    { commerceId: 7, name: "Café Latte", description: "Espresso con leche vaporizada", price: "2.80", image: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=300&h=300&fit=crop", category: "Café", isFeatured: "yes" },
    { commerceId: 7, name: "Cappuccino", description: "Espresso con leche vaporizada y espuma", price: "2.80", image: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=300&h=300&fit=crop", category: "Café", isFeatured: "yes" },
    { commerceId: 7, name: "Jugo de Naranja Natural", description: "Jugo de naranja recién exprimido", price: "2.50", image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&h=300&fit=crop", category: "Jugos", isFeatured: "yes" },
    { commerceId: 7, name: "Smoothie de Frutas", description: "Batido de frutas tropicales con yogur", price: "3.50", image: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=300&h=300&fit=crop", category: "Bebidas", isFeatured: "yes" },
    { commerceId: 7, name: "Té Helado de Limón", description: "Té negro con limón y hielo", price: "2.00", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=300&fit=crop", category: "Tés", isFeatured: "no" },
    { commerceId: 7, name: "Café Cold Brew", description: "Café extraído en frío durante 12 horas", price: "3.20", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&h=300&fit=crop", category: "Café", isFeatured: "yes" },

    // PetShop products
    { commerceId: 8, name: "Alimento Perro Adulto 3kg", description: "Croquetas premium para perros adultos", price: "12.50", image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300&h=300&fit=crop", category: "Alimentos", isFeatured: "yes" },
    { commerceId: 8, name: "Alimento Gato Adulto 2kg", description: "Croquetas para gatos adultos sabor pescado", price: "9.90", image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300&h=300&fit=crop", category: "Alimentos", isFeatured: "yes" },
    { commerceId: 8, name: "Juguete Hueso de Goma", description: "Hueso resistente de goma para morder", price: "3.50", image: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=300&h=300&fit=crop", category: "Juguetes", isFeatured: "no" },
    { commerceId: 8, name: "Shampoo para Perros", description: "Shampoo hipoalergénico para perros", price: "5.00", image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300&h=300&fit=crop", category: "Cuidado", isFeatured: "yes" },
    { commerceId: 8, name: "Rascador para Gatos", description: "Rascador de cartón con catnip", price: "4.50", image: "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=300&h=300&fit=crop", category: "Accesorios", isFeatured: "no" },
    { commerceId: 8, name: "Correa Retráctil", description: "Correa extensible hasta 5 metros", price: "6.90", image: "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=300&h=300&fit=crop", category: "Accesorios", isFeatured: "yes" },

    // Pizza Napoli products
    { commerceId: 9, name: "Pizza Margarita", description: "Salsa de tomate, mozzarella fresca y albahaca", price: "7.50", image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=300&fit=crop", category: "Pizzas", isFeatured: "yes" },
    { commerceId: 9, name: "Pizza Pepperoni", description: "Salsa de tomate, mozzarella y pepperoni", price: "8.90", image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300&h=300&fit=crop", category: "Pizzas", isFeatured: "yes" },
    { commerceId: 9, name: "Pizza Cuatro Quesos", description: "Mozzarella, gorgonzola, parmesano y provolone", price: "9.50", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=300&fit=crop", category: "Pizzas", isFeatured: "yes" },
    { commerceId: 9, name: "Pizza Vegetariana", description: "Pimiento, cebolla, champiñones, aceitunas y tomate", price: "8.50", image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=300&h=300&fit=crop", category: "Pizzas", isFeatured: "yes" },
    { commerceId: 9, name: "Pizza Familiar", description: "Pizza grande de 12 porciones, hasta 3 sabores", price: "15.90", image: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=300&h=300&fit=crop", category: "Pizzas", isFeatured: "yes" },
    { commerceId: 9, name: "Coca-Cola 1.5L", description: "Bebida gaseosa 1.5 litros", price: "2.00", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop", category: "Bebidas", isFeatured: "no" },

    // Mercado Verde products
    { commerceId: 10, name: "Manzanas Rojas 1kg", description: "Manzanas frescas rojas importadas", price: "2.50", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop", category: "Frutas", isFeatured: "yes" },
    { commerceId: 10, name: "Plátanos 1kg", description: "Plátanos orgánicos maduros", price: "1.80", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop", category: "Frutas", isFeatured: "yes" },
    { commerceId: 10, name: "Tomates 500g", description: "Tomates redondos para ensalada", price: "1.50", image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop", category: "Verduras", isFeatured: "yes" },
    { commerceId: 10, name: "Palta Hass x3", description: "Paltas Hass maduras listas para comer", price: "3.00", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop", category: "Frutas", isFeatured: "yes" },
    { commerceId: 10, name: "Lechuga Romana", description: "Lechuga romana orgánica fresca", price: "1.20", image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=300&h=300&fit=crop", category: "Verduras", isFeatured: "no" },
    { commerceId: 10, name: "Zanahorias 1kg", description: "Zanahorias orgánicas frescas", price: "1.30", image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop", category: "Verduras", isFeatured: "no" },
  ]);

  console.log("Seeding customers...");
  const custs = await db.insert(customers).values([
    { firstName: "Juan", lastName: "Pérez", phone: "555-2001", address: "Av. Siempre Viva 742, Departamento 5B" },
    { firstName: "María", lastName: "López", phone: "555-2002", address: "Calle Los Pinos 123, Casa 8" },
    { firstName: "Pedro", lastName: "González", phone: "555-2003", address: "Av. Libertad 456, Torre A, Piso 12" },
    { firstName: "Ana", lastName: "Martínez", phone: "555-2004", address: "Calle del Sol 789, Villa Nueva" },
  ]);

  console.log("Seeding drivers...");
  const driverHash = await bcrypt.hash("driver123", 10);
  const drvs = await db.insert(drivers).values([
    { name: "Carlos Mendoza", phone: "5551001", passwordHash: driverHash, vehicle: "Moto Honda CB190", licensePlate: "ABC-123", status: "online", rating: "4.8", totalEarnings: "1250.00", currentLat: "-33.45", currentLng: "-70.65" },
    { name: "María García", phone: "5551002", passwordHash: driverHash, vehicle: "Moto Yamaha FZ", licensePlate: "XYZ-789", status: "online", rating: "4.9", totalEarnings: "1890.50", currentLat: "-33.44", currentLng: "-70.66" },
    { name: "Pedro Sánchez", phone: "5551003", passwordHash: driverHash, vehicle: "Moto Suzuki GS", licensePlate: "DEF-456", status: "busy", rating: "4.6", totalEarnings: "980.00", currentLat: "-33.46", currentLng: "-70.64" },
    { name: "Ana Torres", phone: "5551004", passwordHash: driverHash, vehicle: "Auto Hyundai", licensePlate: "GHI-789", status: "online", rating: "4.7", totalEarnings: "2100.00", currentLat: "-33.43", currentLng: "-70.67" },
    { name: "Luis Ramírez", phone: "5551005", passwordHash: driverHash, vehicle: "Moto Kawasaki", licensePlate: "JKL-012", status: "offline", rating: "4.5", totalEarnings: "750.00", currentLat: "-33.47", currentLng: "-70.63" },
  ]);

  console.log("Seeding orders...");
  const sampleOrders = [];
  const sampleOrderItems = [];
  const sampleStatusHistory = [];
  const statuses = ["delivered", "delivered", "delivered", "delivered", "delivered", "delivered", "delivered", "delivered", "on_the_way", "preparing", "received"] as const;
  for (let i = 0; i < 11; i++) {
    const customerId = (i % 4) + 1;
    const driverId = (i < 8) ? ((i % 3) + 1) : null;
    const commerceId = (i % 5) + 1;
    const subtotal = (15 + i * 3.5).toFixed(2);
    const deliveryFee = "2.50";
    const commission = (parseFloat(subtotal) * 0.08).toFixed(2);
    const total = (parseFloat(subtotal) + 2.5 + parseFloat(commission)).toFixed(2);
    sampleOrders.push({
      customerId,
      driverId,
      status: statuses[i],
      subtotal,
      deliveryFee,
      commission,
      total,
      paymentMethod: "cash" as const,
      deliveryAddress: "Dirección de entrega " + (i + 1),
      customerPhone: "555-200" + (customerId),
    });
  }
  const insertedOrders = await db.insert(orders).values(sampleOrders).returning();

  for (let i = 0; i < insertedOrders.length; i++) {
    const commerceId = (i % 5) + 1;
    const productId = (i % 10) + 1;
    const qty = 1 + (i % 3);
    const unitPrice = (15 + i * 3.5).toFixed(2);
    sampleOrderItems.push({
      orderId: insertedOrders[i].id,
      productId,
      commerceId,
      productName: `Producto ${productId}`,
      quantity: qty,
      unitPrice,
      total: (parseFloat(unitPrice) * qty).toFixed(2),
    });
    sampleStatusHistory.push({
      orderId: insertedOrders[i].id,
      status: "received",
      notes: "Pedido recibido",
    });
  }
  await db.insert(orderItems).values(sampleOrderItems);
  await db.insert(orderStatusHistory).values(sampleStatusHistory);

  console.log("Seeding driver earnings...");
  await db.insert(driverEarnings).values(
    insertedOrders.filter((o, i) => i < 8).map((o, i) => ({
      driverId: o.driverId!,
      orderId: o.id,
      amount: "2.50",
      type: "delivery_fee" as const,
      date: i < 5 ? "2026-06-10" : "2026-06-09",
    }))
  );

  console.log("Seeding settings...");
  await db.insert(appSettings).values([
    { key: "delivery_fee", value: "2.50" },
    { key: "commission_rate", value: "8.00" },
    { key: "min_order_amount", value: "3.00" },
    { key: "app_name", value: "DeliveryCity" },
    { key: "support_phone", value: "555-HELP" },
  ]);

  console.log("Seeding admin user...");
  const hash = await bcrypt.hash("admin123", 10);

  async function seedUser(email: string, data: any) {
    const exists = await db.select().from(users).where(eq(users.email, email));
    if (exists.length === 0) {
      await db.insert(users).values(data);
    }
  }

  await seedUser("admin@quickgo.com", {
    unionId: "admin-local",
    name: "Admin",
    email: "admin@quickgo.com",
    passwordHash: hash,
    role: "admin",
  });
  await seedUser("burger@quickgo.com", {
    unionId: "merchant-1",
    name: "Burger King Express",
    email: "burger@quickgo.com",
    passwordHash: hash,
    role: "merchant",
  });
  await seedUser("sushi@quickgo.com", {
    unionId: "merchant-2",
    name: "Sushi Roll",
    email: "sushi@quickgo.com",
    passwordHash: hash,
    role: "merchant",
  });

  console.log("Seed completed successfully!");
}

seed().catch(console.error);
