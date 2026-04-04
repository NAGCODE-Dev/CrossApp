import {
  CROSSAI_PROVIDER,
  CROSSAI_MODEL,
  CROSSAI_REASONING_EFFORT,
  CROSSAI_LOCAL_RESEARCH_ENABLED,
  OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL,
  OPENROUTER_SITE_URL,
  OPENROUTER_APP_NAME,
  GROQ_API_KEY,
  GROQ_BASE_URL,
} from '../config.js';
import { composePromptLayers } from './promptCatalog.js';
import { buildCrossAiContext } from './contextStore.js';
import { searchLocalResearchChunks } from './researchStore.js';

const CHAT_PRESET_KEYS = new Set([
  'explain_workout',
  'strategy_wod',
  'adapt_workout',
  'analyze_result',
  'chat_coach',
]);

function buildSystemInstructions(preset) {
  return composePromptLayers(preset.layers);
}

function buildUserPayload({ preset, body, user, context }) {
  const extraInstructions = [];

  if (preset.key === 'chat_coach') {
    extraInstructions.push(
      'Esta é uma conversa guiada com atleta em formato de coach técnico.',
      'Use o histórico curto da conversa quando ele existir, mas não invente memória além do payload.',
      'A resposta principal deve estar em data.reply e precisa ser curta, prática e conversacional.',
      'Sugira quickActions que façam sentido como próximos toques no app.',
    );
  }

  if (preset.key === 'research_answer' || preset.key === 'verify_study') {
    extraInstructions.push(
      'Use apenas as evidências locais fornecidas no payload.',
      'Não invente citações nem trate evidência ausente como se existisse.',
      'Separe claramente o que está apoiado nas fontes do que é inferência.',
    );
  }

  return [
    `Intento principal: ${preset.intent}.`,
    `Público-alvo: ${preset.audience}.`,
    'Responda apenas com JSON válido seguindo o schema exigido.',
    `O campo mode deve ser exatamente "${preset.contract.mode}" e version deve ser "v1".`,
    'O campo meta.generatedAt deve ser um timestamp ISO 8601.',
    `O conteúdo principal deve ficar dentro de data seguindo o contract de "${preset.contract.mode}".`,
    'Se faltarem dados, mantenha arrays vazios quando necessário e explique a incerteza em observações ou followUp.',
    ...extraInstructions,
    '',
    'Contexto da requisição:',
    JSON.stringify({
      user: {
        id: user?.userId || null,
        email: user?.email || null,
        name: user?.name || null,
      },
      context: context || null,
      payload: body || {},
    }, null, 2),
  ].join('\n');
}

function extractChatCompletionText(responseJson) {
  const choice = Array.isArray(responseJson?.choices) ? responseJson.choices[0] : null;
  const content = choice?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part?.text === 'string') return part.text;
        if (typeof part === 'string') return part;
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

function parseStructuredOutput(rawText) {
  if (!rawText) {
    throw new Error('A resposta do provider veio vazia');
  }

  try {
    return JSON.parse(rawText);
  } catch {
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(rawText.slice(start, end + 1));
    }
    throw new Error('Nao foi possivel converter a resposta do provider em JSON');
  }
}

function hasProviderCredentials(provider) {
  if (provider === 'groq') return Boolean(GROQ_API_KEY);
  if (provider === 'openrouter') return Boolean(OPENROUTER_API_KEY);
  return false;
}

export function isCrossAiConfigured() {
  return hasProviderCredentials('openrouter') || hasProviderCredentials('groq');
}

export function resolveCrossAiProvider(preset) {
  if (preset.key === 'verify_study') {
    return 'local-rag-pending';
  }

  if (preset.key === 'research_answer' && !CROSSAI_LOCAL_RESEARCH_ENABLED) {
    return 'local-rag-pending';
  }

  if (CROSSAI_PROVIDER === 'groq') {
    return 'groq';
  }

  return 'openrouter';
}

export function isCrossAiPresetAvailable(preset) {
  const provider = resolveCrossAiProvider(preset);
  if (provider === 'local-rag-pending') {
    return false;
  }
  if (!CHAT_PRESET_KEYS.has(preset.key)) {
    return false;
  }
  return hasProviderCredentials(provider) || hasProviderCredentials(getFallbackProvider(provider));
}

function getFallbackProvider(provider) {
  if (provider === 'groq') return 'openrouter';
  if (provider === 'openrouter') return 'groq';
  return null;
}

