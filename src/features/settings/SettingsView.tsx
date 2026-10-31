import React from 'react';
import {
  Settings,
  Sparkles,
  GitBranch,
  Shield,
  Save,
  RotateCcw,
} from 'lucide-react';

interface SettingsViewProps {
  activeModel: string;
  setActiveModel: (m: string) => void;
  isHighThinking: boolean;
  setIsHighThinking: (ht: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeModel,
  setActiveModel,
  isHighThinking,
  setIsHighThinking,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>Agent & Platform Settings</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Configure model intelligence, reasoning depth, Git branch patterns, and validation rules
        </p>
      </div>

      <div className="space-y-4">
        {/* Model & Reasoning */}
        <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Gemini Intelligence Engine</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Active Model</label>
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="gemini-4-argon">gemini-4-argon (Recommended: Deep architectural reasoning & high thinking)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (General development tasks & fast execution)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Lightweight file summaries & fast validation)</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <div className="font-semibold text-zinc-200">High Thinking Mode (Reasoning Depth)</div>
                <p className="text-[11px] text-zinc-400">
                  Enables extended chain-of-thought analysis in gemini-4-argon to anticipate edge cases and dependencies.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isHighThinking}
                onChange={(e) => setIsHighThinking(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Branch & Commit Conventions */}
        <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <span>Git & Branching Conventions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Branch Naming Prefix</label>
              <input
                type="text"
                defaultValue="agent/"
                readOnly
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-400 font-mono"
              />
              <span className="text-[10px] text-zinc-500">Dedicated branch isolate changes from default branch</span>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Commit Message Prefix</label>
              <input
                type="text"
                defaultValue="[OctoAgent]"
                readOnly
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-400 font-mono"
              />
              <span className="text-[10px] text-zinc-500">Atomic commits signed with clear agent provenance</span>
            </div>
          </div>
        </div>

        {/* Security & Isolation */}
        <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Security & Zero-Leak Guarantees</span>
          </div>

          <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
            <li>Tokens encrypted using authenticated AES-256-GCM prior to persistent storage.</li>
            <li>No PAT credentials exposed to browser DOM, local storage, or network URLs.</li>
            <li>Strict ABAC Firestore security rules restricting reads to authenticated document owners.</li>
            <li>Untrusted repository source code is validated without privileged arbitrary server execution.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
