import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, DollarSign, TrendingUp, Clock, Bike, Loader2 } from "lucide-react";
import { trpc } from "@/providers/trpc";

export default function DriverEarnings() {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<number | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    const session = sessionStorage.getItem("driver_user");
    if (session) {
      try {
        const data = JSON.parse(session);
        if (data?.id) {
          setDriverId(data.id);
        }
      } catch {}
    }
  }, []);

  const { data: earnings, isLoading } = trpc.driver.getEarnings.useQuery(
    { id: driverId! },
    { enabled: !!driverId }
  );

  const dailyHistory = useMemo(() => {
    if (!earnings || earnings.length === 0) return [];
    return earnings.reduce((acc: any[], e: any) => {
      const date = e.date;
      const existing = acc.find((a: any) => a.date === date);
      if (existing) {
        existing.earnings += parseFloat(String(e.amount));
        existing.deliveries += 1;
      } else {
        acc.push({ date, deliveries: 1, earnings: parseFloat(String(e.amount)) });
      }
      return acc;
    }, []);
  }, [earnings]);

  const getPeriodEarnings = () => {
    if (!earnings || earnings.length === 0) return 0;
    const now = new Date();
    const filtered = earnings.filter((e: any) => {
      const entryDate = new Date(e.date);
      if (period === "day") {
        return entryDate.toDateString() === now.toDateString();
      }
      if (period === "week") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return entryDate >= weekStart;
      }
      if (period === "month") {
        return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
    return filtered.reduce((acc: number, e: any) => acc + parseFloat(String(e.amount)), 0) || 0;
  };

  const periodEarnings = getPeriodEarnings();
  const periodDeliveries = useMemo(() => {
    if (!earnings || earnings.length === 0) return 0;
    const now = new Date();
    return earnings.filter((e: any) => {
      const entryDate = new Date(e.date);
      if (period === "day") return entryDate.toDateString() === now.toDateString();
      if (period === "week") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return entryDate >= weekStart;
      }
      if (period === "month") return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
      return true;
    }).length;
  }, [earnings, period]);
  const totalDeliveries = earnings?.length || 0;
  const avgEarnings = periodDeliveries > 0 ? periodEarnings / periodDeliveries : 0;

  if (isLoading) {
    return (
      <div className="mobile-container bg-gray-50 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7D32]" />
      </div>
    );
  }

  return (
    <div className="mobile-container bg-gray-50 min-h-screen pb-6">
      {/* Header */}
      <div className="bg-[#2E7D32] px-4 pt-4 pb-6">
        <button onClick={() => navigate("/driver")} className="text-white/80 hover:text-white mb-4 touch-target">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">Mis ganancias</h1>
      </div>

      {/* Total Card */}
      <div className="px-4 -mt-3">
        <div className="bg-white rounded-xl card-shadow p-5">
          <p className="text-sm text-gray-500 mb-1">{period === "day" ? "Ganancias de hoy" : period === "week" ? "Ganancias de la semana" : "Ganancias del mes"}</p>
          <p className="text-3xl font-bold text-[#2E7D32]">${periodEarnings.toFixed(2)}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
            <TrendingUp className="w-3 h-3" />
            <span>Ganancias acumuladas</span>
          </div>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="px-4 mt-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                period === p
                  ? "bg-white text-[#2E7D32] shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {p === "day" ? "Hoy" : p === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl card-shadow p-3 text-center">
            <Bike className="w-5 h-5 text-[#2E7D32] mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{totalDeliveries}</p>
            <p className="text-xs text-gray-500">Entregas</p>
          </div>
          <div className="bg-white rounded-xl card-shadow p-3 text-center">
            <Clock className="w-5 h-5 text-[#2E7D32] mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{periodDeliveries}</p>
            <p className="text-xs text-gray-500">Entregas (período)</p>
          </div>
          <div className="bg-white rounded-xl card-shadow p-3 text-center">
            <DollarSign className="w-5 h-5 text-[#2E7D32] mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">${avgEarnings.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Promedio</p>
          </div>
        </div>
      </div>

      {/* Daily History */}
      <div className="px-4 mt-6">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Historial</h2>
        <div className="bg-white rounded-xl card-shadow divide-y divide-gray-50">
          {dailyHistory.length > 0 ? (
            dailyHistory.map((day: any) => (
              <div key={day.date} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(day.date).toLocaleDateString("es-ES", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p className="text-xs text-gray-500">{day.deliveries} entregas</p>
                </div>
                <span className="text-sm font-bold text-[#2E7D32]">${day.earnings.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500 text-sm">Sin historial de ganancias</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}