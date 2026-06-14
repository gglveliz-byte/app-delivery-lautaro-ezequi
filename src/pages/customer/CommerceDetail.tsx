import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Star, Clock, Phone, MapPin, Plus, ShoppingCart } from "lucide-react";
import { useCommerce, useProductsByCommerce } from "@/hooks/useDeliveryData";
import { useCart } from "@/hooks/useCart";

export default function CommerceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: commerce, loading: loadingCommerce } = useCommerce(Number(id));
  const { data: allProducts, loading: loadingProducts } = useProductsByCommerce(Number(id));
  const { addItem, totalItems } = useCart();

  const products = allProducts.filter((p: any) => p.isAvailable === "yes");

  const groupedProducts = products.reduce((acc: Record<string, any[]>, p: any) => {
    const cat = p.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  if (loadingCommerce) {
    return (
      <div className="mobile-container bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!commerce) {
    return (
      <div className="mobile-container bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Comercio no encontrado</p>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-gray-50 min-h-screen pb-20">
      {/* Cover */}
      <div className="relative h-44 bg-gray-200">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${commerce.coverImage})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button
          onClick={() => navigate("/home")}
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center touch-target z-10"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => navigate("/cart")}
          className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center touch-target z-10"
        >
          <ShoppingCart className="w-5 h-5 text-gray-700" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-xl font-bold text-white">{commerce.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-white/80 text-xs">
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-[#FFC107]" />
              {commerce.rating}
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {commerce.deliveryTime}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                commerce.isOpen === "open" ? "bg-green-500/80" : "bg-red-500/80"
              }`}
            >
              {commerce.isOpen === "open" ? "Abierto" : "Cerrado"}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 -mt-2 relative z-10">
        <div className="bg-white rounded-xl card-shadow p-4">
          <p className="text-sm text-gray-600">{commerce.description}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            <span>{commerce.address}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <Phone className="w-3.5 h-3.5" />
            <span>{commerce.phone}</span>
          </div>
          {commerce.openHours && (
            <div className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Horario:</span> {commerce.openHours}
            </div>
          )}
          {commerce.minOrder && parseFloat(commerce.minOrder) > 0 && (
            <div className="mt-1 text-xs text-gray-500">
              <span className="font-medium">Pedido minimo:</span> ${commerce.minOrder}
            </div>
          )}
        </div>
      </div>

      {/* Products by Category */}
      <div className="px-4 mt-4">
        {loadingProducts ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          Object.entries(groupedProducts).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">{category}</h2>
              <div className="space-y-2">
                {items.map((product: any) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl card-shadow p-3 flex gap-3"
                  >
                    <div
                      className="w-20 h-20 rounded-lg bg-gray-100 bg-cover bg-center flex-shrink-0"
                      style={{ backgroundImage: `url(${product.image})` }}
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800 text-sm">{product.name}</h3>
                        {product.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-[#2E7D32]">${product.price}</span>
                        <button
                          onClick={() =>
                            addItem({
                              productId: product.id,
                              commerceId: product.commerceId,
                              name: product.name,
                              price: product.price,
                              image: product.image,
                              commerceName: commerce.name,
                            })
                          }
                          className="w-8 h-8 bg-[#2E7D32] text-white rounded-lg flex items-center justify-center hover:bg-[#1B5E20] active:scale-90 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
