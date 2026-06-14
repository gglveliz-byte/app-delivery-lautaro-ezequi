import { useNavigate } from "react-router";
import {
  ArrowLeft, TrendingUp, ShoppingBag, DollarSign, Star,
} from "lucide-react";
import { useCommerceStats, useMerchantCommerceId } from "@/hooks/useDeliveryData";

export default function CommerceStats() {
  const navigate = useNavigate();

  const { commerceId } = useMerchantCommerceId();
  const { data: stats, loading } = useCommerceStats(commerceId || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">No se pudieron cargar las estadísticas</p>
      </div>
    );
  }

  const maxSales = Math.max(...stats.dailySales.map((d: any) => d.sales), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/commerce")} className="touch-target">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Estadísticas</h1>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl card-shadow p-4">
            <DollarSign className="w-5 h-5 text-[#2E7D32] mb-2" />
            <p className="text-xl font-bold text-gray-800">${stats.totalSales}</p>
            <p className="text-xs text-gray-500">Ventas totales</p>
          </div>
          <div className="bg-white rounded-xl card-shadow p-4">
            <ShoppingBag className="w-5 h-5 text-[#2E7D32] mb-2" />
            <p className="text-xl font-bold text-gray-800">{stats.totalOrders}</p>
            <p className="text-xs text-gray-500">Pedidos entregados</p>
          </div>
          <div className="bg-white rounded-xl card-shadow p-4">
            <TrendingUp className="w-5 h-5 text-[#2E7D32] mb-2" />
            <p className="text-xl font-bold text-gray-800">${stats.avgTicket}</p>
            <p className="text-xs text-gray-500">Ticket promedio</p>
          </div>
          <div className="bg-white rounded-xl card-shadow p-4">
            <Star className="w-5 h-5 text-[#FFC107] mb-2" />
            <p className="text-xl font-bold text-gray-800">{stats.totalProducts}</p>
            <p className="text-xs text-gray-500">Productos</p>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl card-shadow p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Ventas por día (entregados)</h2>
          <div className="flex items-end justify-between gap-2 h-40">
            {stats.dailySales.map((d: any) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500">${d.sales}</span>
                <div
                  className="w-full max-w-[40px] bg-[#2E7D32] rounded-t-lg transition-all"
                  style={{ height: `${(d.sales / maxSales) * 100}%` }}
                />
                <span className="text-[10px] text-gray-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl card-shadow">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Productos más vendidos</h2>
          </div>
          {stats.topProducts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Sin ventas aún. Los productos aparecerán aquí cuando tengas pedidos entregados.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.topProducts.map((product: any, i: number) => (
                <div key={product.name} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sales} vendidos</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#2E7D32]">${product.revenue}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
