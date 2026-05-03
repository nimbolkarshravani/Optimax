"use client";

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
}

const STATUS_OPTIONS = [
  "In Progress",
  "Blocked",
  "Awaiting Verification",
  "Verified",
  "Done",
];

const FIELDS: { key: keyof PanelState; label: string; placeholder: string }[] =
  [
    {
      key: "objective",
      label: "Objective",
      placeholder: "What is the main goal?",
    },
    {
      key: "constraints",
      label: "Constraints",
      placeholder: "What limitations or requirements exist?",
    },
    {
      key: "openQuestions",
      label: "Open Questions",
      placeholder: "What needs clarification?",
    },
    {
      key: "assumptions",
      label: "Assumptions",
      placeholder: "What is being assumed?",
    },
  ];

export default function Panel({ state, onChange, isUpdating }: PanelProps) {
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
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              {label}
            </label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[72px]"
              placeholder={placeholder}
              value={state[key]}
              onChange={(e) => onChange(key, e.target.value)}
              rows={3}
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
            Status
          </label>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer"
            value={state.status}
            onChange={(e) => onChange("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <StatusBadge status={state.status} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "In Progress": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Blocked: "bg-red-500/20 text-red-300 border-red-500/30",
    "Awaiting Verification": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    Verified: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    Done: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };

  const cls =
    colors[status] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30";

  return (
    <div className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${cls}`}>
      {status}
    </div>
  );
}
