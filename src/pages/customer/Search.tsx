import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Search, X, ArrowLeft, Star, Clock } from "lucide-react";
import { useCategories, useCommerces, useFeaturedProducts } from "@/hooks/useDeliveryData";
import { BottomNav } from "./Home";

export default function CustomerSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("category");
  const queryParam = searchParams.get("q");

  const { data: categories } = useCategories();
  const { data: commerces } = useCommerces();
  const { data: featuredProducts } = useFeaturedProducts();

  const [query, setQuery] = useState(queryParam || "");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    categoryId ? parseInt(categoryId) : null
  );

  useEffect(() => {
    if (categoryId) setSelectedCategory(parseInt(categoryId));
  }, [categoryId]);

  useEffect(() => {
    if (queryParam) setQuery(queryParam);
  }, [queryParam]);

  const filteredCommerces = commerces.filter((c) => {
    const matchesQuery =
      !query || c.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory =
      !selectedCategory || c.categoryId === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const filteredProducts = featuredProducts.filter((p) => {
    const matchesQuery =
      !query || p.name.toLowerCase().includes(query.toLowerCase());
    return matchesQuery;
  });

  return (
    <div className="mobile-container bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/home")} className="touch-target">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos o comercios..."
              autoFocus
              className="w-full h-10 pl-9 pr-9 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedCategory
                ? "bg-[#2E7D32] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === cat.id ? null : cat.id
                )
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-[#2E7D32] text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 mt-4">
        {!query && !selectedCategory ? (
          <>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Productos populares</h2>
            <div className="grid grid-cols-2 gap-3">
              {featuredProducts.slice(0, 6).map((product) => (
                <ProductSearchCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <>
            {filteredProducts.length > 0 && (
              <>
                <h2 className="text-sm font-medium text-gray-500 mb-2">
                  Productos ({filteredProducts.length})
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {filteredProducts.map((product) => (
                    <ProductSearchCard key={product.id} product={product} />
                  ))}
                </div>
              </>
            )}
            {filteredCommerces.length > 0 && (
              <>
                <h2 className="text-sm font-medium text-gray-500 mb-2">
                  Comercios ({filteredCommerces.length})
                </h2>
                <div className="space-y-3">
                  {filteredCommerces.map((commerce) => (
                    <CommerceSearchCard key={commerce.id} commerce={commerce} />
                  ))}
                </div>
              </>
            )}
            {filteredProducts.length === 0 && filteredCommerces.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No se encontraron resultados</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav active="search" />
    </div>
  );
}

function ProductSearchCard({ product }: { product: any }) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-xl card-shadow overflow-hidden cursor-pointer"
      onClick={() => navigate(`/commerce/${product.commerceId}`)}
    >
      <div
        className="h-28 bg-gray-100 bg-cover bg-center"
        style={{ backgroundImage: `url(${product.image})` }}
      />
      <div className="p-2.5">
        <p className="text-xs text-gray-500 truncate">{product.commerceName}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
        <p className="text-sm font-bold text-[#2E7D32] mt-1">${product.price}</p>
      </div>
    </div>
  );
}

function CommerceSearchCard({ commerce }: { commerce: any }) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-xl card-shadow p-3 flex gap-3 cursor-pointer"
      onClick={() => navigate(`/commerce/${commerce.id}`)}
    >
      <img
        src={commerce.logo}
        alt=""
        className="w-14 h-14 rounded-xl object-cover"
        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect width=%2248%22 height=%2248%22 rx=%2224%22 fill=%22%23f0fdf4%22/%3E%3Crect x=%2210%22 y=%2218%22 width=%2228%22 height=%2224%22 rx=%223%22 fill=%22%23dcfce7%22/%3E%3Cpath d=%22M6 18 L15 8 L33 8 L42 18%22 fill=%22none%22 stroke=%22%2386efac%22 stroke-width=%222.5%22 stroke-linecap=%22round%22/%3E%3Crect x=%2215%22 y=%2224%22 width=%227%22 height=%2212%22 rx=%221.5%22 fill=%22%2386efac%22/%3E%3Crect x=%2226%22 y=%2224%22 width=%227%22 height=%2212%22 rx=%221.5%22 fill=%22%2386efac%22/%3E%3C/svg%3E' }}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-800 text-sm">{commerce.name}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {commerce.deliveryTime}
          </span>
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 text-[#FFC107]" />
            {commerce.rating}
          </span>
        </div>
        <span
          className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            commerce.isOpen === "open" ? "badge-open" : "badge-closed"
          }`}
        >
          {commerce.isOpen === "open" ? "Abierto" : "Cerrado"}
        </span>
      </div>
    </div>
  );
}
