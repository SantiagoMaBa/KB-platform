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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }

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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.ok
            ? data.content
            : `Error: ${data.error || "Sin respuesta"}`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error de conexión. Inténtalo de nuevo." },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  return (
    <AppShell>
      <Header
        title="Asistente IA"
        subtitle={`KB de ${CLIENT_NAME}`}
        actions={
          messages.length > 0 ? (
            <button
              onClick={() => setMessages([])}
              className="btn-ghost text-xs gap-1.5"
              title="Nueva conversación"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Nueva conversación
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
              <div className="text-center space-y-3 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto shadow-card-md">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h2 className="font-display font-bold text-xl text-slate-900">
                  Asistente de {CLIENT_NAME}
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Consulta contratos, pagos, reglamentos, tarifas y eventos
                  desde la base de conocimiento de la plaza.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 text-slate-600 hover:text-slate-800 text-sm transition-all duration-150 shadow-card text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={clsx(
                    "flex gap-3 animate-slide-up",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={clsx(
                      "max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-card",
                      msg.role === "user"
                        ? "bg-brand-600 text-white rounded-tr-sm"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="kb-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed text-[13px]">
                        {msg.content}
                      </p>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start animate-fade-in">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
                    <div className="typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3.5">
          <div className="max-w-3xl mx-auto flex gap-2.5 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={autoResize}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre contratos, pagos, reglamentos, tarifas..."
              rows={1}
              className="input resize-none min-h-[44px] max-h-32 py-2.5 leading-relaxed text-sm"
              style={{ height: "44px" }}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="btn-primary px-3 py-2.5 shrink-0 h-11"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </AppShell>
  );
}
