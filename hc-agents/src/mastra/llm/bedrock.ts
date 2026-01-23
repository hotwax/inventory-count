import { bedrock, createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import type { AmazonBedrockProviderSettings } from '@ai-sdk/amazon-bedrock';

const settings: AmazonBedrockProviderSettings = {};

if (process.env.AWS_BEARER_TOKEN_BEDROCK) {
  settings.apiKey = process.env.AWS_BEARER_TOKEN_BEDROCK;
}

if (process.env.AWS_REGION) {
  settings.region = process.env.AWS_REGION;
}

if (process.env.AWS_ACCESS_KEY_ID) {
  settings.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
}

if (process.env.AWS_SECRET_ACCESS_KEY) {
  settings.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

if (process.env.AWS_SESSION_TOKEN) {
  settings.sessionToken = process.env.AWS_SESSION_TOKEN;
}

const bedrockClient = Object.keys(settings).length ? createAmazonBedrock(settings) : bedrock;

export const bedrockModelId = process.env.MASTRA_MODEL || 'us.amazon.nova-pro-v1:0';

export const bedrockModel = bedrockClient(bedrockModelId);
