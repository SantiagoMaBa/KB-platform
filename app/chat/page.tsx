"use client";

import { useState, useRef, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, RefreshCw, Sparkles } from "lucide-react";
import { clsx } from "clsx";

const CLIENT_ID = "plaza-demo";
const CLIENT_NAME = "Plaza Centro Norte";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "¿Qué locatarios tienen adeudos pendientes?",
  "¿Qué contratos vencen próximamente?",
  "Resume el reglamento interno",
  "¿Cuál es la tarifa de agua para restaurantes?",
  "¿Qué eventos están aprobados para mayo?",
  "Dame un resumen ejecutivo de la plaza",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          clientId: CLIENT_ID,
          clientName: CLIENT_NAME,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error || "No se pudo obtener respuesta."}`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error de conexión. Verifica tu red e intenta de nuevo.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <AppShell>
      <Header
        title="Asistente IA"
        subtitle={`Consultando KB de ${CLIENT_NAME}`}
        actions={
          messages.length > 0 ? (
            <button onClick={clearChat} className="btn-ghost p-2" title="Nueva conversación">
              <RefreshCw className="w-4 h-4" />
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-8 pb-10">
              {/* Welcome */}
              <div className="text-center space-y-3 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7 text-brand-400" />
                </div>
                <h2 className="font-display font-bold text-xl text-surface-50">
                  Asistente de {CLIENT_NAME}
                </h2>
                <p className="text-surface-400 text-sm leading-relaxed">
                  Consulta contratos, pagos, reglamentos, tarifas y eventos
                  directamente desde la base de conocimiento de la plaza.
                </p>
              </div>

              {/* Starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left px-4 py-3 rounded-xl bg-surface-900 border border-surface-700 hover:border-brand-500/40 hover:bg-surface-800 text-surface-300 hover:text-surface-100 text-sm transition-all duration-150"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={clsx(
                    "flex gap-3 animate-slide-up",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-brand-400" />
                    </div>
                  )}

                  <div
                    className={clsx(
                      "max-w-[78%] rounded-2xl px-4 py-3 text-sm",
                      msg.role === "user"
                        ? "bg-brand-600 text-white rounded-tr-sm"
                        : "bg-surface-900 border border-surface-800 text-surface-200 rounded-tl-sm"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="kb-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-surface-300" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start animate-fade-in">
                  <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="bg-surface-900 border border-surface-800 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-surface-800 bg-surface-950/80 backdrop-blur px-4 py-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre contratos, pagos, reglamentos, tarifas..."
              rows={1}
              className="input resize-none min-h-[44px] max-h-32 py-2.5 leading-relaxed"
              style={{ height: "44px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "44px";
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="btn-primary p-2.5 shrink-0 h-11"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-surface-600 mt-2">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </AppShell>
  );
}
