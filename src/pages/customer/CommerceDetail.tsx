import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Star, Clock, Phone, MapPin, Plus, ShoppingCart } from "lucide-react";
import { useCommerce, useProductsByCommerce } from "@/hooks/useDeliveryData";
import { useCart } from "@/hooks/useCart";
import { useCommerceEvents } from "@/hooks/useOrderEvents";
import { trpc } from "@/providers/trpc";
import { safeImage } from "@/lib/imageUtils";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { useState } from "react";

export default function CommerceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: commerce, loading: loadingCommerce } = useCommerce(Number(id));
  const { data: allProducts, loading: loadingProducts } = useProductsByCommerce(Number(id));
  const { addItem, totalItems } = useCart();

  const [purchaseModal, setPurchaseModal] = useState<{
    show: boolean;
    product: any;
    tab: "kg" | "importe";
    inputValue: string;
  }>({
    show: false,
    product: null,
    tab: "kg",
    inputValue: "",
  });

  // Escuchar cambios de productos y órdenes en tiempo real
  const commerceUtils = trpc.useUtils();
  useCommerceEvents(Number(id), commerceUtils);

  const products = allProducts.filter((p: any) => p.isAvailable === "yes");

  const groupedProducts = products.reduce((acc: Record<string, any[]>, p: any) => {
    const cat = p.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const handleAddClick = (product: any) => {
    if (product.unitType === "kg") {
      setPurchaseModal({
        show: true,
        product,
        tab: "kg",
        inputValue: "1",
      });
    } else {
      addItem({
        productId: product.id,
        commerceId: product.commerceId,
        name: product.name,
        price: product.price,
        image: product.image,
        commerceName: commerce.name,
        unitType: product.unitType,
      });
    }
  };

  const confirmPurchase = () => {
    if (!purchaseModal.product || !purchaseModal.inputValue) return;
    const pricePerKg = parseFloat(purchaseModal.product.price);
    const inputNum = parseFloat(purchaseModal.inputValue);
    if (isNaN(inputNum) || inputNum <= 0) return;

    let quantity = 1;
    if (purchaseModal.tab === "kg") {
      quantity = inputNum;
    } else {
      // By importe
      quantity = inputNum / pricePerKg;
    }

    addItem({
      productId: purchaseModal.product.id,
      commerceId: purchaseModal.product.commerceId,
      name: purchaseModal.product.name,
      price: purchaseModal.product.price,
      image: purchaseModal.product.image,
      commerceName: commerce.name,
      unitType: purchaseModal.product.unitType,
      quantity,
    });
    setPurchaseModal({ ...purchaseModal, show: false });
  };

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
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${safeImage(commerce.coverImage, "cover")})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button
          onClick={() => navigate("/home")}
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center touch-target z-10"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
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
                        <span className="text-sm font-bold text-[#2E7D32]">
                          ${product.price} {product.unitType === "kg" ? "/ kg" : ""}
                        </span>
                        <button
                          onClick={() => handleAddClick(product)}
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

      {/* Purchase Modal */}
      {purchaseModal.show && purchaseModal.product && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden card-shadow">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg bg-gray-100 bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${purchaseModal.product.image})` }}
              />
              <div>
                <h3 className="font-bold text-gray-800 text-sm leading-tight">{purchaseModal.product.name}</h3>
                <p className="text-xs text-[#2E7D32] font-medium">${purchaseModal.product.price} / kg</p>
              </div>
            </div>

            <div className="p-4">
              <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
                <button
                  onClick={() => setPurchaseModal({ ...purchaseModal, tab: "kg", inputValue: "1" })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    purchaseModal.tab === "kg" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
                  }`}
                >
                  Por Kilos
                </button>
                <button
                  onClick={() => setPurchaseModal({ ...purchaseModal, tab: "importe", inputValue: purchaseModal.product.price })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    purchaseModal.tab === "importe" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
                  }`}
                >
                  Por Importe
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {purchaseModal.tab === "kg" ? "¿Cuántos kilos querés?" : "¿Cuánto dinero querés gastar?"}
                </label>
                <div className="relative">
                  {purchaseModal.tab === "importe" && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  )}
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={purchaseModal.inputValue}
                    onChange={(e) => setPurchaseModal({ ...purchaseModal, inputValue: e.target.value })}
                    className={`w-full h-12 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] ${
                      purchaseModal.tab === "importe" ? "pl-7" : "px-3"
                    }`}
                  />
                  {purchaseModal.tab === "kg" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">kg</span>
                  )}
                </div>
                {purchaseModal.tab === "importe" && parseFloat(purchaseModal.inputValue) > 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Te darán aprox. <span className="font-bold text-gray-700">{(parseFloat(purchaseModal.inputValue) / parseFloat(purchaseModal.product.price)).toFixed(3)} kg</span>
                  </p>
                )}
                {purchaseModal.tab === "kg" && parseFloat(purchaseModal.inputValue) > 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Costo total aprox: <span className="font-bold text-gray-700">${(parseFloat(purchaseModal.inputValue) * parseFloat(purchaseModal.product.price)).toFixed(2)}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={confirmPurchase}
                  disabled={!parseFloat(purchaseModal.inputValue) || parseFloat(purchaseModal.inputValue) <= 0}
                  className="flex-1 h-11 bg-[#2E7D32] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#1B5E20] disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4" /> Agregar al carrito
                </button>
                <button
                  onClick={() => setPurchaseModal({ ...purchaseModal, show: false })}
                  className="px-4 h-11 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CustomerBottomNav active="" />
    </div>
  );
}
