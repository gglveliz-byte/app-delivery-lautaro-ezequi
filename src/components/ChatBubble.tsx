import { useNavigate } from "react-router";
import { MessageCircle } from "lucide-react";

export default function ChatBubble({ orderId, role = "customer" }: { orderId: number; role?: "customer" | "driver" }) {
  const navigate = useNavigate();
  const path = role === "driver" ? `/driver/chat/${orderId}` : `/chat/${orderId}`;

  return (
    <button
      onClick={() => navigate(path)}
      className="fixed bottom-6 right-4 w-14 h-14 bg-[#2E7D32] rounded-full flex items-center justify-center shadow-xl hover:bg-[#1B5E20] active:scale-95 transition-all z-50"
      style={{ filter: "drop-shadow(0 4px 12px rgba(46,125,50,0.4))" }}
    >
      <MessageCircle className="w-7 h-7 text-white" />
    </button>
  );
}
