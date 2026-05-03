"use client";

import { useEffect, useState } from "react";

export interface PanelState {
  objective: string;
  constraints: string;
  openQuestions: string;
  assumptions: string;
  status: string;
}

interface PanelProps {
  state: PanelState;
  onChange: (field: keyof PanelState, value: string) => void;
  isUpdating: boolean;
  changedFields?: Set<keyof PanelState>;
}

// Ordered stages shown in the progress bar
const STAGES = [
  "Defining",
  "In Progress",
  "Awaiting Verification",
  "Verified",
  "Done",
] as const;

const FIELDS: { key: keyof PanelState; label: string; placeholder: string }[] = [
  { key: "objective",     label: "Objective",      placeholder: "What is the main goal?" },
  { key: "constraints",   label: "Constraints",    placeholder: "What limitations or requirements exist?" },
  { key: "openQuestions", label: "Open Questions", placeholder: "What needs clarification?" },
  { key: "assumptions",   label: "Assumptions",    placeholder: "What is being assumed?" },
];

export default function Panel({ state, onChange, isUpdating, changedFields }: PanelProps) {
  const [flashKeys, setFlashKeys] = useState<Partial<Record<keyof PanelState, number>>>({});

  useEffect(() => {
    if (!changedFields || changedFields.size === 0) return;
    setFlashKeys((prev) => {
      const next = { ...prev };
      changedFields.forEach((f) => { next[f] = (prev[f] ?? 0) + 1; });
      return next;
    });
  }, [changedFields]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-200 tracking-wide uppercase">
          Conversation Structure
        </h2>
        {isUpdating && (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Updating
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {FIELDS.map(({ key, label, placeholder }) => {
          const flashKey = flashKeys[key];
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {label}
                </label>
                {flashKey !== undefined && (
                  <span
                    key={flashKey}
                    className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 field-flash"
                  />
                )}
              </div>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[72px]"
                placeholder={placeholder}
                value={state[key]}
                onChange={(e) => onChange(key, e.target.value)}
                rows={3}
              />
            </div>
          );
        })}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">
            Status
          </label>
          <StatusBar status={state.status} />
        </div>
      </div>
    </div>
  );
}

function StatusBar({ status }: { status: string }) {
  const isBlocked = status === "Blocked";

  // For Blocked, treat the active stage as "In Progress" but render red
  const effectiveStatus = isBlocked ? "In Progress" : status;
  const activeIndex = STAGES.indexOf(effectiveStatus as typeof STAGES[number]);

  return (
    <div className="space-y-2">
      {/* Pills row */}
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => {
          const isPast    = i < activeIndex;
          const isActive  = i === activeIndex;
          const isFuture  = i > activeIndex;

          let pillCls: string;
          if (isActive && isBlocked) {
            pillCls = "bg-red-500/20 text-red-300 border border-red-500/50 ring-1 ring-red-500/40";
          } else if (isActive) {
            pillCls = "bg-blue-500/20 text-blue-300 border border-blue-500/50 ring-1 ring-blue-500/40";
          } else if (isPast) {
            pillCls = "bg-gray-700/60 text-gray-400 border border-gray-600/40";
          } else {
            pillCls = "bg-transparent text-gray-600 border border-gray-700/40";
          }

          return (
            <div key={stage} className="flex items-center flex-1 min-w-0">
              <div
                className={`flex-1 text-center px-1 py-1 rounded-full text-[10px] font-medium leading-tight transition-all ${pillCls}`}
                style={{ minWidth: 0 }}
              >
                <span className="block truncate px-0.5">
                  {stage === "Awaiting Verification" ? "Verifying" : stage}
                </span>
              </div>
              {/* Connector line between pills */}
              {i < STAGES.length - 1 && (
                <div
                  className={`h-px w-1 shrink-0 ${
                    i < activeIndex ? "bg-gray-500" : "bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Full label + blocked note below */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${isBlocked ? "text-red-400" : "text-gray-400"}`}>
          {status}
        </span>
        {isBlocked && (
          <span className="text-xs text-red-500/80">· blocked</span>
        )}
      </div>
    </div>
  );
}
