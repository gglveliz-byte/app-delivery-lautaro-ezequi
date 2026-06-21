import { useCallback } from "react";
import { toast } from "sonner";

export function useDriverNotification() {
  const notifyNewOrder = useCallback(() => {
    toast("Nuevo pedido disponible", {
      description: "Hay un pedido esperando ser aceptado",
      duration: 5000,
    });

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(200);
      }
    } catch {}

    try {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Nuevo pedido!", {
            body: "Hay un pedido disponible cerca de ti",
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((p) => {
            if (p === "granted") {
              new Notification("Nuevo pedido!", {
                body: "Hay un pedido disponible cerca de ti",
              });
            }
          });
        }
      }
    } catch {}
  }, []);

  return { notifyNewOrder };
}
