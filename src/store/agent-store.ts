import { create } from "zustand";
import type {
  AgentConfig,
  AgentInternalState,
  AgentState,
  CriticNote,
  LLMConfig,
  SeedThemeKey,
  TendencyProfile,
} from "../types/agent";
import { createInitialInternalState } from "../agent/organism-brain";
import {
  createDefaultTendencyProfile,
  loadTendencyProfile,
  saveTendencyProfile,
} from "../agent/tendency-profile";
import { llmConfigFromEnv } from "../lib/llm-env";

interface AgentStore {
  state: AgentState;
  config: AgentConfig;
  llmConfig: LLMConfig;
  internal: AgentInternalState;
  logs: Array<{
    text: string;
    timestamp: number;
    type: "action" | "thought" | "critic";
  }>;
  availableModels: string[];
  ollamaConnected: boolean;

  setState: (state: AgentState) => void;
  setConfig: (config: Partial<AgentConfig>) => void;
  setLLMConfig: (config: Partial<LLMConfig>) => void;
  updateInternal: (partial: Partial<AgentInternalState>) => void;
  addLog: (text: string, type: "action" | "thought" | "critic") => void;
  clearLogs: () => void;
  setAvailableModels: (models: string[]) => void;
  setOllamaConnected: (connected: boolean) => void;
  setCritic: (critic: CriticNote | null) => void;
  setTendencyProfile: (profile: TendencyProfile) => void;
  setSeedTheme: (seedTheme: SeedThemeKey) => void;
  resetRun: () => void;
  resetAll: () => void;
}

const defaultConfig: AgentConfig = {
  autonomy: 0.9,
  intensity: 0.82,
  speedPreset: "hyper",
  burstMin: 10,
  burstMax: 20,
  criticInterval: 6,
  seedTheme: "none",
};

const defaultLLMConfig: LLMConfig = llmConfigFromEnv();

function createInternal(config: AgentConfig, profile?: TendencyProfile) {
  return createInitialInternalState(profile ?? loadTendencyProfile(), config);
}

export const useAgentStore = create<AgentStore>((set) => ({
  state: "idle",
  config: defaultConfig,
  llmConfig: defaultLLMConfig,
  internal: createInternal(defaultConfig),
  logs: [],
  availableModels: [],
  ollamaConnected: false,

  setState: (state) => set({ state }),

  setConfig: (partial) =>
    set((store) => ({
      config: { ...store.config, ...partial },
    })),

  setLLMConfig: (partial) =>
    set((store) => ({ llmConfig: { ...store.llmConfig, ...partial } })),

  updateInternal: (partial) =>
    set((store) => {
      const nextInternal = { ...store.internal, ...partial };
      saveTendencyProfile(nextInternal.tendencyProfile);
      return { internal: nextInternal };
    }),

  addLog: (text, type) =>
    set((store) => ({
      logs: [...store.logs.slice(-240), { text, timestamp: Date.now(), type }],
    })),

  clearLogs: () => set({ logs: [] }),

  setAvailableModels: (models) => set({ availableModels: models }),

  setOllamaConnected: (connected) => set({ ollamaConnected: connected }),

  setCritic: (critic) =>
    set((store) => ({ internal: { ...store.internal, critic } })),

  setTendencyProfile: (profile) =>
    set((store) => {
      saveTendencyProfile(profile);
      return {
        internal: { ...store.internal, tendencyProfile: profile },
      };
    }),

  setSeedTheme: (seedTheme) =>
    set((store) => ({
      config: { ...store.config, seedTheme },
    })),

  resetRun: () =>
    set((store) => ({
      state: "idle",
      internal: createInternal(store.config, store.internal.tendencyProfile),
      logs: [],
    })),

  resetAll: () => {
    const freshProfile = createDefaultTendencyProfile();
    saveTendencyProfile(freshProfile);
    set({
      state: "idle",
      config: defaultConfig,
      llmConfig: llmConfigFromEnv(),
      internal: createInternal(defaultConfig, freshProfile),
      logs: [],
      availableModels: [],
      ollamaConnected: false,
    });
  },
}));