function assertPresetAvailability(provider, preset) {
  if (preset.key === 'verify_study') {
    const error = new Error('Base científica indisponível nesta configuração atual');
    error.statusCode = 503;
    throw error;
  }

  if (preset.key === 'research_answer' && !CROSSAI_LOCAL_RESEARCH_ENABLED) {
    const error = new Error('Base científica indisponível nesta configuração atual');
    error.statusCode = 503;
    throw error;
  }

  if (preset.key !== 'research_answer' && !CHAT_PRESET_KEYS.has(preset.key)) {
    const error = new Error('Modo indisponível nesta configuração atual');
    error.statusCode = 503;
    throw error;
  }

  if (!hasProviderCredentials(provider) && !hasProviderCredentials(getFallbackProvider(provider))) {
    const error = new Error(`Nenhum provider configurado para ${provider}`);
    error.statusCode = 503;
    throw error;
  }
}

function buildMessageContent(input) {
  return typeof input === 'string' ? input : JSON.stringify(input, null, 2);
}

async function requestChatCompletion({
  providerLabel,
  endpoint,
  apiKey,
  headers = {},
  preset,
  instructions,
  requestInput,
}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...headers,
    },
    body: JSON.stringify({
      model: CROSSAI_MODEL,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: buildMessageContent(requestInput) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: preset.contract.mode.replace(/[^a-zA-Z0-9_-]/g, '_'),
          strict: false,
          schema: preset.contract.schema,
        },
      },
    }),
  });

  const responseJson = await response.json();

  if (!response.ok) {
    const error = new Error(responseJson?.error?.message || `Falha ao consultar ${providerLabel}`);
    error.statusCode = response.status;
    error.details = responseJson;
    throw error;
  }

  const rawText = extractChatCompletionText(responseJson);
  const parsed = parseStructuredOutput(rawText);

  return {
    id: responseJson.id || null,
    model: responseJson.model || CROSSAI_MODEL,
    usage: responseJson.usage || null,
    provider: providerLabel,
    output: parsed,
  };
}

async function requestOpenRouterResponse({ preset, instructions, requestInput }) {
  return requestChatCompletion({
    providerLabel: 'openrouter',
    endpoint: `${OPENROUTER_BASE_URL}/chat/completions`,
    apiKey: OPENROUTER_API_KEY,
    headers: {
      ...(OPENROUTER_SITE_URL ? { 'HTTP-Referer': OPENROUTER_SITE_URL } : {}),
      ...(OPENROUTER_APP_NAME ? { 'X-OpenRouter-Title': OPENROUTER_APP_NAME } : {}),
    },
    preset,
    instructions,
    requestInput,
  });
}

async function requestGroqResponse({ preset, instructions, requestInput }) {
  return requestChatCompletion({
    providerLabel: 'groq',
    endpoint: `${GROQ_BASE_URL}/chat/completions`,
    apiKey: GROQ_API_KEY,
    preset,
    instructions,
    requestInput,
  });
}

async function requestWithProvider(provider, args) {
  if (provider === 'groq') {
    return requestGroqResponse(args);
  }
  return requestOpenRouterResponse(args);
}

export async function generateCrossAiResponse({ preset, body, user }) {
  const provider = resolveCrossAiProvider(preset);
  assertPresetAvailability(provider, preset);

  const instructions = await buildSystemInstructions(preset);
  const context = await buildCrossAiContext({ preset, body, user });
  let mergedContext = context;

  if (preset.key === 'research_answer') {
    const researchEvidence = await searchLocalResearchChunks({
      question: body?.question || body?.message || '',
      limit: 6,
    });
    if (!researchEvidence.length) {
      const error = new Error('Base científica sem estudos indexados para esta pergunta');
      error.statusCode = 503;
      throw error;
    }
    mergedContext = {
      ...(context || {}),
      researchEvidence,
    };
  }

  const requestInput = buildUserPayload({ preset, body, user, context: mergedContext });

  if (hasProviderCredentials(provider)) {
    try {
      return await requestWithProvider(provider, { preset, instructions, requestInput });
    } catch (error) {
      const fallbackProvider = getFallbackProvider(provider);
      if (fallbackProvider && hasProviderCredentials(fallbackProvider)) {
        return requestWithProvider(fallbackProvider, { preset, instructions, requestInput });
      }
      throw error;
    }
  }

  const fallbackProvider = getFallbackProvider(provider);
  return requestWithProvider(fallbackProvider, { preset, instructions, requestInput });
}
