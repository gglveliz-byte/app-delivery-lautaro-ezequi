import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Phone,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useOrderEvents } from "@/hooks/useOrderEvents";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const orderSteps = [
  { key: "driver_assigned", label: "Camino al comercio" },
  { key: "preparing", label: "En comercio" },
  { key: "ready_for_pickup", label: "Listo para recoger" },
  { key: "picked_up", label: "Camino al cliente" },
  { key: "on_the_way", label: "En camino" },
  { key: "delivered", label: "Entregado" },
];

export default function DriverOrder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("driver_user");
    if (session) {
      try {
        const data = JSON.parse(session);
        if (data?.id) {
          setDriverId(data.id);
        }
      } catch {}
    }
  }, []);

  const { data: order, isLoading } = trpc.order.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  // Escuchar cambios del pedido en tiempo real
  useOrderEvents(Number(id));

  const utils = trpc.useUtils();

  // Declarar mutation hook FUERA de funciones async
  const updateStatusMutation = trpc.order.updateStatus.useMutation();

  const getCurrentStep = (status: string) => {
    const stepIndex = orderSteps.findIndex((s) => s.key === status);
    return stepIndex >= 0 ? stepIndex : 0;
  };

  const currentStep = order ? getCurrentStep(order.status) : 0;
  const delivered = order?.status === "delivered";

  const handleNextStep = async () => {
    if (!id || !order) return;

    const nextStatus = getNextStatus(order.status);
    if (!nextStatus) return;

    await updateStatusMutation.mutateAsync({
      id: Number(id),
      status: nextStatus as any,
      driverId: driverId || undefined
    });

    utils.order.getById.invalidate({ id: Number(id) });
  };

  const getNextStatus = (current: string) => {
    const transitions: Record<string, string> = {
      driver_assigned: "preparing",
      preparing: "ready_for_pickup",
      ready_for_pickup: "picked_up",
      picked_up: "on_the_way",
      on_the_way: "delivered",
    };
    return transitions[current];
  };

  const openRoute = () => {
    const address = encodeURIComponent(order?.deliveryAddress || "");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, "_blank");
  };

  // Initialize map and markers
  useEffect(() => {
    if (!order || mapRef.current) return;

    const mapContainer = document.getElementById("driver-map");
    if (!mapContainer || !mapContainer.offsetWidth) return;

    const newMap = L.map(mapContainer, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-33.45, -70.65], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(newMap);

    newMap.whenReady(() => {
      const newMarkers: L.Marker[] = [];

      // Commerce marker
      if (order.commerces?.[0]?.lat && order.commerces?.[0]?.lng) {
        const lat = parseFloat(order.commerces[0].lat);
        const lng = parseFloat(order.commerces[0].lng);
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:30px;height:30px;background:#2E7D32;border-radius:50%;display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M5 18a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/><path d="M15 18a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/><path d="M5 18H3V6a1 1 0 0 1 1-1h10l3 5h2a3 3 0 0 1 3 3v5h-2"/><path d="M9 18h6"/><circle cx="18" cy="10" r="1"/></svg></div>`,
          })
        }).addTo(newMap);
        newMarkers.push(marker);
      }

      // Driver marker
      if (order.driver?.currentLat && order.driver?.currentLng) {
        const lat = parseFloat(order.driver.currentLat);
        const lng = parseFloat(order.driver.currentLng);
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:30px;height:30px;background:#1565C0;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M5 18a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/><path d="M15 18a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/><path d="M5 18H3V6a1 1 0 0 1 1-1h10l3 5h2a3 3 0 0 1 3 3v5h-2"/><path d="M9 18h6"/></svg></div>`,
          })
        }).addTo(newMap);
        newMarkers.push(marker);
      }

      // Fit bounds
      const group = new L.FeatureGroup(newMarkers);
      if (group.getLayers().length > 0) {
        newMap.fitBounds(group.getBounds().pad(0.2));
      }
    });

    mapRef.current = newMap;

    return () => {
      mapRef.current = null;
      newMap.remove();
    };
  }, [order]);

  if (isLoading) {
    return (
      <div className="mobile-container bg-gray-50 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7D32]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mobile-container bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Pedido no encontrado</p>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-[#2E7D32] px-4 pt-4 pb-6">
        <button onClick={() => navigate("/driver")} className="text-white/80 hover:text-white mb-4 touch-target">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">Pedido #{id}</h1>
        <p className="text-white/70 text-sm mt-1">
          {delivered ? "Entregado" : orderSteps[currentStep]?.label || order.status}
        </p>
      </div>

      {/* Map */}
      <div id="driver-map" className="h-48 mx-4 -mt-3 rounded-xl" />

      {/* Order Info */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl card-shadow p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Detalles</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-[#2E7D32]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{order.commerces?.[0]?.name || "Comercio"}</p>
                <p className="text-xs text-gray-500">{order.deliveryAddress.split(",")[0] || "Dirección de entrega"}</p>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => navigate(`/driver/chat/${id}`)}
                    className="text-xs text-[#2E7D32] flex items-center gap-0.5"
                  >
                    <MessageCircle className="w-3 h-3" /> Chat
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Cliente: {order.customerPhone || "Teléfono no disponible"}</p>
                <p className="text-xs text-gray-500">{order.deliveryAddress}</p>
                <div className="flex gap-2 mt-1">
                  <a href={`tel:${order.customerPhone || ""}`} className="text-xs text-blue-600 flex items-center gap-0.5">
                    <Phone className="w-3 h-3" /> Llamar
                  </a>
                  <button
                    onClick={() => navigate(`/driver/chat/${id}`)}
                    className="text-xs text-blue-600 flex items-center gap-0.5"
                  >
                    <MessageCircle className="w-3 h-3" /> Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl card-shadow p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Progreso</h3>
          <div className="relative">
            <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {orderSteps.map((step, i) => (
                <div key={step.key} className="flex items-center gap-3 relative z-10">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      i <= currentStep ? "bg-[#2E7D32] text-white" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {i < currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-sm ${i <= currentStep ? "text-gray-800 font-medium" : "text-gray-400"}`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {!delivered && (
        <div className="px-4 mt-4 mb-6">
          <button
            onClick={handleNextStep}
            className="w-full h-12 bg-[#2E7D32] text-white font-medium rounded-xl hover:bg-[#1B5E20] active:scale-[0.98] transition-all"
          >
            {order.status === "driver_assigned" ? "Llegué al comercio" :
             order.status === "preparing" ? "Esperando pedido..." :
             order.status === "ready_for_pickup" ? "Pedido recogido" :
             order.status === "picked_up" ? "En camino al cliente" :
             "Completar entrega"}
          </button>
        </div>
      )}

      <button
        onClick={openRoute}
        className="mx-4 mb-2 h-10 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
      >
        <Navigation className="w-4 h-4 text-[#2E7D32]" />
        Abrir en Google Maps
      </button>

      {delivered && (
        <div className="px-4 mt-4 mb-6">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <CheckCircle className="w-10 h-10 text-[#2E7D32] mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-800">Entrega completada!</p>
            <p className="text-xs text-gray-500 mt-1">Ganancia: ${order.deliveryFee}</p>
          </div>
          <button
            onClick={() => navigate("/driver")}
            className="w-full h-12 bg-[#2E7D32] text-white font-medium rounded-xl mt-3 hover:bg-[#1B5E20] transition-all"
          >
            Volver a pedidos
          </button>
        </div>
      )}
    </div>
  );
}