export interface LLMConfig {
  endpoint: string;
  model: string;
  apiKey: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

interface OllamaTagsResponse {
  models: Array<{ name: string; size: number }>;
}

const DEFAULT_ENDPOINT = "http://localhost:11434";

export async function chatCompletion(
  config: LLMConfig,
  messages: ChatMessage[]
): Promise<string> {
  const endpoint = config.endpoint || DEFAULT_ENDPOINT;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(`${endpoint}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
      options: {
        temperature: 0.8,
        num_predict: 2048,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const data: OllamaChatResponse = await res.json();
  return data.message.content;
}

export async function listModels(
  endpoint: string = DEFAULT_ENDPOINT,
  apiKey?: string
): Promise<string[]> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${endpoint}/api/tags`, { headers });
    if (!res.ok) return [];
    const data: OllamaTagsResponse = await res.json();
    return data.models.map((m) => m.name);
  } catch {
    return [];
  }
}

export async function checkConnection(
  endpoint: string = DEFAULT_ENDPOINT,
  apiKey?: string
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${endpoint}/api/tags`, {
      headers,
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function extractJSON(text: string): unknown | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      return null;
    }
  }

  const bracketMatch = text.match(/\[[\s\S]*\]/);
  if (bracketMatch) {
    try {
      return JSON.parse(bracketMatch[0]);
    } catch {
      return null;
    }
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      return null;
    }
  }

  return null;
}
