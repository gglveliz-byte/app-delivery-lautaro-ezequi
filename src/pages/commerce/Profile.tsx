import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Camera, Store, Mail, FileText, Clock, LocateFixed, MapPin, Phone, Save,
} from "lucide-react";
import { safeImage } from "@/lib/imageUtils";
import { useCommerce, useMerchantCommerceId, useToggleCommerceStatus, useUpdateCommerceProfile } from "@/hooks/useDeliveryData";
import CommerceLayout from "@/components/CommerceLayout";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=es`,
      { headers: { "User-Agent": "YALlega-App/1.0" } }
    );
    const data = await res.json();
    if (data?.display_name) return data.display_name;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

export default function CommerceProfile() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const storedUser = localStorage.getItem("merchant_user");
  const merchantUser = storedUser ? JSON.parse(storedUser) : null;
  const registeredEmail = merchantUser?.email || "";
  const { commerceId } = useMerchantCommerceId();
  const { data: commerce, loading } = useCommerce(commerceId || 0);

  const [form, setForm] = useState({
    name: "", description: "", address: "", phone: "", email: "",
    logo: "", coverImage: "", minOrder: "", deliveryTime: "", openHours: "",
    lat: "", lng: "",
  });
  const [geoLoading, setGeoLoading] = useState(false);

  const initMap = useCallback((lat: number, lng: number) => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "© OpenStreetMap",
    }).addTo(map);
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      setForm((prev) => ({ ...prev, lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) }));
      const addr = await getAddressFromCoords(pos.lat, pos.lng);
      setForm((prev) => ({ ...prev, address: addr }));
    });
    mapInstanceRef.current = map;
    markerRef.current = marker;
  }, []);

  const updateMarker = useCallback((lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15);
    }
  }, []);

  useEffect(() => {
    if (!commerce) return;
    const clat = parseFloat(commerce.lat) || -34.6037;
    const clng = parseFloat(commerce.lng) || -58.3816;
    setForm({
      name: commerce.name || "",
      description: commerce.description || "",
      address: commerce.address || "",
      phone: commerce.phone || "",
      email: commerce.email || "",
      logo: commerce.logo || "",
      coverImage: commerce.coverImage || "",
      minOrder: commerce.minOrder || "",
      deliveryTime: commerce.deliveryTime || "",
      openHours: commerce.openHours || "",
      lat: String(clat),
      lng: String(clng),
    });
    setTimeout(() => initMap(clat, clng), 100);
  }, [commerce, initMap]);

  const updateCommerceProfile = useUpdateCommerceProfile(commerceId || 0);
  const toggleCommerceStatus = useToggleCommerceStatus(commerceId || 0);

  const handleSave = async () => {
    if (!commerceId) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateCommerceProfile.mutateAsync(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOpen = async () => {
    if (!commerceId) return;
    try {
      await toggleCommerceStatus.mutateAsync();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    setForm((prev) => ({ ...prev, logo: dataUrl }));
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    setForm((prev) => ({ ...prev, coverImage: dataUrl }));
  };

  const handleGetLocation = async () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const addr = await getAddressFromCoords(lat, lng);
      setForm((prev) => ({ ...prev, address: addr, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
      updateMarker(lat, lng);
    } catch {} finally {
      setGeoLoading(false);
    }
  };

  if (loading) {
    return (
      <CommerceLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full" />
        </div>
      </CommerceLayout>
    );
  }

  return (
    <CommerceLayout>
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/commerce")} className="touch-target">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Perfil del comercio</h1>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Status card */}
        <div className="bg-white rounded-xl card-shadow p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Estado del comercio</p>
            <p className={`text-xs mt-0.5 ${commerce?.isOpen === "open" ? "text-green-600" : "text-red-500"}`}>
              {commerce?.isOpen === "open" ? "Abierto" : "Cerrado"}
            </p>
          </div>
          <button
            onClick={handleToggleOpen}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              commerce?.isOpen === "open"
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-green-50 text-[#2E7D32] hover:bg-green-100"
            }`}
          >
            {commerce?.isOpen === "open" ? "Cerrar" : "Abrir"}
          </button>
        </div>

        {/* Logo / Cover */}
        <div className="bg-white rounded-xl card-shadow overflow-hidden">
          <div className="relative h-32 bg-gray-100">
            {form.coverImage ? (
              <img src={safeImage(form.coverImage, "cover")} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = safeImage(null, "cover") }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Portada</div>
            )}
            <label className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center cursor-pointer shadow hover:bg-white transition-colors">
              <Camera className="w-4 h-4 text-gray-600" />
              <input type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
            </label>
          </div>
          <div className="px-4 pb-4 -mt-10">
            <div className="flex items-end gap-4">
              <div className="relative w-20 h-20 rounded-xl bg-gray-100 border-4 border-white overflow-hidden shadow flex-shrink-0">
                {form.logo ? (
                  <img src={safeImage(form.logo, "logo")} alt="logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = safeImage(null, "logo") }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Store className="w-8 h-8" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center cursor-pointer shadow border border-gray-200">
                  <Camera className="w-3 h-3 text-gray-600" />
                  <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-800 truncate">{commerce?.name}</h2>
                <p className="text-xs text-gray-500">{commerce?.status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl card-shadow p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                <Store className="w-3.5 h-3.5" /> Nombre
              </label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                <Mail className="w-3.5 h-3.5" /> Email de registro
              </label>
              <input type="email" value={registeredEmail} readOnly
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
              <FileText className="w-3.5 h-3.5" /> Descripción
            </label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] outline-none resize-none" />
          </div>

          {/* Address with map */}
          <div>
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
              <MapPin className="w-3.5 h-3.5" /> Dirección
            </label>
            <div className="flex gap-2">
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Dirección del comercio"
                className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] outline-none" />
              <button onClick={handleGetLocation} disabled={geoLoading}
                className="h-9 px-3 bg-[#2E7D32] text-white rounded-lg hover:bg-[#1B5E20] transition-colors flex items-center gap-1 text-sm disabled:opacity-50">
                <LocateFixed className="w-4 h-4" />
                {geoLoading ? "" : "Ubicación"}
              </button>
            </div>
            <div ref={mapRef} className="w-full h-64 rounded-lg mt-2 z-0" />
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>Lat: {form.lat || "-"}</span>
              <span>Lng: {form.lng || "-"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                <Phone className="w-3.5 h-3.5" /> Teléfono
              </label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5" /> Horarios
              </label>
              <input type="text" value={form.openHours} onChange={(e) => setForm({ ...form, openHours: e.target.value })}
                placeholder="Ej: Lun-Vie 9-21, Sab 10-18"
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1">Pedido mínimo</label>
              <input type="text" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1">Tiempo de entrega</label>
              <input type="text" value={form.deliveryTime} onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                placeholder="Ej: 30-45 min"
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] outline-none" />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 bg-[#2E7D32] text-white font-medium rounded-xl hover:bg-[#1B5E20] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : saved ? "Guardado!" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </CommerceLayout>
  );
}
