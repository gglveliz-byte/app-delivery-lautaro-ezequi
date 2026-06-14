import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user dismissed or already installed
    const dismissed = localStorage.getItem("pwa_dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa_dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#2E7D32] rounded-lg flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Instalá YA LLEGA en tu celular
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Accedé más rápido y recibí notificaciones
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 h-9 bg-[#2E7D32] text-white text-sm font-medium rounded-lg hover:bg-[#1B5E20] transition-colors"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="h-9 px-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
