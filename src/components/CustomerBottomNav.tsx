import { useNavigate } from "react-router";
import {
  UtensilsCrossed,
  Search,
  ShoppingCart,
  User,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";

export function CustomerBottomNav({ active }: { active: string }) {
  const navigate = useNavigate();
  const { totalItems } = useCart();

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
      <button 
        onClick={() => navigate("/cart")} 
        className={`relative bottom-nav-item flex flex-col items-center justify-center ${active === "cart" ? "active" : ""}`}
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5" />
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-1">Carrito</span>
      </button>
      <button onClick={() => navigate("/profile")} className={`bottom-nav-item ${active === "profile" ? "active" : ""}`}>
        <User className="w-5 h-5" />
        <span className="text-[10px]">Perfil</span>
      </button>
    </nav>
  );
}
