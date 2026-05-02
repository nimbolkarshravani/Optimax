"use client";

import { useState, useCallback } from "react";
import Chat, { Message } from "@/components/Chat";
import Panel, { PanelState } from "@/components/Panel";

const DEFAULT_PANEL: PanelState = {
  objective: "",
  constraints: "",
  openQuestions: "",
  assumptions: "",
  status: "In Progress",
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [panel, setPanel] = useState<PanelState>(DEFAULT_PANEL);
  const [isPanelUpdating, setIsPanelUpdating] = useState(false);

  const updatePanel = useCallback(async (history: Message[]) => {
    setIsPanelUpdating(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (res.ok) {
        const data = await res.json();
        setPanel((prev) => ({
          objective: data.objective ?? prev.objective,
          constraints: data.constraints ?? prev.constraints,
          openQuestions: data.openQuestions ?? prev.openQuestions,
          assumptions: data.assumptions ?? prev.assumptions,
          status: data.status ?? prev.status,
        }));
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

      if (!res.ok || !res.body) {
        throw new Error("Stream failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const { text } = JSON.parse(payload);
            fullText += text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: fullText,
              };
              return updated;
            });
          } catch {
            // malformed chunk, skip
          }
        }
      }

      const finalHistory: Message[] = [
        ...nextMessages,
        { role: "assistant", content: fullText },
      ];
      await updatePanel(finalHistory);
    } catch (err) {
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
        />
      </div>
    </div>
  );
}
