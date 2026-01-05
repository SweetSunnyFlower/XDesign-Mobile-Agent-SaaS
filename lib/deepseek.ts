import { createDeepSeek } from '@ai-sdk/deepseek';

export const deepseek = createDeepSeek({
  baseURL: process.env.DEEPSEEK_API_URL ?? '',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});