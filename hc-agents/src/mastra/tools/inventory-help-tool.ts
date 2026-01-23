import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { inventoryHelpEntries, inventoryHelpMap } from '../knowledge/inventory-help';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const scoreEntry = (query: string, entryId: string, title: string, keywords: string[]) => {
  const normalized = normalize(query);
  if (!normalized) return 0;

  let score = 0;
  if (normalized.includes(normalize(entryId))) score += 6;
  if (normalized.includes(normalize(title))) score += 8;
  for (const keyword of keywords) {
    if (normalized.includes(normalize(keyword))) {
      score += Math.min(keyword.length, 12);
    }
  }
  return score;
};

const formatEntry = (entryId: string) => {
  const entry = inventoryHelpMap[entryId];
  if (!entry) return null;
  const content = entry.body.map((line) => `- ${line}`).join('\n');
  return {
    topic: entry.id,
    title: entry.title,
    content,
    relatedTopics: entry.related || [],
  };
};

export const inventoryHelpTool = createTool({
  id: 'inventory-help',
  description: 'Provide help topics for inventory-count usage and import errors.',
  inputSchema: z.object({
    topic: z.string().optional(),
    query: z.string().optional(),
  }),
  outputSchema: z.object({
    match: z.boolean(),
    topic: z.string().nullable(),
    title: z.string().nullable(),
    content: z.string().nullable(),
    relatedTopics: z.array(z.string()),
    availableTopics: z.array(z.string()),
  }),
  execute: async ({ topic, query }) => {
    const availableTopics = inventoryHelpEntries.map((entry) => entry.id);

    if (!topic && !query) {
      return {
        match: false,
        topic: null,
        title: null,
        content: null,
        relatedTopics: [],
        availableTopics,
      };
    }

    const directId = topic ? inventoryHelpMap[topic] : undefined;
    if (directId) {
      const formatted = formatEntry(directId.id);
      return {
        match: true,
        ...formatted,
        availableTopics,
      };
    }

    const search = query || topic || '';
    let bestScore = 0;
    let bestId: string | null = null;

    for (const entry of inventoryHelpEntries) {
      const score = scoreEntry(search, entry.id, entry.title, entry.keywords);
      if (score > bestScore) {
        bestScore = score;
        bestId = entry.id;
      }
    }

    if (!bestId) {
      return {
        match: false,
        topic: null,
        title: null,
        content: null,
        relatedTopics: [],
        availableTopics,
      };
    }

    const formatted = formatEntry(bestId);
    return {
      match: true,
      ...formatted,
      availableTopics,
    };
  },
});
