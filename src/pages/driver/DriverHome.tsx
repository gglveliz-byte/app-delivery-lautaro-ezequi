import { useNavigate } from "react-router";
import { MapPin, Clock, Navigation, User, Settings, List, BarChart3, Loader2, Package } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useDriverSession } from "@/hooks/useDeliveryData";
import { useDriverEvents } from "@/hooks/useOrderEvents";
import { useDriverNotification } from "@/hooks/useDriverNotification";
import { useState, useEffect, useRef } from "react";

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function DriverHome() {
  const navigate = useNavigate();
  const driverSession = useDriverSession();
  const driverId = driverSession?.id ?? null;
  const [isOnline, setIsOnline] = useState(true);

  const utils = trpc.useUtils();
  const { notifyNewOrder } = useDriverNotification();
  useDriverEvents(driverId || undefined, utils, notifyNewOrder);

  const { data: availableOrders, isLoading } = trpc.order.getAvailableForDriver.useQuery(
    undefined,
    { enabled: !!driverId, refetchInterval: 15000 }
  );

  const { data: driverProfile } = trpc.driver.getById.useQuery(
    { id: driverId! },
    { enabled: !!driverId }
  );

  const { data: earnings } = trpc.driver.getEarnings.useQuery(
    { id: driverId! },
    { enabled: !!driverId }
  );

  const acceptOrderMutation = trpc.driver.acceptOrder.useMutation({
    onSuccess: () => {
      utils.order.getAvailableForDriver.invalidate();
    },
  });

  const updateLocationMutation = trpc.driver.updateLocation.useMutation();
  const updateStatusMutation = trpc.driver.updateStatus.useMutation();

  const isMountedRef = useRef(true);
  const pendingStatusRef = useRef(false);

  // Set driver online when opening the app and sync with backend
  useEffect(() => {
    if (!driverId) return;

    isMountedRef.current = true;
    setIsOnline(true);

    const syncStatus = async () => {
      if (pendingStatusRef.current || !isMountedRef.current) return;
      pendingStatusRef.current = true;
      try {
        await updateStatusMutation.mutateAsync({ id: driverId, status: "online" });
      } catch {
        // ignore
      } finally {
        pendingStatusRef.current = false;
        if (isMountedRef.current) {
          syncTimeout = setTimeout(syncStatus, 30000);
        }
      }
    };

    let syncTimeout = setTimeout(syncStatus, 0);

    return () => {
      isMountedRef.current = false;
      clearTimeout(syncTimeout);
    };
  }, [driverId]);

  const lastUpdateRef = useRef(0);
  const THROTTLE_MS = 15000;

  useEffect(() => {
    if (!driverId) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastUpdateRef.current < THROTTLE_MS) return;
        lastUpdateRef.current = now;
        updateLocationMutation.mutate({
          id: driverId,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverId, updateLocationMutation]);

  const todayEarnings = earnings?.reduce((acc: number, e: any) => {
    const today = new Date().toISOString().split("T")[0];
    const entryDate = e.date;
    if (entryDate === today) return acc + parseFloat(String(e.amount));
    return acc;
  }, 0) || 0;

  const handleAcceptOrder = async (orderId: number) => {
    if (!driverId) return;
    try {
      await acceptOrderMutation.mutateAsync({ driverId, orderId });
      navigate(`/driver/order/${orderId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleOnline = async () => {
    if (!driverId || !driverProfile) return;
    const newStatus = isOnline ? "offline" : "online";
    setIsOnline(!isOnline);
    await updateStatusMutation.mutateAsync({ id: driverId, status: newStatus as any });
  };

  const totalDeliveries = earnings?.length || 0;

  return (
    <div className="mobile-container bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-[#2E7D32] px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Pedidos disponibles</h1>
            <p className="text-white/70 text-sm mt-0.5">
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                  En linea
                </span>
              ) : (
                "Desconectado"
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleOnline}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => navigate("/driver/profile")}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <User className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <p className="text-white/70 text-xs">Hoy</p>
            <p className="text-white font-bold text-lg">${todayEarnings.toFixed(2)}</p>
          </div>
          <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <p className="text-white/70 text-xs">Entregas</p>
            <p className="text-white font-bold text-lg">{totalDeliveries}</p>
          </div>
          <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <p className="text-white/70 text-xs">Rating</p>
            <p className="text-white font-bold text-lg">{driverProfile?.rating?.toString() || "4.8"}</p>
          </div>
        </div>
      </div>

      {/* Available Orders */}
      <div className="px-4 mt-4">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Cerca de ti</h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#2E7D32]" />
          </div>
        ) : (
          <div className="space-y-3">
            {availableOrders && availableOrders.length > 0 ? (
              availableOrders.map((order: any) => {
                const distanceKm = order.lat && order.lng && driverProfile?.currentLat && driverProfile?.currentLng
                  ? getDistance(parseFloat(driverProfile.currentLat), parseFloat(driverProfile.currentLng), parseFloat(order.lat), parseFloat(order.lng))
                  : 2.5;
                const earning = parseFloat(order.deliveryFee || "2.50");
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl card-shadow p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-800">{order.commerceName || `Pedido #${order.id}`}</h3>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span>{distanceKm.toFixed(1)} km</span>
                          <span className="mx-1">|</span>
                          <Clock className="w-3 h-3" />
                          <span>~{Math.ceil(distanceKm * 3)} min</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#2E7D32]">${earning.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">ganancia</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-2 h-2 bg-[#2E7D32] rounded-full flex-shrink-0" />
                        <Navigation className="w-3 h-3 text-gray-400" />
                        <span className="truncate">Desde comercio</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="truncate">{order.deliveryAddress}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        {order.items?.length || 1} items | Total: ${order.total} | {order.paymentMethod === 'cash' ? '💵 Efectivo' : '💳 Transferencia'}
                      </span>
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        disabled={acceptOrderMutation.isPending}
                        className="h-9 px-5 bg-[#2E7D32] text-white text-sm font-medium rounded-lg hover:bg-[#1B5E20] active:scale-95 transition-all disabled:opacity-50"
                      >
                        Aceptar
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl p-6 text-center">
                <p className="text-gray-500 text-sm">No hay pedidos disponibles</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Driver Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex justify-around items-center z-50" style={{ maxWidth: "480px", margin: "0 auto" }}>
        <button onClick={() => navigate("/driver")} className="bottom-nav-item active">
          <List className="w-5 h-5" />
          <span className="text-[10px]">Pedidos</span>
        </button>
        <button onClick={() => navigate("/driver/earnings")} className="bottom-nav-item">
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Ganancias</span>
        </button>
        <button onClick={() => navigate("/driver/history")} className="bottom-nav-item">
          <Package className="w-5 h-5" />
          <span className="text-[10px]">Historial</span>
        </button>
        <button onClick={() => navigate("/driver/profile")} className="bottom-nav-item">
          <User className="w-5 h-5" />
          <span className="text-[10px]">Perfil</span>
        </button>
      </nav>
    </div>
  );
}