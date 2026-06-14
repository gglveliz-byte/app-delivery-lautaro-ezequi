import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, MessageCircle, Phone, MapPin, Navigation, Clock } from "lucide-react";
import { useOrder } from "@/hooks/useDeliveryData";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Inject keyframes for pulsing driver marker
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `@keyframes driverPulse { 0% { box-shadow: 0 3px 12px rgba(46,125,50,0.4); } 50% { box-shadow: 0 3px 20px rgba(46,125,50,0.7); } 100% { box-shadow: 0 3px 12px rgba(46,125,50,0.4); } }`;
  document.head.appendChild(style);
}

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Elegant marker icons using inline SVGs
const driverIcon = L.divIcon({
  className: "",
  html: `<div style="width:40px;height:40px;background:linear-gradient(135deg,#2E7D32,#1B5E20);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(46,125,50,0.4);animation:driverPulse 2s infinite">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 18a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/>
      <path d="M15 18a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/>
      <path d="M5 18H3V6a1 1 0 0 1 1-1h10l3 5h2a3 3 0 0 1 3 3v5h-2"/>
      <path d="M9 18h6"/>
      <circle cx="18" cy="10" r="1"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function commerceLogoIcon(logoUrl: string, name: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:44px;height:44px;border-radius:12px;border:3px solid white;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.2);background:white;">
        <img src="${logoUrl}" alt="${name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"/>
      </div>
      <div style="margin-top:-2px;background:#1565C0;color:white;font-size:7.5px;font-weight:700;padding:2px 7px;border-radius:0 0 7px 7px;border:1.5px solid white;white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis;">${name}</div>
    </div>`,
    iconSize: [44, 60],
    iconAnchor: [22, 44],
  });
}

const destinationIcon = L.divIcon({
  className: "",
  html: `<div style="width:40px;height:40px;background:linear-gradient(135deg,#E53935,#C62828);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(229,57,53,0.4)">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const statusSteps = [
  { key: "received", label: "Recibido", description: "Pedido recibido" },
  { key: "accepted", label: "Aceptado", description: "Pedido aceptado" },
  { key: "preparing", label: "Preparando", description: "Preparando pedido" },
  { key: "driver_assigned", label: "Repartidor", description: "Repartidor asignado" },
  { key: "picked_up", label: "Recogido", description: "Pedido recogido" },
  { key: "on_the_way", label: "En camino", description: "En camino a tu direccion" },
  { key: "delivered", label: "Entregado", description: "Pedido entregado" },
];

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, loading } = useOrder(Number(id));
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const deliveryMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Geocode delivery address when order loads
  useEffect(() => {
    if (!order?.deliveryAddress || deliveryCoords) return;
    setGeoLoading(true);
    const q = encodeURIComponent(order.deliveryAddress);
    fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=es`, {
      headers: { "User-Agent": "DeliveryCity-App/1.0" },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.length > 0) {
          setDeliveryCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        }
      })
      .catch(() => {})
      .finally(() => setGeoLoading(false));
  }, [order?.deliveryAddress]);

  const mapContainerRef = useCallback((element: HTMLDivElement | null) => {
    if (element && !mapRef.current) {
      const map = L.map(element, {
        zoomControl: false,
        attributionControl: false,
      }).setView([-33.45, -70.65], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
    }
    if (!element && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, []);

  // Update map markers when order data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !order) return;

    // Clear old markers/lines (keep driver marker and delivery marker)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        if (layer === driverMarkerRef.current) return;
        if (layer === deliveryMarkerRef.current) return;
        map.removeLayer(layer);
      }
    });
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const bounds = L.latLngBounds([]);

