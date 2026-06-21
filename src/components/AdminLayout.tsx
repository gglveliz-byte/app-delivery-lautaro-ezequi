import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard, ShoppingBag, Store, Truck, Package, Settings, LogOut,
} from "lucide-react";
import { trpcMutate } from "@/hooks/useDeliveryData";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Store, label: "Comercios", path: "/admin/commerces" },
  { icon: Truck, label: "Repartidores", path: "/admin/drivers" },
  { icon: ShoppingBag, label: "Pedidos", path: "/admin/orders" },
  { icon: Package, label: "Productos", path: "/admin/products" },
  { icon: Settings, label: "Config", path: "/admin/settings" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await trpcMutate("login.logout", {}).catch(() => {});
    localStorage.removeItem("qs_session");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col fixed h-full z-30">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2E7D32] rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800">YA LLEGA</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-[#2E7D32] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            Salir
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-64 pb-16 lg:pb-0">
        {children}
      </main>

      {/* Bottom nav — mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex justify-around py-1 z-50">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg transition-colors ${
              location.pathname === item.path
                ? "text-[#2E7D32]"
                : "text-gray-400"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-medium leading-tight text-center">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
