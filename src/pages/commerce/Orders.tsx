import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, CheckCircle, Package, ChevronDown,
} from "lucide-react";
import { useMerchantCommerceId, useCommerceOrders, useUpdateOrderStatus, useMarkCommerceReady } from "@/hooks/useDeliveryData";
import { useCommerceEvents } from "@/hooks/useOrderEvents";
import { trpc } from "@/providers/trpc";
import CommerceLayout from "@/components/CommerceLayout";

export default function CommerceOrders() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const { commerceId } = useMerchantCommerceId();
  const updateOrderStatus = useUpdateOrderStatus(commerceId || undefined);
  const markCommerceReady = useMarkCommerceReady(commerceId || undefined);
  const { data: orders, loading } = useCommerceOrders(commerceId || 0);
  const commerceUtils = trpc.useUtils();
  useCommerceEvents(commerceId || undefined, commerceUtils);

  const handleMarkReady = async (orderId: number) => {
    try {
      await markCommerceReady.mutateAsync({ orderId, commerceId: commerceId! });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusUpdate = async (orderId: number, status: string) => {
    try {
      await updateOrderStatus.mutateAsync({ id: orderId, status });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = filter === "all" ? orders : orders.filter((o) => (o.myCommerceStatus || o.status) === filter);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      received: "bg-yellow-100 text-yellow-800",
      preparing: "bg-indigo-100 text-indigo-800",
      ready_for_pickup: "bg-purple-100 text-purple-800",
      picked_up: "bg-orange-100 text-orange-800",
      on_the_way: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      received: "Nuevo",
      preparing: "Preparando",
      ready_for_pickup: "Listo para recoger",
      picked_up: "Retirado",
      on_the_way: "En camino",
      delivered: "Entregado",
      cancelled: "Cancelado",
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-800"}`}>
        {labels[status] || status.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <CommerceLayout>
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/commerce")} className="touch-target">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Gestión de pedidos</h1>
          {!loading && (
            <span className="text-xs text-gray-400 ml-auto">{orders.length} pedidos</span>
          )}
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {[
            { key: "all", label: "Todos" },
            { key: "received", label: "Nuevos" },
            { key: "preparing", label: "Preparando" },
            { key: "ready_for_pickup", label: "Listos" },
            { key: "on_the_way", label: "En camino" },
            { key: "delivered", label: "Entregados" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? "bg-[#2E7D32] text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No hay pedidos {filter !== "all" ? "en este estado" : "aún"}</p>
          </div>
        )}

        {/* Orders List */}
        {!loading && (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl card-shadow overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2E7D32] rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Pedido #{order.id}</p>
                        <p className="text-xs text-gray-500">
                          {order.customerName || "Cliente"} | {order.customerPhone || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#2E7D32]">${parseFloat(order.total).toFixed(2)}</p>
                      {statusBadge(order.myCommerceStatus || order.status)}
                    </div>
                  </div>

                  {/* Items preview */}
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="w-full flex items-center justify-between text-xs text-gray-500 mb-2"
                  >
                    <span>{order.items?.length || 0} items</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedOrder === order.id ? "rotate-180" : ""}`} />
                  </button>

                  {expandedOrder === order.id && order.items && (
                    <div className="space-y-1 mb-3 pl-2 border-l-2 border-gray-100">
                      {order.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.quantity}x {item.productName}</span>
                          <span className="text-gray-800">${parseFloat(item.unitPrice).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions - per-commerce status */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    {order.myCommerceStatus === "received" && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(order.id, "preparing")}
                          className="flex-1 h-10 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Preparar
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(order.id, "cancelled")}
                          className="flex-1 h-10 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 flex items-center justify-center gap-1.5"
                        >
                          <Package className="w-4 h-4" />
                          Rechazar
                        </button>
                      </>
                    )}
                    {order.myCommerceStatus === "preparing" && (
                      <button
                        onClick={() => handleMarkReady(order.id)}
                        disabled={markCommerceReady.isPending}
                        className="w-full h-10 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 flex items-center justify-center gap-1.5"
                      >
                        {markCommerceReady.isPending ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30" strokeDashoffset="90"/></svg>
                            Marcando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Marcar listo
                          </>
                        )}
                      </button>
                    )}
                    {order.myCommerceStatus === "ready_for_pickup" && (
                      <span className="w-full h-10 bg-green-50 text-green-700 text-sm font-medium rounded-lg flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        Listo - esperando repartidor
                      </span>
                    )}
                    {order.myCommerceStatus === "picked_up" && (
                      <span className="w-full h-10 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg flex items-center justify-center gap-1.5">
                        <Package className="w-4 h-4" />
                        Recogido por repartidor
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CommerceLayout>
  );
}
