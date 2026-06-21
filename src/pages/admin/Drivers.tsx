import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Star, Search, Bike, X, Plus,
} from "lucide-react";
import { trpcCall, trpcMutate } from "@/hooks/useDeliveryData";
import PhoneInput from "@/components/PhoneInput";
import AdminLayout from "@/components/AdminLayout";

export default function AdminDrivers() {
  const navigate = useNavigate();
  const [driverList, setDriverList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", password: "", vehicle: "", licensePlate: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    trpcCall<any[]>("driver.list").then(setDriverList).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = driverList.filter((d) =>
    d.name?.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = driverList.filter((d) => d.status === "online").length;
  const busyCount = driverList.filter((d) => d.status === "busy").length;
  const offlineCount = driverList.filter((d) => d.status === "offline").length;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", phone: "", password: "", vehicle: "", licensePlate: "" });
    setShowForm(true);
  };

  const openEdit = (d: any) => {
    setEditing(d);
    setForm({ name: d.name, phone: d.phone, password: "", vehicle: d.vehicle || "", licensePlate: d.licensePlate || "" });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload: any = { id: editing.id, name: form.name, phone: form.phone, vehicle: form.vehicle, licensePlate: form.licensePlate };
        if (form.password) payload.password = form.password;
        await trpcMutate("admin.updateDriver", payload);
      } else {
        await trpcMutate("admin.createDriver", form);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="touch-target">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Repartidores</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-[#2E7D32] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1B5E20] transition-colors">
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </header>

      <div className="p-4 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{onlineCount}</p>
                <p className="text-xs text-green-600">En linea</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-700">{busyCount}</p>
                <p className="text-xs text-orange-600">Ocupados</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-700">{offlineCount}</p>
                <p className="text-xs text-gray-500">Desconectados</p>
              </div>
            </div>

            {/* Status Summary */}
            <div className="bg-white rounded-xl card-shadow overflow-hidden mb-4">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Estado de repartidores</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Repartidor</th>
                      <th className="text-left px-4 py-3 font-medium">Telefono</th>
                      <th className="text-left px-4 py-3 font-medium">Estado</th>
                      <th className="text-left px-4 py-3 font-medium">Vehiculo</th>
                      <th className="text-left px-4 py-3 font-medium">Patente</th>
                      <th className="text-left px-4 py-3 font-medium">Ubicacion</th>
                      <th className="text-left px-4 py-3 font-medium">Calif.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {driverList.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                        <td className="px-4 py-3 text-gray-600">{d.phone}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "online" ? "bg-green-100 text-green-700" : d.status === "busy" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
                            {d.status === "online" ? "En linea" : d.status === "busy" ? "Ocupado" : "Desconectado"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{d.vehicle || "-"}</td>
                        <td className="px-4 py-3 text-gray-600">{d.licensePlate || "-"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {d.currentLat && d.currentLng ? `${parseFloat(d.currentLat).toFixed(4)}, ${parseFloat(d.currentLng).toFixed(4)}` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-[#FFC107]" />
                            <span className="text-gray-700">{d.rating || "4.5"}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar repartidor..."
                className="w-full h-10 pl-9 pr-4 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
              />
            </div>

            {/* Drivers Table */}
            <div className="bg-white rounded-xl card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Repartidor</th>
                      <th className="text-left px-4 py-3 font-medium">Vehiculo</th>
                      <th className="text-left px-4 py-3 font-medium">Estado</th>
                      <th className="text-left px-4 py-3 font-medium">Calif.</th>
                      <th className="text-left px-4 py-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${d.status === "online" ? "bg-green-100" : d.status === "busy" ? "bg-orange-100" : "bg-gray-100"}`}>
                              <Bike className={`w-4 h-4 ${d.status === "online" ? "text-green-600" : d.status === "busy" ? "text-orange-600" : "text-gray-500"}`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{d.name}</p>
                              <p className="text-xs text-gray-500">{d.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{d.vehicle || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "online" ? "bg-green-100 text-green-700" : d.status === "busy" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
                            {d.status === "online" ? "En linea" : d.status === "busy" ? "Ocupado" : "Desconectado"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-[#FFC107]" />
                            <span className="text-gray-700">{d.rating || "4.5"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => openEdit(d)} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">Editar</button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin repartidores</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">{editing ? "Editar repartidor" : "Nuevo repartidor"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" required />
              <PhoneInput value={form.phone} onChange={(v) => setForm({...form, phone: v})} />
              <input type="password" placeholder={editing ? "Nueva contraseña (dejar vacio = sin cambios)" : "Contraseña"} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" required={!editing} />
              <input placeholder="Vehiculo (ej: Moto Honda CB190)" value={form.vehicle} onChange={(e) => setForm({...form, vehicle: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" />
              <input placeholder="Patente (ej: ABC-123)" value={form.licensePlate} onChange={(e) => setForm({...form, licensePlate: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 h-11 bg-[#2E7D32] text-white rounded-xl text-sm font-medium hover:bg-[#1B5E20] transition-colors disabled:opacity-50">{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}