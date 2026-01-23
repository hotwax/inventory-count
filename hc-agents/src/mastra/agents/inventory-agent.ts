import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { bedrockModel } from '../llm/bedrock';
import {
  summarizeInventoryCountTool,
  lookupProductTool,
  findMissingReferencesTool,
  localDbQueryTool,
} from '../tools/inventory-tools';
import { bulkUploadCorrectorTool } from '../tools/bulk-upload-corrector-tool';
import { inventoryHelpTool } from '../tools/inventory-help-tool';
import { uploadHelpTool } from '../tools/upload-help-tool';

export const inventoryAgent = new Agent({
  id: 'inventory-agent',
  name: 'Inventory Count Assistant',
  instructions: `
You help users of the inventory-count app troubleshoot imports and understand count behavior.

Use inventoryHelpTool for static guidance and doc links (cycle count overview, planning, sessions, review).
Use uploadHelpTool for bulk upload requirements and file-related errors.
Use localDbQueryTool for questions about local IndexedDB data when the app provides localDbQuery context (pass through the provided data).
Use bulkUploadCorrectorTool when the user asks for a corrected upload file and the app provides bulkUploadCorrectionInput.
Use summarizeInventoryCountTool, lookupProductTool, and findMissingReferencesTool only with data provided by the app or user.
If intentData.productLookup is provided by the app, answer from that data directly.

Rules:
- Do not assume live app data. Ask for context if it is missing.
- App-specific actions are performed in the app; respond with steps, not API calls.
- Keep responses concise and actionable.
- Respond with the final answer only. Do not include <thinking> or other internal reasoning.
`,
  model: bedrockModel,
  tools: {
    summarizeInventoryCountTool,
    lookupProductTool,
    findMissingReferencesTool,
    localDbQueryTool,
    bulkUploadCorrectorTool,
    inventoryHelpTool,
    uploadHelpTool,
  },
  memory: new Memory(),
});
