import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  ShoppingCart,
  Star,
  Clock,
  UtensilsCrossed,
  Croissant,
  ShoppingBasket,
  Pill,
  IceCreamCone,
  Coffee,
  Dog,
  MoreHorizontal,
  ChevronRight,
  MapPin,
  User,
  Plus,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { useCategories, useCommerces, useFeaturedProducts, useProductsByCommerce } from "@/hooks/useDeliveryData";

const iconMap: Record<string, React.ReactNode> = {
  UtensilsCrossed: <UtensilsCrossed className="w-5 h-5" />,
  Croissant: <Croissant className="w-5 h-5" />,
  ShoppingCart: <ShoppingBasket className="w-5 h-5" />,
  Pill: <Pill className="w-5 h-5" />,
  IceCreamCone: <IceCreamCone className="w-5 h-5" />,
  Coffee: <Coffee className="w-5 h-5" />,
  Dog: <Dog className="w-5 h-5" />,
  MoreHorizontal: <MoreHorizontal className="w-5 h-5" />,
};

export default function CustomerHome() {
  const navigate = useNavigate();
  const { customer } = useCustomerSession();
  const { totalItems } = useCart();
  const { data: categories } = useCategories();
  const { data: commerces, loading: loadingCommerces } = useCommerces();
  const { data: featuredProducts, loading: loadingFeatured } = useFeaturedProducts();
  const [searchQuery] = useState("");

  const filteredCommerces = searchQuery
    ? commerces.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : commerces;

  return (
    <div className="mobile-container bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-[#2E7D32] px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs">Hola,</p>
              <p className="text-white font-medium text-sm">{customer?.firstName || "Invitado"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/profile")} className="text-white/80 hover:text-white touch-target">
              <MapPin className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/cart")}
              className="relative text-white/80 hover:text-white touch-target"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          className="bg-white/20 backdrop-blur-sm rounded-full h-12 flex items-center px-4 gap-2 cursor-pointer"
          onClick={() => navigate("/search")}
        >
          <Search className="w-5 h-5 text-white/70" />
          <span className="text-white/60 text-sm">Que deseas pedir hoy?</span>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Categorias</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/search?category=${cat.id}`)}
              className="flex flex-col items-center gap-1.5 min-w-[68px]"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundColor: cat.color || "#2E7D32" }}
              >
                {iconMap[cat.icon] || <MoreHorizontal className="w-5 h-5" />}
              </div>
              <span className="text-xs text-gray-600 text-center leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Popular Products */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Productos populares</h2>
          <button onClick={() => navigate("/search")} className="text-[#2E7D32] text-xs font-medium flex items-center gap-0.5">
            Ver todo <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {loadingFeatured ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {[1, 2, 3].map((i) => (
              <div key={i} className="min-w-[160px] h-48 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Commerces List */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Comercios</h2>
        </div>
        {loadingCommerces ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCommerces.map((commerce) => (
              <CommerceCard key={commerce.id} commerce={commerce} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <BottomNav active="home" />
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  const navigate = useNavigate();
  const { addItem } = useCart();

  return (
    <div className="min-w-[160px] bg-white rounded-xl card-shadow overflow-hidden">
      <div
        className="h-24 bg-gray-100 bg-cover bg-center cursor-pointer"
        style={{ backgroundImage: `url(${product.image})` }}
        onClick={() => navigate(`/commerce/${product.commerceId}`)}
      />
      <div className="p-2.5">
        <p className="text-xs text-gray-500 truncate">{product.commerceName}</p>
        <p className="text-sm font-medium text-gray-800 truncate mt-0.5">{product.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm font-bold text-[#2E7D32]">${product.price}</span>
          <button
            onClick={() =>
              addItem({
                productId: product.id,
                commerceId: product.commerceId,
                name: product.name,
                price: product.price,
                image: product.image,
                commerceName: product.commerceName,
              })
            }
            className="w-7 h-7 bg-[#2E7D32] text-white rounded-lg flex items-center justify-center hover:bg-[#1B5E20] active:scale-90 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CommerceCard({ commerce }: { commerce: any }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { data: products } = useProductsByCommerce(commerce.id);
  const featuredProducts = products.filter((p: any) => p.isFeatured === "yes").slice(0, 3);

  return (
    <div className="bg-white rounded-xl card-shadow overflow-hidden">
      <div
        className="h-28 bg-gray-100 bg-cover bg-center cursor-pointer active:scale-[0.98] transition-transform"
        style={{ backgroundImage: `url(${commerce.coverImage})` }}
        onClick={() => navigate(`/commerce/${commerce.id}`)}
      >
        <div className="flex justify-between items-start p-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              commerce.isOpen === "open" ? "badge-open" : "badge-closed"
            }`}
          >
            {commerce.isOpen === "open" ? "Abierto" : "Cerrado"}
          </span>
        </div>
      </div>
      <div className="p-3 cursor-pointer" onClick={() => navigate(`/commerce/${commerce.id}`)}>
        <div className="flex items-start gap-3">
          <img src={commerce.logo} alt="" className="w-10 h-10 rounded-full object-cover -mt-7 border-2 border-white shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-800 text-sm truncate">{commerce.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {commerce.deliveryTime}
              </span>
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-[#FFC107]" />
                {commerce.rating}
              </span>
              {commerce.minOrder && parseFloat(commerce.minOrder) > 0 && (
                <span>Min. ${commerce.minOrder}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {featuredProducts.length > 0 && (
        <div className="border-t border-gray-100 p-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {featuredProducts.map((product: any) => (
              <div key={product.id} className="flex-shrink-0 w-32 bg-gray-50 rounded-lg p-2">
                <div
                  className="w-full h-16 bg-gray-200 bg-cover bg-center rounded mb-1.5 cursor-pointer"
                  style={{ backgroundImage: `url(${product.image})` }}
                  onClick={() => navigate(`/commerce/${commerce.id}`)}
                />
                <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-bold text-[#2E7D32]">${product.price}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem({
                        productId: product.id,
                        commerceId: commerce.id,
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        commerceName: commerce.name,
                      });
                    }}
                    className="w-5 h-5 bg-[#2E7D32] text-white rounded flex items-center justify-center hover:bg-[#1B5E20] active:scale-90"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BottomNav({ active }: { active: string }) {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-2 flex justify-around items-center z-50" style={{ maxWidth: "480px", margin: "0 auto" }}>
      <button onClick={() => navigate("/home")} className={`bottom-nav-item ${active === "home" ? "active" : ""}`}>
        <UtensilsCrossed className="w-5 h-5" />
        <span className="text-[10px]">Inicio</span>
      </button>
      <button onClick={() => navigate("/search")} className={`bottom-nav-item ${active === "search" ? "active" : ""}`}>
        <Search className="w-5 h-5" />
        <span className="text-[10px]">Buscar</span>
      </button>
      <button onClick={() => navigate("/cart")} className={`bottom-nav-item ${active === "cart" ? "active" : ""}`}>
        <ShoppingCart className="w-5 h-5" />
        <span className="text-[10px]">Carrito</span>
      </button>
      <button onClick={() => navigate("/profile")} className={`bottom-nav-item ${active === "profile" ? "active" : ""}`}>
        <User className="w-5 h-5" />
        <span className="text-[10px]">Perfil</span>
      </button>
    </nav>
  );
}
