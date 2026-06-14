import { useNavigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingBag, Package, BarChart3,
  TrendingUp, ChevronRight, DollarSign,
  Star, LogOut, User,
} from "lucide-react";
import { useMerchantCommerceId, useProductsByCommerce, useCommerceStats } from "@/hooks/useDeliveryData";

const sidebarItems = (path: string) => [
  { icon: LayoutDashboard, label: "Dashboard", path: "/commerce" },
  { icon: ShoppingBag, label: "Pedidos", path: "/commerce/orders" },
  { icon: Package, label: "Productos", path: "/commerce/products" },
  { icon: BarChart3, label: "Estadisticas", path: "/commerce/stats" },
  { icon: User, label: "Perfil", path: "/commerce/profile" },
].map((item) => ({ ...item, active: item.path === path }));

export default function CommerceDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [commerceName, setCommerceName] = useState("Mi comercio");
  const { commerceId } = useMerchantCommerceId();
  const { data: products } = useProductsByCommerce(commerceId || 0);
  const { data: stats } = useCommerceStats(commerceId || 0);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("merchant_user");
    const merchantUser = storedUser ? JSON.parse(storedUser) : null;
    if (merchantUser?.name) setCommerceName(merchantUser.name);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed h-full">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2E7D32] rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800 truncate">{commerceName}</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems(location.pathname).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${item.active ? "bg-[#2E7D32] text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={() => { sessionStorage.removeItem("merchant_user"); navigate("/"); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            Salir
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-[#2E7D32] rounded-full flex items-center justify-center text-white text-sm font-medium">
              {commerceName.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl card-shadow p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <ShoppingBag className="w-5 h-5 text-[#2E7D32]" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{products.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Productos</p>
            </div>
            <div className="bg-white rounded-xl card-shadow p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <Star className="w-5 h-5 text-[#2E7D32]" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{products.filter((p: any) => p.isFeatured === "yes").length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Destacados</p>
            </div>
            <div className="bg-white rounded-xl card-shadow p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-[#2E7D32]" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{products.filter((p: any) => p.isAvailable === "yes").length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Disponibles</p>
            </div>
            <div className="bg-white rounded-xl card-shadow p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <Package className="w-5 h-5 text-[#2E7D32]" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats?.totalOrders ?? "-"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pedidos</p>
            </div>
            <div className="bg-white rounded-xl card-shadow p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <DollarSign className="w-5 h-5 text-[#2E7D32]" />
              </div>
              <p className="text-2xl font-bold text-gray-800">${stats?.totalSales?.toFixed(2) ?? "0"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Ventas totales</p>
            </div>
            <div className="bg-white rounded-xl card-shadow p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <BarChart3 className="w-5 h-5 text-[#2E7D32]" />
              </div>
              <p className="text-2xl font-bold text-gray-800">${stats?.avgTicket?.toFixed(2) ?? "0"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Ticket promedio</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-xl card-shadow">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Acceso rapido</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: "Gestionar productos", path: "/commerce/products", icon: Package },
                { label: "Ver pedidos", path: "/commerce/orders", icon: ShoppingBag },
                { label: "Estadisticas", path: "/commerce/stats", icon: BarChart3 },
              ].map((link) => (
                <button key={link.path} onClick={() => navigate(link.path)} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <link.icon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700">{link.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}