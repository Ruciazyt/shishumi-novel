import axios from 'axios';
import { PROMPTS } from '../constants/prompts';
import { AIRequest, AIResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DYNASTIES } from '../data/dynasties';

const API_KEY_STORAGE_KEY = 'shishumi_api_key';
const API_BASE_URL_KEY = 'shishumi_api_base_url';
const MODEL_STORAGE_KEY = 'shishumi_model';
const MAX_RETRIES = 3;

/** 系统提示词：始终作为第一条消息注入，确保 AI 输出符合历史小说风格 */
const SYSTEM_PROMPT = '你是一位专业的中国古代历史小说作家。请始终使用典雅、简洁的书面中文进行回复。回复内容应契合历史小说的叙事风格——语言含蓄内敛，描写简洁有力，避免现代口语、网络用语和过于直白的表达。对话应符合古代说话习惯，适当使用文言词汇和古典意象。';

/**
 * Fetch available models from an OpenAI-compatible /v1/models endpoint.
 * Returns a list of { id, name } objects.
 * Returns empty array on any error.
 */
export const fetchAvailableModels = async (
  apiKey: string,
  baseUrl: string
): Promise<{ id: string; name: string }[]> => {
  try {
    // Build models URL: strip trailing slash and /chat/completions suffix
    const cleanUrl = baseUrl.replace(/\/+$/, '').replace(/\/chat\/completions\/?$/, '');
    const modelsUrl = cleanUrl + '/models';
    const response = await axios.get(modelsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
    const data = response.data;
    if (Array.isArray(data?.data)) {
      return data.data.map((m: { id: string }) => ({ id: m.id, name: m.id }));
    }
    return [];
  } catch {
    return [];
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getApiKey = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setApiKey = async (apiKey: string): Promise<void> => {
  await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
};

export const getApiBaseUrl = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(API_BASE_URL_KEY);
    return stored || '';
  } catch {
    return '';
  }
};

export const setApiBaseUrl = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(API_BASE_URL_KEY, url);
};

export const getModel = async (): Promise<string> => {
  try {
    return await AsyncStorage.getItem(MODEL_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const setModel = async (model: string): Promise<void> => {
  await AsyncStorage.setItem(MODEL_STORAGE_KEY, model);
};

/** 将朝代 ID 解析为显示名称 */
const resolveDynastyName = (dynastyId?: string): string => {
  if (!dynastyId) return '唐朝';
  const found = DYNASTIES.find(d => d.id === dynastyId || d.name === dynastyId);
  return found ? found.name : dynastyId;
};

const buildPrompt = (request: AIRequest): string => {
  switch (request.type) {
    case 'polish':
      return PROMPTS.polish(request.text || '');
    case 'historical': {
      const dynastyName = resolveDynastyName(request.dynasty);
      return PROMPTS.historical(request.text || '', dynastyName);
    }
    case 'poetry':
      return PROMPTS.poetry(request.scene || '');
    case 'buddhist':
      return PROMPTS.buddhist(request.scene || '');
    case 'taoist':
      return PROMPTS.taoist(request.scene || '');
    case 'inspiration':
      return PROMPTS.inspiration(request.text || '');
    default:
      return request.text || '';
  }
};

/** 从 axios error 对象中安全提取错误消息 */
const extractErrorMessage = (error: unknown, attempt = 1): string => {
  if (!error || typeof error !== 'object') {
    return '调用失败';
  }

  const err = error as Record<string, unknown>;

  const errResponse = err.response;
  if (errResponse && typeof errResponse === 'object') {
    const resp = errResponse as Record<string, unknown>;
    const data = resp.data;

    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      const errorObj = d['error'];
      const msg = (errorObj && typeof errorObj === 'object')
        ? (errorObj as Record<string, unknown>)['message']
        : d['message'];
      if (typeof msg === 'string') return msg;
    }

    if (typeof data === 'string' && data.length > 0) return data;

    if (typeof resp.status === 'number') {
      if (resp.status === 400) return '请求格式错误，请检查输入内容';
      if (resp.status === 401) return 'API密钥无效，请检查设置';
      if (resp.status === 403) return 'API密钥权限不足';
      if (resp.status === 422) return '请求内容不符合AI服务政策，请修改后重试';
      if (resp.status === 429) return '请求过于频繁，请稍后再试';
      if (resp.status >= 500) return 'AI服务暂不可用，请稍后再试';
      return `请求失败（HTTP ${resp.status}）`;
    }
  }

  const code = err.code as string | undefined;
  if (code === 'ECONNABORTED') return '请求超时，请重试';
  if (code === 'ERR_NETWORK' || code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
    return '网络连接失败，请检查网络';
  }
  if (code === 'ERR_CANCELED') return '请求已取消';

  return (err.message as string | undefined) || '调用失败';
};

/**
 * Call AI with optional abort signal support.
 * Returns early with an error if the signal is already aborted.
 * On abort during retry loop, throws an error that propagates to caller.
 */
export const callAI = async (
  request: AIRequest,
  attempt = 1,
  signal?: AbortSignal
): Promise<AIResponse> => {
  // Respect abort signal even before the first request
  if (signal?.aborted) {
    return { success: false, error: '请求已取消' };
  }

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return { success: false, error: '请先在设置中配置API密钥' };
    }

    const [baseUrl, model] = await Promise.all([
      getApiBaseUrl(),
      getModel(),
    ]);

    if (!baseUrl) {
      return { success: false, error: '请先在设置中配置API接口地址' };
    }
    if (!model) {
      return { success: false, error: '请先在设置中获取并选择模型' };
    }

    const prompt = buildPrompt(request);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: request.type === 'poetry' || request.type === 'buddhist' || request.type === 'taoist' ? 2000 : 1500,
    };

    const response = await axios.post(baseUrl, body, {
      headers,
      timeout: 60000,
      // AbortController signal — axios will throw ERR_CANCELED on abort
      signal,
    });

    const content = response.data.choices?.[0]?.message?.content;
    if (content) {
      return { success: true, data: content };
    }
    return { success: false, error: 'AI返回内容为空' };
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    const code = err.code as string | undefined;

    // If the request was aborted, propagate abort immediately without retry
    if (code === 'ERR_CANCELED' || signal?.aborted) {
      return { success: false, error: '请求已取消' };
    }

    const httpStatus = (err.response as Record<string, unknown> | undefined)?.status as number | undefined;

    const isRetryable =
      code === 'ECONNABORTED' ||
      code === 'ERR_NETWORK' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      httpStatus === 429 ||
      (httpStatus !== undefined && httpStatus >= 500);

    if (isRetryable && attempt < MAX_RETRIES) {
      // Check signal before sleeping to avoid sleeping on aborted request
      if (signal?.aborted) {
        return { success: false, error: '请求已取消' };
      }
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
      return callAI(request, attempt + 1, signal);
    }

    const baseError = extractErrorMessage(error, attempt);
    if (attempt > 1) {
      return { success: false, error: `${baseError}（已重试${attempt - 1}次）` };
    }
    return { success: false, error: baseError };
  }
};
