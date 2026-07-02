import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Star, Search, Bike, X, Plus, Trash2,
} from "lucide-react";
import { trpcMutate } from "@/hooks/useDeliveryData";
import { trpc } from "@/providers/trpc";
import PhoneInput from "@/components/PhoneInput";
import AdminLayout from "@/components/AdminLayout";

export default function AdminDrivers() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: driverListData, isLoading: loading } = trpc.driver.list.useQuery();
  const driverList = driverListData || [];
  
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", password: "", vehicle: "", licensePlate: "", commissionRate: "80" });
  const [saving, setSaving] = useState(false);

  const filtered = driverList.filter((d) =>
    d.name?.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = driverList.filter((d) => d.status === "online").length;
  const busyCount = driverList.filter((d) => d.status === "busy").length;
  const offlineCount = driverList.filter((d) => d.status === "offline").length;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", phone: "", password: "", vehicle: "", licensePlate: "", commissionRate: "80" });
    setShowForm(true);
  };

  const openEdit = (d: any) => {
    setEditing(d);
    setForm({ name: d.name, phone: d.phone, password: "", vehicle: d.vehicle || "", licensePlate: d.licensePlate || "", commissionRate: d.commissionRate || "80" });
    setShowForm(true);
  };

  const handleDeleteDriver = async (id: number, name: string) => {
    if (!confirm(`Eliminar repartidor "${name}"?`)) return;
    try {
      await trpcMutate("admin.deleteDriver", { id });
      setDriverList(driverList.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err?.message || "Error al eliminar");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedCommission = (!isNaN(parseFloat(form.commissionRate)) ? parseFloat(form.commissionRate) : 80).toFixed(2);
      
      if (editing) {
        const payload: any = { id: editing.id, name: form.name, phone: form.phone, vehicle: form.vehicle, licensePlate: form.licensePlate, commissionRate: parsedCommission };
        if (form.password) payload.password = form.password;
        await trpcMutate("admin.updateDriver", payload);
      } else {
        await trpcMutate("admin.createDriver", { ...form, commissionRate: parsedCommission });
      }
      setShowForm(false);
      await utils.driver.list.invalidate();
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <header className="bg-white border-b border-gray-200 px-3 lg:px-4 py-2 lg:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <button onClick={() => navigate("/admin")} className="touch-target">
              <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
            </button>
            <h1 className="text-base lg:text-lg font-bold text-gray-800">Repartidores</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 lg:gap-2 bg-[#2E7D32] text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl text-xs lg:text-sm font-medium hover:bg-[#1B5E20] transition-colors">
            <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            Nuevo
          </button>
        </div>
      </header>

      <div className="lg:flex-1 lg:overflow-hidden p-2 lg:p-4">
        <div className="lg:h-full lg:flex lg:flex-col max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500 text-sm">Cargando...</div>
          ) : (
            <>
              {/* Status Cards */}
              <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-3 lg:mb-4 lg:shrink-0">
                <div className="bg-green-50 rounded-xl p-2 lg:p-4 text-center">
                  <p className="text-lg lg:text-2xl font-bold text-green-700">{onlineCount}</p>
                  <p className="text-[10px] lg:text-xs text-green-600">En linea</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-2 lg:p-4 text-center">
                  <p className="text-lg lg:text-2xl font-bold text-orange-700">{busyCount}</p>
                  <p className="text-[10px] lg:text-xs text-orange-600">Ocupados</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 lg:p-4 text-center">
                  <p className="text-lg lg:text-2xl font-bold text-gray-700">{offlineCount}</p>
                  <p className="text-[10px] lg:text-xs text-gray-500">Desconectados</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3 lg:mb-4 lg:shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar repartidor..."
                  className="w-full h-9 lg:h-10 pl-9 pr-4 bg-white rounded-xl border border-gray-200 text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
                />
              </div>

              {/* Drivers Table */}
              <div className="bg-white rounded-xl card-shadow overflow-hidden lg:flex-1 lg:min-h-0">
                <div className="overflow-x-auto lg:h-full lg:overflow-y-auto">
                  <table className="w-full text-[11px] lg:text-sm">
                    <thead className="bg-gray-50 text-gray-600 lg:sticky lg:top-0 lg:z-10">
                      <tr>
                        <th className="text-left px-1.5 lg:px-4 py-1.5 lg:py-3 font-medium">Repartidor</th>
                        <th className="hidden lg:table-cell text-left px-4 py-3 font-medium">Vehiculo</th>
                        <th className="hidden lg:table-cell text-left px-4 py-3 font-medium">Patente</th>
                        <th className="text-left px-1.5 lg:px-4 py-1.5 lg:py-3 font-medium">Estado</th>
                        <th className="hidden lg:table-cell text-left px-4 py-3 font-medium">Ubicacion</th>
                        <th className="text-left px-1.5 lg:px-4 py-1.5 lg:py-3 font-medium">Calif.</th>
                        <th className="text-left px-1.5 lg:px-4 py-1.5 lg:py-3 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-1.5 lg:px-4 py-1.5 lg:py-3">
                            <div className="flex items-center gap-2 lg:gap-3">
                              <div className={`w-7 h-7 lg:w-9 lg:h-9 rounded-full flex items-center justify-center ${d.status === "online" ? "bg-green-100" : d.status === "busy" ? "bg-orange-100" : "bg-gray-100"}`}>
                                <Bike className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${d.status === "online" ? "text-green-600" : d.status === "busy" ? "text-orange-600" : "text-gray-500"}`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 leading-tight">{d.name}</p>
                                <p className="text-[10px] lg:text-xs text-gray-500">{d.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-gray-600">{d.vehicle || "-"}</td>
                          <td className="hidden lg:table-cell px-4 py-3 text-gray-600">{d.licensePlate || "-"}</td>
                          <td className="px-1.5 lg:px-4 py-1.5 lg:py-3">
                            <span className={`px-1.5 lg:px-2 py-0.5 rounded-full text-[10px] lg:text-xs font-medium ${d.status === "online" ? "bg-green-100 text-green-700" : d.status === "busy" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
                              {d.status === "online" ? "Online" : d.status === "busy" ? "Ocupado" : "Offline"}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-xs text-gray-500">
                            {d.currentLat && d.currentLng ? `${parseFloat(d.currentLat).toFixed(4)}, ${parseFloat(d.currentLng).toFixed(4)}` : "-"}
                          </td>
                          <td className="px-1.5 lg:px-4 py-1.5 lg:py-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-[#FFC107]" />
                              <span className="text-gray-700">{d.rating || "4.5"}</span>
                            </div>
                          </td>
                          <td className="px-1.5 lg:px-4 py-1.5 lg:py-3">
                            <div className="flex items-center gap-1 lg:gap-2">
                              <button onClick={() => openEdit(d)} className="text-[10px] lg:text-xs text-blue-600 hover:bg-blue-50 px-1.5 lg:px-2 py-1 rounded-lg transition-colors">Editar</button>
                              <button onClick={() => handleDeleteDriver(d.id, d.name)} className="p-1 lg:p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Eliminar">
                                <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Sin repartidores</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
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
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">% Comision del repartidor (sobre costo de envio)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.commissionRate}
                  onChange={(e) => setForm({...form, commissionRate: e.target.value})}
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]"
                />
              </div>
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