/**
 * OmniLife OS - AI Vision Service
 * Supports: OpenAI (GPT-4o), Google Gemini (gemini-2.0-flash, gemini-1.5-pro)
 * Version 1.2.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type AIProvider = 'openai' | 'gemini';

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

/** Load active provider from storage */
export async function getActiveProvider(): Promise<AIProvider> {
  const p = await AsyncStorage.getItem('ai_provider');
  return (p as AIProvider) || 'openai';
}

/** Load API key for a specific provider */
export async function getApiKey(provider: AIProvider): Promise<string | null> {
  return AsyncStorage.getItem(`api_key_${provider}`);
}

/** Save API key for a specific provider */
export async function saveApiKey(provider: AIProvider, key: string): Promise<void> {
  await AsyncStorage.setItem(`api_key_${provider}`, key.trim());
}

/** Save active provider choice */
export async function saveProvider(provider: AIProvider): Promise<void> {
  await AsyncStorage.setItem('ai_provider', provider);
}

// ─────────────────────────────────────────────────────────────
// FOOD ANALYSIS
// ─────────────────────────────────────────────────────────────

export async function analyzeFoodImage(base64Image: string): Promise<FoodAnalysisResult> {
  const provider = await getActiveProvider();
  const apiKey = await getApiKey(provider);

  if (!apiKey || apiKey.trim().length < 8) {
    throw new Error(`No API key set for ${getProviderLabel(provider)}. Go to Settings → AI Provider.`);
  }

  if (provider === 'openai') return analyzeFoodOpenAI(base64Image, apiKey);
  if (provider === 'gemini') return analyzeFoodGemini(base64Image, apiKey);

  throw new Error('Unknown AI provider');
}

async function analyzeFoodOpenAI(base64: string, apiKey: string): Promise<FoodAnalysisResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
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
  if (json.error) throw new Error(`OpenAI: ${json.error.message}`);
  return JSON.parse(json.choices[0].message.content.trim());
}

async function analyzeFoodGemini(base64: string, apiKey: string): Promise<FoodAnalysisResult> {
  const model = 'gemini-2.0-flash';
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
  if (json.error) throw new Error(`Gemini: ${json.error.message}`);
  const text = json.candidates[0].content.parts[0].text.trim();
  return JSON.parse(text);
}

// ─────────────────────────────────────────────────────────────
// INVENTORY ANALYSIS
// ─────────────────────────────────────────────────────────────

export async function analyzeInventoryImage(base64Image: string): Promise<InventoryItem[]> {
  const provider = await getActiveProvider();
  const apiKey = await getApiKey(provider);

  if (!apiKey || apiKey.trim().length < 8) {
    throw new Error(`No API key set for ${getProviderLabel(provider)}. Go to Settings → AI Provider.`);
  }

  if (provider === 'openai') return analyzeInventoryOpenAI(base64Image, apiKey);
  if (provider === 'gemini') return analyzeInventoryGemini(base64Image, apiKey);

  throw new Error('Unknown AI provider');
}

async function analyzeInventoryOpenAI(base64: string, apiKey: string): Promise<InventoryItem[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
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
  if (json.error) throw new Error(`OpenAI: ${json.error.message}`);
  return JSON.parse(json.choices[0].message.content.trim());
}

async function analyzeInventoryGemini(base64: string, apiKey: string): Promise<InventoryItem[]> {
  const model = 'gemini-2.0-flash';
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
  if (json.error) throw new Error(`Gemini: ${json.error.message}`);
  const text = json.candidates[0].content.parts[0].text.trim();
  return JSON.parse(text);
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

export function getProviderLabel(provider: AIProvider): string {
  const labels: Record<AIProvider, string> = {
    openai: 'OpenAI (GPT-4o)',
    gemini: 'Google Gemini',
  };
  return labels[provider] || provider;
}

export function getProviderKeyHint(provider: AIProvider): string {
  const hints: Record<AIProvider, string> = {
    openai: 'sk-...',
    gemini: 'AIza...',
  };
  return hints[provider] || 'Enter API key...';
}

export function getProviderDocsUrl(provider: AIProvider): string {
  const urls: Record<AIProvider, string> = {
    openai: 'platform.openai.com/api-keys',
    gemini: 'aistudio.google.com/app/apikey',
  };
  return urls[provider] || '';
}
