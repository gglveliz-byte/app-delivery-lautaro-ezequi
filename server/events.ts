// Simple in-memory event bus for SSE
type Listener = (data: any) => void;

const listeners: Map<string, Set<Listener>> = new Map();

export function emit(channel: string, data: any) {
  const channelListeners = listeners.get(channel);
  if (!channelListeners) return;
  
  channelListeners.forEach((listener) => {
    try {
      listener(data);
    } catch (err) {
      console.error(`[SSE] Error in listener for ${channel}:`, err);
    }
  });
}

export function subscribe(channel: string, listener: Listener): () => void {
  if (!listeners.has(channel)) {
    listeners.set(channel, new Set());
  }
  
  const channelListeners = listeners.get(channel)!;
  channelListeners.add(listener);
  
  // Return unsubscribe function
  return () => {
    channelListeners.delete(listener);
    if (channelListeners.size === 0) {
      listeners.delete(channel);
    }
  };
}
