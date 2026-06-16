import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const MAX_RECONNECT_DELAY = 30000;
const BASE_RECONNECT_DELAY = 1000;

function createReconnectingEventSource(url: string, onMessage: (data: unknown) => void): { close: () => void } {
  let eventSource: EventSource | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let isClosed = false;

  const connect = () => {
    if (isClosed) return;
    
    eventSource = new EventSource(url);

    // Listen for named "update" events from SSE
    eventSource.addEventListener("update", (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
        reconnectAttempts = 0; // Reset on successful message
      } catch (err) {
        console.error("[SSE] Error parsing event:", err);
      }
    });

    // Also listen for unnamed messages (fallback)
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
        reconnectAttempts = 0;
      } catch (err) {
        // Ignore ping messages that aren't JSON
      }
    };

    eventSource.onerror = (err) => {
      console.error("[SSE] Connection error:", err);
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      if (isClosed) return;

      // Exponential backoff with jitter
      const delay = Math.min(
        BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts) + Math.random() * 1000,
        MAX_RECONNECT_DELAY
      );
      
      reconnectAttempts++;
      console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
      
      reconnectTimeout = setTimeout(connect, delay);
    };
  };

  connect();

  return {
    close: () => {
      isClosed = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    }
  };
}

export function useOrderEvents(orderId: number | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orderId) return;

    const connection = createReconnectingEventSource(
      `/api/events/orders/${orderId}`,
      () => {
        queryClient.invalidateQueries({ queryKey: ["order.getById", orderId] });
        queryClient.invalidateQueries({ queryKey: ["chat.getByOrder", orderId] });
      }
    );

    return () => connection.close();
  }, [orderId, queryClient]);
}

export function useCommerceEvents(commerceId: number | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!commerceId) return;

    const connection = createReconnectingEventSource(
      `/api/events/commerce/${commerceId}`,
      () => {
        queryClient.invalidateQueries({ queryKey: ["order.getCommerceOrders", commerceId] });
        queryClient.invalidateQueries({ queryKey: ["product.getByCommerce", commerceId] });
      }
    );

    return () => connection.close();
  }, [commerceId, queryClient]);
}

export function useDriverEvents(driverId: number | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!driverId) return;

    const connection = createReconnectingEventSource(
      `/api/events/driver/${driverId}`,
      () => {
        queryClient.invalidateQueries({ queryKey: ["order.getAvailableForDriver"] });
        queryClient.invalidateQueries({ queryKey: ["driver.getOrderHistory"] });
      }
    );

    return () => connection.close();
  }, [driverId, queryClient]);
}

export function useProductEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const connection = createReconnectingEventSource(
      `/api/events/products`,
      () => {
        queryClient.invalidateQueries({ queryKey: ["product.getFeatured"] });
        queryClient.invalidateQueries({ queryKey: ["product.list"] });
        // Invalidar todas las queries de productos por comercio
        queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "product.getByCommerce" });
      }
    );

    return () => connection.close();
  }, [queryClient]);
}
