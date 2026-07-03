import { useEffect } from "react";
import { useLocation } from "react-router";

export function DynamicManifest() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    
    // Determine if we are in a backoffice route
    const isBackoffice =
      path.startsWith("/admin") ||
      path.startsWith("/driver") ||
      path === "/commerce" ||
      path.startsWith("/commerce/orders") ||
      path.startsWith("/commerce/products") ||
      path.startsWith("/commerce/stats") ||
      path.startsWith("/commerce/profile") ||
      path === "/login"; // The backoffice login

    const manifestUrl = isBackoffice ? "/manifest-partners.json" : "/manifest.json";

    // Check if link already exists
    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    
    // Only update if it changed to avoid unnecessary reloads
    if (link.getAttribute("href") !== manifestUrl) {
      link.setAttribute("href", manifestUrl);
    }
  }, [location.pathname]);

  return null;
}
