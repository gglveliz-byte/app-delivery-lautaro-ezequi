import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Plus, Search, Pencil, Trash2, Star, X, Camera,
} from "lucide-react";
import { useCreateProduct, useDeleteProduct, useMerchantCommerceId, useProductsByCommerce, useUpdateProduct } from "@/hooks/useDeliveryData";
import CommerceLayout from "@/components/CommerceLayout";

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CommerceProducts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "", image: "", isFeatured: "no", isAvailable: "yes" });
  const [saving, setSaving] = useState(false);

  const { commerceId } = useMerchantCommerceId();
  const { data: products, loading } = useProductsByCommerce(commerceId || 0);
  const createProduct = useCreateProduct(commerceId || 0);
  const updateProduct = useUpdateProduct(commerceId || 0);
  const deleteProductMutation = useDeleteProduct(commerceId || 0);

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", price: "", category: "", image: "", isFeatured: "no", isAvailable: "yes" });
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      description: p.description || "",
      price: p.price || "",
      category: p.category || "",
      image: p.image || "",
      isFeatured: p.isFeatured || "no",
      isAvailable: p.isAvailable || "yes",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, ...form });
      } else {
        await createProduct.mutateAsync(form);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailable = async (id: number, current: string) => {
    const newVal = current === "yes" ? "no" : "yes";
    try {
      await updateProduct.mutateAsync({ id, isAvailable: newVal });
    } catch { }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Eliminar producto?")) return;
    try {
      await deleteProductMutation.mutateAsync({ id });
    } catch { }
  };

  return (
    <CommerceLayout>
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/commerce")} className="touch-target">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Productos</h1>
          </div>
          {commerceId && (
            <button onClick={openAdd} className="h-9 px-4 bg-[#2E7D32] text-white text-sm font-medium rounded-lg hover:bg-[#1B5E20] flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Nuevo
            </button>
          )}
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : !commerceId ? (
          <div className="text-center py-12 text-gray-500">No se encontró tu comercio. Contactá al administrador.</div>
        ) : (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..." className="w-full h-10 pl-9 pr-4 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((p) => (
                <div key={p.id} className="bg-white rounded-xl card-shadow p-4 flex gap-3">
                  <img src={p.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect width=%2248%22 height=%2248%22 rx=%228%22 fill=%22%23fefce8%22/%3E%3Crect x=%2212%22 y=%2214%22 width=%2224%22 height=%2226%22 rx=%222%22 fill=%22%23fef9c3%22/%3E%3Crect x=%2212%22 y=%2214%22 width=%2224%22 height=%228%22 rx=%221%22 fill=%22%23fef08a%22/%3E%3Cline x1=%2212%22 y1=%2220%22 x2=%2236%22 y2=%2220%22 stroke=%22%23eab308%22 stroke-width=%221%22/%3E%3Crect x=%2220%22 y=%2226%22 width=%228%22 height=%2214%22 rx=%221%22 fill=%22%23fef08a%22/%3E%3C/svg%3E' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-800">{p.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{p.category}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => openEdit(p)} className="p-1 text-gray-400 hover:text-[#2E7D32]"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{p.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-[#2E7D32]">${p.price}</span>
                      <div className="flex items-center gap-2">
                        {p.isFeatured === "yes" && <Star className="w-3.5 h-3.5 text-[#FFC107]" />}
                        <button onClick={() => toggleAvailable(p.id, p.isAvailable)} className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.isAvailable === "yes" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {p.isAvailable === "yes" ? "Activo" : "Inactivo"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-400">Sin productos. Crea el primero!</div>
              )}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">{editing ? "Editar producto" : "Nuevo producto"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20" required />
              <textarea placeholder="Descripcion" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" min="0" placeholder="Precio" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20" required />
                <input placeholder="Categoria" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Imagen</label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <input placeholder="URL de imagen (o subí un archivo)" value={form.image} onChange={(e) => setForm({...form, image: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20" />
                    <label className="flex items-center gap-2 text-sm text-[#2E7D32] cursor-pointer hover:text-[#1B5E20]">
                      <Camera className="w-4 h-4" />
                      Subir archivo
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) setForm({...form, image: await readFileAsDataURL(f)});
                      }} />
                    </label>
                  </div>
                  {form.image && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                      <img src={form.image} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect width=%2248%22 height=%2248%22 rx=%228%22 fill=%22%23fefce8%22/%3E%3Crect x=%2212%22 y=%2214%22 width=%2224%22 height=%2226%22 rx=%222%22 fill=%22%23fef9c3%22/%3E%3Crect x=%2212%22 y=%2214%22 width=%2224%22 height=%228%22 rx=%221%22 fill=%22%23fef08a%22/%3E%3Cline x1=%2212%22 y1=%2220%22 x2=%2236%22 y2=%2220%22 stroke=%22%23eab308%22 stroke-width=%221%22/%3E%3Crect x=%2220%22 y=%2226%22 width=%228%22 height=%2214%22 rx=%221%22 fill=%22%23fef08a%22/%3E%3C/svg%3E' }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.isFeatured === "yes"} onChange={(e) => setForm({...form, isFeatured: e.target.checked ? "yes" : "no"})} className="w-4 h-4 accent-[#2E7D32]" /> Destacado
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.isAvailable === "yes"} onChange={(e) => setForm({...form, isAvailable: e.target.checked ? "yes" : "no"})} className="w-4 h-4 accent-[#2E7D32]" /> Disponible
                </label>
              </div>
              <button type="submit" disabled={saving} className="w-full h-11 bg-[#2E7D32] text-white font-medium rounded-lg mt-2 hover:bg-[#1B5E20] disabled:opacity-50">
                {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear producto"}
              </button>
            </form>
          </div>
        </div>
      )}
    </CommerceLayout>
  );
}