// Commerce markers with logo images
     if (order.commerces) {
       for (const c of order.commerces) {
         if (c.lat && c.lng) {
           const lat = parseFloat(c.lat);
           const lng = parseFloat(c.lng);
           L.marker([lat, lng], {
             icon: commerceLogoIcon(c.logo || "", c.name),
           }).addTo(map);
           bounds.extend([lat, lng]);
         }
       }
     }

    // Delivery address marker
    if (deliveryCoords) {
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.setLatLng([deliveryCoords.lat, deliveryCoords.lng]);
      } else {
        deliveryMarkerRef.current = L.marker([deliveryCoords.lat, deliveryCoords.lng], { icon: destinationIcon })
          .addTo(map)
          .bindPopup(`<b>Destino</b><br/>${order.deliveryAddress}`);
      }
      bounds.extend([deliveryCoords.lat, deliveryCoords.lng]);
    }

    // Driver marker
    const dlat = driverPos?.lat ?? (order.driver?.currentLat ? parseFloat(order.driver.currentLat) : null);
    const dlng = driverPos?.lng ?? (order.driver?.currentLng ? parseFloat(order.driver.currentLng) : null);

    if (dlat && dlng) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([dlat, dlng]);
      } else {
        driverMarkerRef.current = L.marker([dlat, dlng], { icon: driverIcon })
          .addTo(map)
          .bindPopup(`<b>${order.driver?.name || "Repartidor"}</b>`);
      }
      bounds.extend([dlat, dlng]);

      // Polyline from driver to delivery address (or commerce as fallback)
      let targetLat: number | null = null;
      let targetLng: number | null = null;
      if (deliveryCoords) {
        targetLat = deliveryCoords.lat;
        targetLng = deliveryCoords.lng;
      } else if (order.commerces?.length > 0) {
        const first = order.commerces.find((c: any) => c.lat && c.lng);
        if (first) { targetLat = parseFloat(first.lat); targetLng = parseFloat(first.lng); }
      }
      if (targetLat && targetLng) {
        polylineRef.current = L.polyline(
          [[dlat, dlng], [targetLat, targetLng]],
          { color: "#2E7D32", weight: 3, dashArray: "8,8" }
        ).addTo(map);
      }
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [order, driverPos, deliveryCoords]);

  // Poll driver location
  useEffect(() => {
    if (!order?.driver?.id) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trpc/order.getById?input=${encodeURIComponent(JSON.stringify({ json: { id: Number(id) }, meta: {} }))}`);
        const data = await res.json();
        const updatedOrder = data?.result?.data?.json;
        if (updatedOrder?.driver?.currentLat && updatedOrder?.driver?.currentLng) {
          setDriverPos({
            lat: parseFloat(updatedOrder.driver.currentLat),
            lng: parseFloat(updatedOrder.driver.currentLng),
          });
        }
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [order?.driver?.id, id]);

  if (loading) {
    return (
      <div className="mobile-container bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
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

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);
  const progress = ((currentStepIndex + 1) / statusSteps.length) * 100;

  // Calculate estimated time based on distance
  const estimatedMinutes = (() => {
    if (!driverPos || !deliveryCoords) return null;
    const R = 6371;
    const dLat = (deliveryCoords.lat - driverPos.lat) * Math.PI / 180;
    const dLng = (deliveryCoords.lng - driverPos.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(driverPos.lat * Math.PI / 180) * Math.cos(deliveryCoords.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(1, Math.round(distanceKm * 3));
  })();

  return (
    <div className="mobile-container bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate("/home")} className="touch-target">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Pedido #{order.id}</h1>
          <p className="text-xs text-gray-500">
            {new Date(order.createdAt).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="h-56 bg-gray-100 relative" style={{ zIndex: 1 }}>
        <div ref={mapContainerRef} className="absolute inset-0" />
        {geoLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
            <span className="text-xs text-gray-600 bg-white px-3 py-1.5 rounded-full shadow">Buscando dirección...</span>
          </div>
        )}
      </div>
      {order.driver && (
        <div className="bg-[#2E7D32]/10 px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#2E7D32]" />
            <span className="text-gray-700">
              <strong>{order.driver.name}</strong> — {order.driver.phone}
            </span>
          </div>
          {estimatedMinutes && order.status !== "delivered" && (
            <div className="flex items-center gap-1 text-[#2E7D32] font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>~{estimatedMinutes} min</span>
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl card-shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-800">Estado del pedido</span>
            <span className="text-xs text-[#2E7D32] font-medium">
              {statusSteps[currentStepIndex]?.label}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex justify-between mt-4">
            {statusSteps.slice(0, 5).map((step, i) => (
              <div key={step.key} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i <= currentStepIndex
                      ? "bg-[#2E7D32] text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-[10px] ${i <= currentStepIndex ? "text-gray-800" : "text-gray-400"}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl card-shadow p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Detalles del pedido</h3>
          <div className="space-y-2">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x {item.productName}
                </span>
                <span className="text-gray-800 font-medium">${item.total}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>${order.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Envio</span>
              <span>${order.deliveryFee}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Comision</span>
              <span>${order.commission}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-800 pt-1 border-t border-gray-100">
              <span>Total</span>
              <span className="text-[#2E7D32]">${order.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Info */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl card-shadow p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Entrega</h3>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-[#2E7D32] mt-0.5 flex-shrink-0" />
            <span>{order.deliveryAddress}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
            <span>{order.customerPhone}</span>
          </div>
        </div>
      </div>

      {/* Chat button */}
      <div className="px-4 mt-4 mb-6">
        <button
          onClick={() => navigate(`/chat/${order.id}`)}
          className="w-full h-12 bg-white border-2 border-[#2E7D32] text-[#2E7D32] font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition-all"
        >
          <MessageCircle className="w-5 h-5" />
          Chatear con el comercio
        </button>
      </div>
    </div>
  );
}
