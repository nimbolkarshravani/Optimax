"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Chat, { Message } from "@/components/Chat";
import Panel, { PanelState } from "@/components/Panel";

const DEFAULT_PANEL: PanelState = {
  objective: "",
  constraints: "",
  openQuestions: "",
  assumptions: "",
  status: "In Progress",
};

const TEXT_FIELDS = ["objective", "constraints", "openQuestions", "assumptions"] as const;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [panel, setPanel] = useState<PanelState>(DEFAULT_PANEL);
  const [isPanelUpdating, setIsPanelUpdating] = useState(false);
  const [changedFields, setChangedFields] = useState<Set<keyof PanelState>>(new Set());

  // Always-current panel ref so updatePanel closure never goes stale
  const panelRef = useRef<PanelState>(DEFAULT_PANEL);
  useEffect(() => { panelRef.current = panel; }, [panel]);

  const updatePanel = useCallback(async (history: Message[]) => {
    setIsPanelUpdating(true);
    const prev = panelRef.current;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, currentStatus: prev.status }),
      });
      if (res.ok) {
        const data = await res.json();
        const next: PanelState = {
          objective:     data.objective     ?? prev.objective,
          constraints:   data.constraints   ?? prev.constraints,
          openQuestions: data.openQuestions ?? prev.openQuestions,
          assumptions:   data.assumptions   ?? prev.assumptions,
          status:        data.status        ?? prev.status,
        };

        // Compute which text fields actually changed
        const changed = new Set<keyof PanelState>();
        for (const key of TEXT_FIELDS) {
          if (next[key] !== prev[key]) changed.add(key);
        }
        setChangedFields(changed);
        setPanel(next);
      }
    } finally {
      setIsPanelUpdating(false);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const { text } = JSON.parse(payload);
            fullText += text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: fullText };
              return updated;
            });
          } catch {
            // malformed chunk, skip
          }
        }
      }

      await updatePanel([...nextMessages, { role: "assistant", content: fullText }]);
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, updatePanel]);

  const handlePanelChange = useCallback(
    (field: keyof PanelState, value: string) => {
      setPanel((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  return (
    <div className="flex h-screen">
      <div className="w-[70%] flex flex-col min-w-0">
        <Chat
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={sendMessage}
          isStreaming={isStreaming}
        />
      </div>
      <div className="w-[30%] flex flex-col min-w-0">
        <Panel
          state={panel}
          onChange={handlePanelChange}
          isUpdating={isPanelUpdating}
          changedFields={changedFields}
        />
      </div>
    </div>
  );
}
