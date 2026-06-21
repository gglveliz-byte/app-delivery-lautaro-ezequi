import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard, ShoppingBag, Store, Users, Truck,
  TrendingUp, TrendingDown, ChevronRight, Settings, Package,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { trpcCall } from "@/hooks/useDeliveryData";
import AdminLayout from "@/components/AdminLayout";

type Period = "day" | "week" | "month" | "year";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [growthPercent, setGrowthPercent] = useState<number | null>(null);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [topCommerces, setTopCommerces] = useState<any[]>([]);

  useEffect(() => {
    trpcCall<any>("admin.dashboard").then(setKpi).catch(console.error);
    trpcCall<any[]>("admin.categoryRanking").then(setTopCategories).catch(console.error);
    trpcCall<any[]>("admin.topCommerces", { limit: 5 }).then(setTopCommerces).catch(console.error);
  }, []);

  useEffect(() => {
    trpcCall<any[]>("admin.salesByPeriod", { period }).then((data) => {
      setSalesData(data);
    }).catch(console.error);

    const prevPeriod: Period = period === "day" ? "day" : period === "week" ? "week" : period === "month" ? "month" : "year";
    trpcCall<any[]>("admin.salesByPeriod", { period: prevPeriod }).then((prevData) => {
      const currentTotal = salesData.reduce((s, d) => s + d.sales, 0);
      const prevTotal = prevData.reduce((s, d) => s + d.sales, 0);
      if (prevTotal > 0) {
        setGrowthPercent(parseFloat(((currentTotal - prevTotal) / prevTotal * 100).toFixed(1)));
      } else {
        setGrowthPercent(null);
      }
    }).catch(() => {});
  }, [period]);

  return (
    <AdminLayout>
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Panel administrativo</h1>
        <div className="w-8 h-8 bg-[#2E7D32] rounded-full flex items-center justify-center text-white text-sm font-medium">A</div>
      </header>

      <div className="p-4 lg:p-6">
        {!kpi ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <KpiCard icon={ShoppingBag} label="Pedidos totales" value={String(kpi.totalOrders)} color="bg-blue-100 text-blue-600" />
              <KpiCard icon={Store} label="Comercios activos" value={`${kpi.activeCommerces}/${kpi.totalCommerces}`} color="bg-green-100 text-green-600" />
              <KpiCard icon={Truck} label="Repartidores" value={`${kpi.onlineDrivers} online`} color="bg-orange-100 text-orange-600" />
              <KpiCard icon={Users} label="Clientes" value={String(kpi.totalCustomers)} color="bg-purple-100 text-purple-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-1 bg-white rounded-xl card-shadow p-5">
                <p className="text-sm text-gray-500 mb-1">Facturacion total</p>
                <p className="text-3xl font-bold text-gray-800">${kpi.totalRevenue}</p>
                {growthPercent !== null && (
                  <div className={`flex items-center gap-1 mt-1 text-xs ${growthPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {growthPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{growthPercent >= 0 ? "+" : ""}{growthPercent}% vs periodo anterior</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Comisiones</p>
                  <p className="text-xl font-bold text-[#2E7D32]">${kpi.totalCommission}</p>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl card-shadow p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-800">Ventas</h2>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {(["day", "week", "month", "year"] as Period[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${period === p ? "bg-white text-[#2E7D32] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {p === "day" ? "Dia" : p === "week" ? "Semana" : p === "month" ? "Mes" : "Ano"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-40">
                  {salesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData.slice(-12)}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(-5)} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Ventas"]} />
                        <Bar dataKey="sales" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl card-shadow p-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">Categorias mas vendidas</h2>
                <div className="space-y-3">
                  {topCategories.slice(0, 5).map((cat, i) => (
                    <div key={cat.id} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-[#2E7D32] text-white" : "bg-gray-100 text-gray-600"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{cat.name}</p>
                        <p className="text-xs text-gray-500">${cat.sales.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {topCategories.length === 0 && <p className="text-sm text-gray-400">Sin datos</p>}
                </div>
              </div>

              <div className="bg-white rounded-xl card-shadow p-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">Comercios mas vendidos</h2>
                <div className="space-y-3">
                  {topCommerces.slice(0, 5).map((comm, i) => (
                    <div key={comm.id} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-[#2E7D32] text-white" : "bg-gray-100 text-gray-600"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{comm.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{comm.orders} pedidos</span>
                          <span>${comm.revenue.toFixed(2)}</span>
                          <span>Ticket: ${(comm.revenue / comm.orders).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {topCommerces.length === 0 && <p className="text-sm text-gray-400">Sin datos</p>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl card-shadow">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Acceso rapido</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Gestionar comercios", path: "/admin/commerces", icon: Store },
                  { label: "Control de repartidores", path: "/admin/drivers", icon: Truck },
                  { label: "Ver todos los pedidos", path: "/admin/orders", icon: ShoppingBag },
                  { label: "Configurar comisiones", path: "/admin/settings", icon: Settings },
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
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl card-shadow p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} mb-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
