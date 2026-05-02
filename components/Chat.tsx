"use client";

import { useRef, useEffect } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
}

export default function Chat({
  messages,
  input,
  onInputChange,
  onSend,
  isStreaming,
}: ChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim()) onSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <h1 className="text-sm font-semibold text-gray-200 tracking-wide">
          Optimax
        </h1>
        <span className="text-xs text-gray-500">
          AI chat with live structure tracking
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-sm">Start a conversation.</p>
              <p className="text-gray-600 text-xs">
                The panel on the right will track structure in real time.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {isStreaming &&
          messages[messages.length - 1]?.role === "assistant" &&
          messages[messages.length - 1]?.content === "" && (
            <div className="flex gap-1 pl-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}

        <div ref={bottomRef} />
      </div>

      <div className="px-5 py-4 border-t border-gray-800">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors max-h-40"
            placeholder="Message Optimax… (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-xl transition-colors shrink-0"
            onClick={onSend}
            disabled={isStreaming || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-800 text-gray-100 rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
