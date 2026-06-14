import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useOrderEvents(orderId: number | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orderId) return;

    const eventSource = new EventSource(`/api/events/orders/${orderId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Invalidate and refetch order query
        queryClient.invalidateQueries({ queryKey: ["order.getById", orderId] });
      } catch (err) {
        console.error("[SSE] Error parsing event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[SSE] Connection error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [orderId, queryClient]);
}

export function useCommerceEvents(commerceId: number | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!commerceId) return;

    const eventSource = new EventSource(`/api/events/commerce/${commerceId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Invalidate commerce orders
        queryClient.invalidateQueries({ queryKey: ["order.getCommerceOrders", commerceId] });
      } catch (err) {
        console.error("[SSE] Error parsing event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[SSE] Connection error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [commerceId, queryClient]);
}

export function useDriverEvents(driverId: number | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!driverId) return;

    const eventSource = new EventSource(`/api/events/driver/${driverId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Invalidate driver available orders
        queryClient.invalidateQueries({ queryKey: ["order.getAvailableForDriver"] });
      } catch (err) {
        console.error("[SSE] Error parsing event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[SSE] Connection error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [driverId, queryClient]);
}
