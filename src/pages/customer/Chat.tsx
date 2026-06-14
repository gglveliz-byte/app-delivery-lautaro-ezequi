import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send, User } from "lucide-react";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { useChatMessages, useSendChatMessage, trpcMutate } from "@/hooks/useDeliveryData";

const quickMessages = [
  "Hola, una pregunta",
  "Cuanto falta?",
  "Gracias!",
  "Llego enseguida",
];

export default function Chat() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { customer } = useCustomerSession();
  const { data: messages, refresh } = useChatMessages(Number(orderId));
  const sendChat = useSendChatMessage(Number(orderId));
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (orderId && customer) {
      trpcMutate("chat.markAsRead", { orderId: Number(orderId), readerType: "customer" }).catch(() => {});
    }
  }, [orderId, customer]);

  const handleSend = async (msg: string) => {
    if (!msg.trim() || !customer) return;
    try {
      await sendChat.mutateAsync({
        orderId: Number(orderId),
        senderType: "customer",
        senderId: customer.id,
        senderName: `${customer.firstName} ${customer.lastName}`,
        message: msg.trim(),
      });
      setText("");
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mobile-container bg-gray-100 min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="touch-target">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="w-9 h-9 bg-[#2E7D32] rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-gray-800">Soporte</h1>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            En linea
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="text-center">
          <span className="text-xs text-gray-400 bg-gray-200 px-3 py-1 rounded-full">
            Pedido #{orderId}
          </span>
        </div>
        {messages.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderType === "customer" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.senderType === "customer"
                  ? "bg-[#2E7D32] text-white rounded-tr-sm"
                  : "bg-white text-gray-800 rounded-tl-sm card-shadow"
              }`}
            >
              <p>{msg.message}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.senderType === "customer" ? "text-green-200" : "text-gray-400"
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Messages */}
        <div className="bg-white px-4 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
          {quickMessages.map((qm) => (
            <button
              key={qm}
              onClick={() => handleSend(qm)}
              className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600 whitespace-nowrap hover:bg-gray-200 transition-colors"
            >
              {qm}
            </button>
          ))}
        </div>

      {/* Input */}
      <div className="bg-white px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(text)}
            placeholder="Escribe un mensaje..."
            className="flex-1 h-10 px-4 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
          />
          <button
            onClick={() => handleSend(text)}
            disabled={sendChat.isPending || !text.trim()}
            className="w-10 h-10 bg-[#2E7D32] rounded-full flex items-center justify-center text-white hover:bg-[#1B5E20] disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
