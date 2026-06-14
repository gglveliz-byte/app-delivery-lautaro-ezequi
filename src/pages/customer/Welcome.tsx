import { useNavigate } from "react-router";
import { ShoppingBag, Truck, Clock, Star } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="mobile-container bg-gradient-to-b from-[#2E7D32] to-[#1B5E20] min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-6 backdrop-blur-sm">
          <ShoppingBag className="w-14 h-14 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">DeliveryCity</h1>
        <p className="text-white/80 text-lg mb-8">Tu ciudad, a domicilio</p>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs mb-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="text-white/90 text-xs">Envío rápido</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-white/90 text-xs">En minutos</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <span className="text-white/90 text-xs">Calidad</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-8 pt-4">
        <button
          onClick={() => navigate("/register")}
          className="w-full h-14 bg-white text-[#2E7D32] font-semibold text-lg rounded-xl shadow-lg hover:bg-gray-50 active:scale-[0.98] transition-all touch-target"
        >
          Crear cuenta
        </button>
        <button
          onClick={() => navigate("/customer-login")}
          className="w-full mt-3 py-3 text-white/90 text-sm font-medium hover:text-white transition-colors"
        >
          ¿Ya tenés cuenta? Iniciá sesión
        </button>
        <p className="text-white/60 text-xs text-center mt-4">
          Compra de múltiples comercios en un solo pedido
        </p>
      </div>
    </div>
  );
}
