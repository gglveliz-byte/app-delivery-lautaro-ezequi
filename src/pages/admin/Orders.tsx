import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Search,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useDeliveryData";
import AdminLayout from "@/components/AdminLayout";

const statusColors: Record<string, string> = {
  received: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  driver_assigned: "bg-indigo-100 text-indigo-800",
  picked_up: "bg-pink-100 text-pink-800",
  on_the_way: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { data: orders, loading } = useAdminOrders();

  const filtered = orders.filter((o: any) => {
    const matchesSearch =
      (o.customerName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (o.customerPhone || "").includes(search) ||
      o.id.toString().includes(search);
    const matchesFilter = filter === "all" || o.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout>
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="touch-target">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Pedidos</h1>
        </div>
      </header>

      <div className="p-4 max-w-6xl mx-auto">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID o cliente..."
              className="w-full h-10 pl-9 pr-4 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {["all", "received", "preparing", "ready_for_pickup", "on_the_way", "delivered"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-[#2E7D32] text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {f === "all" ? "Todos" : f === "received" ? "Nuevos" : f === "preparing" ? "Preparando" : f === "ready_for_pickup" ? "Listos" : f === "on_the_way" ? "En camino" : "Entregados"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium">Comercio</th>
                  <th className="text-left px-4 py-3 font-medium">Repartidor</th>
                  <th className="text-left px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Cargando pedidos...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No hay pedidos
                    </td>
                  </tr>
                ) : (
                  filtered.map((o: any) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">#{o.id}</td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{o.customerName}</p>
                        <p className="text-xs text-gray-500">{o.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{o.commerceName}</td>
                      <td className="px-4 py-3 text-gray-600">{o.driverName || "-"}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">${o.total}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] || "bg-gray-100 text-gray-600"}`}>
                          {(o.status || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}