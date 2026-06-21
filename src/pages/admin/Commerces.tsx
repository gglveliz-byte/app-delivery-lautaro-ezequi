import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Store, Star, Search, X, Plus, Eye, EyeOff,
} from "lucide-react";
import { trpcCall, trpcMutate } from "@/hooks/useDeliveryData";
import AdminLayout from "@/components/AdminLayout";

export default function AdminCommerces() {
  const navigate = useNavigate();
  const [commerceList, setCommerceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showNewMerchant, setShowNewMerchant] = useState(false);
  const [merchantForm, setMerchantForm] = useState({ name: "", email: "", password: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", address: "", commissionRate: "", deliveryTime: "", minOrder: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    trpcCall<any[]>("admin.listCommerces").then(setCommerceList).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = commerceList.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (id: number) => {
    try {
      const updated = await trpcMutate<any>("admin.updateCommerce", { id, status: commerceList.find(c => c.id === id)?.status === "active" ? "suspended" : "active" });
      setCommerceList(commerceList.map(c => c.id === id ? { ...c, ...updated } : c));
    } catch (err: any) {
      alert(err?.message || "Error");
    }
  };

  const openNewMerchant = () => {
    setMerchantForm({ name: "", email: "", password: "" });
    setShowNewMerchant(true);
  };

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await trpcMutate("admin.createMerchant", merchantForm);
      setShowNewMerchant(false);
      alert("Comercio creado correctamente");
    } catch (err: any) {
      alert(err?.message || "Error al crear");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setEditForm({
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      commissionRate: c.commissionRate || "",
      deliveryTime: c.deliveryTime || "",
      minOrder: c.minOrder || "",
      description: c.description || "",
    });
    setShowForm(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { id: editing.id, ...editForm };
      if (payload.commissionRate) payload.commissionRate = String(payload.commissionRate);
      if (payload.minOrder) payload.minOrder = String(payload.minOrder);
      const updated = await trpcMutate<any>("admin.updateCommerce", payload);
      setCommerceList(commerceList.map(c => c.id === editing.id ? { ...c, ...updated } : c));
      setShowForm(false);
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
            <h1 className="text-lg font-bold text-gray-800">Comercios</h1>
          </div>
          <button onClick={openNewMerchant} className="flex items-center gap-2 bg-[#2E7D32] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1B5E20] transition-colors">
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
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar comercio..."
                  className="w-full h-10 pl-9 pr-4 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Comercio</th>
                      <th className="text-left px-4 py-3 font-medium">Telefono</th>
                      <th className="text-left px-4 py-3 font-medium">Comision</th>
                      <th className="text-left px-4 py-3 font-medium">Estado</th>
                      <th className="text-left px-4 py-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Store className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{c.name}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Star className="w-3 h-3 text-[#FFC107]" />
                                {c.rating || "4.0"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.phone || "-"}</td>
                        <td className="px-4 py-3 text-gray-600">{c.commissionRate ? `${c.commissionRate}%` : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "active" ? "bg-green-100 text-green-700" : c.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                            {c.status === "active" ? "Activo" : c.status === "pending" ? "Pendiente" : "Suspendido"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleStatus(c.id)} className="p-1.5 text-gray-400 hover:text-[#2E7D32] rounded-lg hover:bg-green-50" title={c.status === "active" ? "Suspender" : "Activar"}>
                              {c.status === "active" || c.status === "pending" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                              <span className="text-xs font-medium">Editar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin comercios registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Nuevo Comercio (crea usuario merchant) */}
      {showNewMerchant && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Nuevo comercio</h2>
              <button onClick={() => setShowNewMerchant(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Crear una cuenta de acceso para el comercio</p>
            <form onSubmit={handleCreateMerchant} className="space-y-3">
              <input placeholder="Nombre del comercio" value={merchantForm.name} onChange={(e) => setMerchantForm({...merchantForm, name: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" required />
              <input type="email" placeholder="Email" value={merchantForm.email} onChange={(e) => setMerchantForm({...merchantForm, email: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" required />
              <input type="password" placeholder="Contraseña" value={merchantForm.password} onChange={(e) => setMerchantForm({...merchantForm, password: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" required />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewMerchant(false)} className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 h-11 bg-[#2E7D32] text-white rounded-xl text-sm font-medium hover:bg-[#1B5E20] disabled:opacity-50">{saving ? "Creando..." : "Crear"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Comercio */}
      {showForm && editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Editar comercio</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <input placeholder="Nombre" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" required />
              <input placeholder="Telefono" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" />
              <input placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" />
              <input placeholder="Direccion" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" />
              <input placeholder="Comision (%)" value={editForm.commissionRate} onChange={(e) => setEditForm({...editForm, commissionRate: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" />
              <input placeholder="Tiempo de entrega" value={editForm.deliveryTime} onChange={(e) => setEditForm({...editForm, deliveryTime: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" />
              <input placeholder="Pedido minimo" value={editForm.minOrder} onChange={(e) => setEditForm({...editForm, minOrder: e.target.value})} className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32]" />
              <textarea placeholder="Descripcion" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} rows={2} className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#2E7D32] resize-none" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 h-11 bg-[#2E7D32] text-white rounded-xl text-sm font-medium hover:bg-[#1B5E20] disabled:opacity-50">{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}