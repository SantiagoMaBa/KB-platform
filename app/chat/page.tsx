"use client";

import { useState, useRef, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, RefreshCw, Sparkles, AlertTriangle, Settings } from "lucide-react";
import { clsx } from "clsx";
import { useClientContext } from "@/lib/client-context";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_STARTERS = [
  "Dame un resumen ejecutivo del negocio",
  "¿Qué temas cubre la base de conocimiento?",
  "¿Cuáles son los puntos más importantes?",
  "¿Qué alertas o riesgos hay actualmente?",
  "¿Cuál es la situación financiera actual?",
  "¿Qué acciones se recomiendan tomar?",
];

export default function ChatPage() {
  const { clientId, clientName } = useClientContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [kbEmpty,  setKbEmpty]  = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/documents?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => { if ((data?.wiki?.length ?? 0) === 0) setKbEmpty(true); })
      .catch(() => {});
  }, [clientId]);

  // Reset chat when client changes
  useEffect(() => {
    setMessages([]);
    setKbEmpty(false);
  }, [clientId]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "44px";

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: updatedMessages, clientId, clientName }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role:    "assistant",
          content: res.ok ? data.content : `Error: ${data.error || "Sin respuesta"}`,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error de conexión. Inténtalo de nuevo." }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  const adminUrl = clientId !== "plaza-demo"
    ? `/admin/clients/${clientId}?tab=kb`
    : "/admin";

  return (
    <AppShell>
      <Header
        title="Asistente IA"
        subtitle={`KB de ${clientName}`}
        actions={
          messages.length > 0 ? (
            <button onClick={() => setMessages([])} className="btn-ghost text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Nueva conversación
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
        {/* KB empty warning */}
        {kbEmpty && (
          <div className="shrink-0 flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 flex-1">
              <span className="font-semibold">La KB no tiene documentos compilados.</span>{" "}
              El asistente no tendrá contexto específico hasta que subas y compiles documentos.
            </p>
            <a href={adminUrl} className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg hover:bg-amber-200 transition-colors">
              <Settings className="w-3 h-3" />
              Configurar
            </a>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
              <div className="text-center space-y-3 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto shadow-card-md">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h2 className="font-display font-bold text-xl text-slate-900">
                  Asistente de {clientName}
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Consulta cualquier información de la base de conocimiento de {clientName}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                {DEFAULT_STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 text-slate-600 hover:text-slate-800 text-sm transition-all duration-150 shadow-card"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={clsx("flex gap-3 animate-slide-up", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={clsx(
                    "max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-card",
                    msg.role === "user"
                      ? "bg-brand-600 text-white rounded-tr-sm"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                  )}>
                    {msg.role === "assistant" ? (
                      <div className="kb-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed text-[13px]">{msg.content}</p>
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
                    <div className="typing-dots"><span /><span /><span /></div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3.5">
          <div className="max-w-3xl mx-auto flex gap-2.5 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={autoResize}
              onKeyDown={handleKeyDown}
              placeholder={`Pregunta sobre ${clientName}…`}
              rows={1}
              className="input resize-none min-h-[44px] max-h-32 py-2.5 leading-relaxed text-sm"
              style={{ height: "44px" }}
              disabled={loading}
            />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} className="btn-primary px-3 py-2.5 shrink-0 h-11">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2">Enter para enviar · Shift+Enter para nueva línea</p>
        </div>
      </div>
    </AppShell>
  );
}
