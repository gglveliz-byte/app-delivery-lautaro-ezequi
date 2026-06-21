import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAdminTopProducts, trpcCall } from "@/hooks/useDeliveryData";
import {
  ArrowLeft,
  Package,
  TrendingUp,
  DollarSign,
  Search,
  Star,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function AdminProducts() {
  const navigate = useNavigate();
  const topProducts = useAdminTopProducts(20);

  const [activeTab, setActiveTab] = useState<"ranking" | "all">("ranking");
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (activeTab === "all" && allProducts.length === 0) {
      setLoadingAll(true);
      trpcCall<any[]>("product.list")
        .then(setAllProducts)
        .catch(console.error)
        .finally(() => setLoadingAll(false));
    }
  }, [activeTab]);

  const totalProducts = topProducts.length;
  const totalSold = topProducts.reduce((sum, p) => sum + (Number(p.sold) || 0), 0);
  const totalRevenue = topProducts.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0);

  const filteredProducts = allProducts.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="touch-target">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Productos</h1>
        </div>
      </header>

      <div className="p-4 max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("ranking")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "ranking"
                ? "bg-[#2E7D32] text-white"
                : "bg-white text-gray-600 card-shadow hover:bg-gray-50"
            }`}
          >
            Mas vendidos
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-[#2E7D32] text-white"
                : "bg-white text-gray-600 card-shadow hover:bg-gray-50"
            }`}
          >
            Todos
          </button>
        </div>

        {activeTab === "ranking" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl card-shadow p-5">
                <Package className="w-5 h-5 text-[#2E7D32] mb-2" />
                <p className="text-2xl font-bold text-gray-800">{totalProducts}</p>
                <p className="text-xs text-gray-500">Productos en top</p>
              </div>
              <div className="bg-white rounded-xl card-shadow p-5">
                <TrendingUp className="w-5 h-5 text-[#2E7D32] mb-2" />
                <p className="text-2xl font-bold text-gray-800">{totalSold.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Unidades vendidas (top)</p>
              </div>
              <div className="bg-white rounded-xl card-shadow p-5">
                <DollarSign className="w-5 h-5 text-[#2E7D32] mb-2" />
                <p className="text-2xl font-bold text-gray-800">${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                <p className="text-xs text-gray-500">Ingresos (top)</p>
              </div>
            </div>

            <div className="bg-white rounded-xl card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">#</th>
                      <th className="text-left px-4 py-3 font-medium">Producto</th>
                      <th className="text-left px-4 py-3 font-medium">Comercio</th>
                      <th className="text-left px-4 py-3 font-medium">Categoria</th>
                      <th className="text-left px-4 py-3 font-medium">Vendidos</th>
                      <th className="text-left px-4 py-3 font-medium">Facturacion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topProducts.map((p, i) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i < 3 ? "bg-[#2E7D32] text-white" : "bg-gray-100 text-gray-600"
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                        <td className="px-4 py-3 text-gray-600">{p.commerceName}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{p.category || "-"}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{Number(p.sold || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-medium text-[#2E7D32]">${Number(p.revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "all" && (
          <>
            {/* Search bar */}
            <div className="bg-white rounded-xl card-shadow p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 focus:border-[#2E7D32]"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl card-shadow overflow-hidden">
              {loadingAll ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Imagen</th>
                        <th className="text-left px-4 py-3 font-medium">Nombre</th>
                        <th className="text-left px-4 py-3 font-medium">Comercio</th>
                        <th className="text-left px-4 py-3 font-medium">Categoría</th>
                        <th className="text-left px-4 py-3 font-medium">Precio</th>
                        <th className="text-left px-4 py-3 font-medium">Estado</th>
                        <th className="text-left px-4 py-3 font-medium">Destacado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                          <td className="px-4 py-3 text-gray-600">{p.commerceName || "-"}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{p.category || "-"}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">${Number(p.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              p.isAvailable
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-600"
                            }`}>
                              {p.isAvailable ? "Disponible" : "No disponible"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.isFeatured ? (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <Star className="w-4 h-4 text-gray-300" />
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 && !loadingAll && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                            No se encontraron productos
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
