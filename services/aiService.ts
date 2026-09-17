/**
 * OmniLife OS - AI Vision Service
 * Supports: OpenAI (GPT-5.6 Sol/Terra/Luna, GPT-6 Astra), Google Gemini (3.7 Flash, 3.6 Flash)
 * Version 1.3.0 — Updated September 2026
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type AIProvider = 'openai' | 'gemini';

export type ModelOption = {
  id: string;
  label: string;
  description: string;
  badge?: string; // e.g. "Fastest", "Best", "Recommended"
};

export const OPENAI_MODELS: ModelOption[] = [
  {
    id: 'gpt-5.6-sol',
    label: 'GPT-5.6 Sol',
    description: 'Flagship — best accuracy & reasoning',
    badge: 'Best',
  },
  {
    id: 'gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    description: 'Balanced — great accuracy, lower cost',
    badge: 'Recommended',
  },
  {
    id: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    description: 'Cost-efficient — fast & affordable',
    badge: 'Cheapest',
  },
  {
    id: 'gpt-6-astra',
    label: 'GPT-6 Astra',
    description: 'Cutting-edge — complex reasoning & tasks',
    badge: 'Newest',
  },
];

export const GEMINI_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    description: 'Best for agentic tasks, coding & vision',
    badge: 'Recommended',
  },
  {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    description: 'Token-efficient & cost-effective',
    badge: 'Cheapest',
  },
];

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-5.6-terra',
  gemini: 'gemini-3.7-flash',
};

export type FoodAnalysisResult = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type InventoryItem = {
  name: string;
  category: string;
  estimated_value: number;
};

// ─────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────

export async function getActiveProvider(): Promise<AIProvider> {
  const p = await AsyncStorage.getItem('ai_provider');
  return (p as AIProvider) || 'openai';
}

export async function getApiKey(provider: AIProvider): Promise<string | null> {
  return AsyncStorage.getItem(`api_key_${provider}`);
}

export async function saveApiKey(provider: AIProvider, key: string): Promise<void> {
  await AsyncStorage.setItem(`api_key_${provider}`, key.trim());
}

export async function saveProvider(provider: AIProvider): Promise<void> {
  await AsyncStorage.setItem('ai_provider', provider);
}

export async function getActiveModel(provider: AIProvider): Promise<string> {
  const m = await AsyncStorage.getItem(`ai_model_${provider}`);
  return m || DEFAULT_MODELS[provider];
}

export async function saveModel(provider: AIProvider, modelId: string): Promise<void> {
  await AsyncStorage.setItem(`ai_model_${provider}`, modelId);
}

// ─────────────────────────────────────────────────────────────
// FOOD ANALYSIS
// ─────────────────────────────────────────────────────────────

export async function analyzeFoodImage(base64Image: string): Promise<FoodAnalysisResult> {
  const provider = await getActiveProvider();
  const apiKey = await getApiKey(provider);
  const model = await getActiveModel(provider);

  if (!apiKey || apiKey.trim().length < 8) {
    throw new Error(`No API key set for ${getProviderLabel(provider)}. Go to Settings → AI Provider.`);
  }

  if (provider === 'openai') return analyzeFoodOpenAI(base64Image, apiKey, model);
  if (provider === 'gemini') return analyzeFoodGemini(base64Image, apiKey, model);
  throw new Error('Unknown AI provider');
}

async function analyzeFoodOpenAI(base64: string, apiKey: string, model: string): Promise<FoodAnalysisResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this food image. Identify the dish name and estimate calories, protein (g), carbs (g), fat (g). Return ONLY valid JSON: {"name":"dish name","calories":0,"protein":0,"carbs":0,"fat":0}. No markdown.',
            },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 200,
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`OpenAI (${model}): ${json.error.message}`);
  return JSON.parse(json.choices[0].message.content.trim());
}

async function analyzeFoodGemini(base64: string, apiKey: string, model: string): Promise<FoodAnalysisResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: 'Analyze this food image. Identify the dish name and estimate calories, protein (g), carbs (g), fat (g). Return ONLY valid JSON (no markdown, no backticks): {"name":"dish name","calories":0,"protein":0,"carbs":0,"fat":0}',
            },
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 200 },
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`Gemini (${model}): ${json.error.message}`);
  return JSON.parse(json.candidates[0].content.parts[0].text.trim());
}

// ─────────────────────────────────────────────────────────────
// INVENTORY ANALYSIS
// ─────────────────────────────────────────────────────────────

export async function analyzeInventoryImage(base64Image: string): Promise<InventoryItem[]> {
  const provider = await getActiveProvider();
  const apiKey = await getApiKey(provider);
  const model = await getActiveModel(provider);

  if (!apiKey || apiKey.trim().length < 8) {
    throw new Error(`No API key set for ${getProviderLabel(provider)}. Go to Settings → AI Provider.`);
  }

  if (provider === 'openai') return analyzeInventoryOpenAI(base64Image, apiKey, model);
  if (provider === 'gemini') return analyzeInventoryGemini(base64Image, apiKey, model);
  throw new Error('Unknown AI provider');
}

async function analyzeInventoryOpenAI(base64: string, apiKey: string, model: string): Promise<InventoryItem[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Identify all valuable objects in this image (electronics, appliances, furniture, etc). Return ONLY valid JSON array (no markdown): [{"name":"item","category":"category","estimated_value":0}]',
            },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 500,
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`OpenAI (${model}): ${json.error.message}`);
  return JSON.parse(json.choices[0].message.content.trim());
}

async function analyzeInventoryGemini(base64: string, apiKey: string, model: string): Promise<InventoryItem[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: 'Identify all valuable objects in this image (electronics, appliances, furniture, etc). Return ONLY valid JSON array (no markdown, no backticks): [{"name":"item","category":"category","estimated_value":0}]',
            },
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 500 },
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`Gemini (${model}): ${json.error.message}`);
  return JSON.parse(json.candidates[0].content.parts[0].text.trim());
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

export function getProviderLabel(provider: AIProvider): string {
  return { openai: 'OpenAI', gemini: 'Google Gemini' }[provider] || provider;
}

export function getProviderKeyHint(provider: AIProvider): string {
  return { openai: 'sk-...', gemini: 'AIza...' }[provider] || 'Enter API key...';
}

export function getProviderDocsUrl(provider: AIProvider): string {
  return {
    openai: 'platform.openai.com/api-keys',
    gemini: 'aistudio.google.com/app/apikey',
  }[provider] || '';
}

export function getModelsForProvider(provider: AIProvider): ModelOption[] {
  return { openai: OPENAI_MODELS, gemini: GEMINI_MODELS }[provider] || [];
}
