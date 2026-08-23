import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendChat } from "@/lib/trips.functions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Msg = { id: string; role: string; content: string };

export default function ChatBubble({ tripId }: { tripId?: string | undefined }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open || !tripId) return;
    supabase
      .from("chat_messages")
      .select("id, role, content")
      .eq("trip_id", tripId)
      .order("created_at")
      .then(({ data }) => setMessages(data ?? []));
    inputRef.current?.focus();
  }, [open, tripId]);

  const submit = async () => {
    const text = input.trim();
    if (!text || !tripId || busy) return;
    setInput("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await sendChat({ data: { tripId, message: text, lang } });
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "agent", content: res.reply }]);
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[28rem] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg md:bottom-24">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-semibold">{t("askTripMind")}</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {!tripId && <p className="text-muted-foreground">Open a trip to chat about it.</p>}
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground"
                    : "w-fit max-w-[90%] whitespace-pre-wrap rounded-2xl bg-muted px-3 py-2 text-foreground"
                }
              >
                {m.content}
              </div>
            ))}
            {busy && <p className="text-muted-foreground">TripMind is thinking…</p>}
          </div>
          <div className="flex items-end gap-2 border-t border-border p-3">
            <Textarea
              ref={inputRef}
              value={input}
              disabled={!tripId}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              rows={2}
              placeholder="Can we skip the museum and go shopping instead?"
              className="resize-none rounded-xl"
            />
            <Button size="icon" className="rounded-xl" onClick={() => void submit()} disabled={busy || !tripId}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6"
        aria-label={t("askTripMind")}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </>
  );
}
