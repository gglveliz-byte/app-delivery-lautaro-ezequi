import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingBag, Package, BarChart3,
  TrendingUp, ChevronRight, DollarSign,
  Star,
} from "lucide-react";
import { useMerchantCommerceId, useProductsByCommerce, useCommerceStats } from "@/hooks/useDeliveryData";
import CommerceLayout from "@/components/CommerceLayout";

export default function CommerceDashboard() {
  const navigate = useNavigate();
  const [commerceName, setCommerceName] = useState("Mi comercio");
  const { commerceId } = useMerchantCommerceId();
  const { data: products } = useProductsByCommerce(commerceId || 0);
  const { data: stats } = useCommerceStats(commerceId || 0);

  useEffect(() => {
    const storedUser = localStorage.getItem("merchant_user");
    const merchantUser = storedUser ? JSON.parse(storedUser) : null;
    if (merchantUser?.name) setCommerceName(merchantUser.name);
  }, []);

  return (
    <CommerceLayout>
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        <div className="w-8 h-8 bg-[#2E7D32] rounded-full flex items-center justify-center text-white text-sm font-medium">
          {commerceName.charAt(0)}
        </div>
      </header>

      <div className="p-4 md:p-6">
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
    </CommerceLayout>
  );
}
