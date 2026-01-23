export type AgentIntent =
  | 'product_lookup'
  | 'missing_sku'
  | 'missing_facility'
  | 'upload_help'
  | 'count_summary'
  | 'general';

export type AgentIntentResult = {
  primary: AgentIntent;
  tags: AgentIntent[];
  identifier?: string;
};

const extractIdentifier = (input: string) => {
  const quoted = input.match(/['"`]{1}([^'"`]{2,})['"`]{1}/);
  if (quoted?.[1]) return quoted[1].trim();

  const identifierMatch = input.match(/identifier\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
  if (identifierMatch?.[1]) return identifierMatch[1].trim();

  const goodIdentMatch = input.match(/good\s*identifications?\s*(?:for|:)?\s*([A-Za-z0-9._-]+)/i);
  if (goodIdentMatch?.[1]) return goodIdentMatch[1].trim();

  const skuMatch = input.match(/sku\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
  if (skuMatch?.[1]) return skuMatch[1].trim();

  const productMatch = input.match(/product(?:\s+id)?\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
  if (productMatch?.[1]) return productMatch[1].trim();

  return undefined;
};

export const detectAgentIntent = (input?: string): AgentIntentResult => {
  if (!input?.trim()) return { primary: 'general', tags: [] };

  const normalized = input.toLowerCase();
  const tags: AgentIntent[] = [];

  if (/(upload|bulk|csv|template|file|import)/.test(normalized)) {
    tags.push('upload_help');
  }

  if (/(missing sku|sku not found|unknown sku|product not found|missing product)/.test(normalized)) {
    tags.push('missing_sku');
  }

  if (/(missing facility|facility id|facility not found)/.test(normalized)) {
    tags.push('missing_facility');
  }

  if (
    /(lookup|find|search).*(product|sku|identifier)/.test(normalized) ||
    /product lookup|identifier lookup|good identification|goodidentification/.test(normalized)
  ) {
    tags.push('product_lookup');
  }

  if (/(counted|uncounted|undirected|unmatched)/.test(normalized)) {
    tags.push('count_summary');
  }

  const identifier = tags.includes('product_lookup') ? extractIdentifier(input) : undefined;

  return {
    primary: tags[0] || 'general',
    tags,
    identifier,
  };
};
