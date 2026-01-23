const DEFAULT_BASE_URL = process.env.VUE_APP_MASTRA_BASE_URL || 'http://localhost:4111';
const DEFAULT_AGENT = process.env.VUE_APP_MASTRA_AGENT || 'inventoryAgent';

export type AgentResponse = {
  text?: string;
  data?: unknown;
};

const sanitizeAgentText = (value: string) => {
  let sanitized = value;
  sanitized = sanitized.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  sanitized = sanitized.replace(/<\/?response>/gi, '');
  return sanitized.trim();
};

const buildPrompt = (input: string, context?: Record<string, unknown>) => {
  if (!context || !Object.keys(context).length) return input;
  return `${input}\n\nContext (JSON):\n${JSON.stringify(context)}`;
};

export async function askInventoryAgent(
  input: string,
  context?: Record<string, unknown>
): Promise<AgentResponse> {
  const response = await fetch(`${DEFAULT_BASE_URL}/api/agents/${DEFAULT_AGENT}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [buildPrompt(input, context)],
      requestContext: context || undefined,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Agent request failed with ${response.status}`);
  }

  const payload = await response.json().catch(() => ({}));
  if (typeof payload === 'string') return { text: sanitizeAgentText(payload) };
  if (payload?.text && typeof payload.text === 'string') {
    return { ...payload, text: sanitizeAgentText(payload.text) };
  }
  return payload;
}

export async function executeAgentTool(
  toolId: string,
  input: Record<string, unknown>,
  agentId = DEFAULT_AGENT
): Promise<AgentResponse> {
  const response = await fetch(`${DEFAULT_BASE_URL}/api/agents/${agentId}/tools/${toolId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: input }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Agent tool request failed with ${response.status}`);
  }

  const payload = await response.json().catch(() => ({}));
  if (typeof payload === 'string') return { text: sanitizeAgentText(payload) };
  if (payload?.text && typeof payload.text === 'string') {
    return { ...payload, text: sanitizeAgentText(payload.text) };
  }
  return payload;
}
