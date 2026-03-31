import axios from 'axios';
import { PROMPTS, API_CONFIG } from '../constants/prompts';
import { AIRequest, AIResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DYNASTIES } from '../data/dynasties';

const API_KEY_STORAGE_KEY = 'shishumi_api_key';
const MODEL_STORAGE_KEY = 'shishumi_model';
const MAX_RETRIES = 3;

export const AVAILABLE_MODELS = [
  { id: 'qwen-turbo', name: 'qwen-turbo（快速·经济）' },
  { id: 'qwen-plus', name: 'qwen-plus（增强·平衡）' },
  { id: 'qwen-max', name: 'qwen-max（最强·高精度）' },
  { id: 'qwen-long', name: 'qwen-long（长文本·200万上下文）' },
];

export const DEFAULT_MODEL = 'qwen-turbo';

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

export const getModel = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(MODEL_STORAGE_KEY);
    return stored || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
};

export const setModel = async (model: string): Promise<void> => {
  await AsyncStorage.setItem(MODEL_STORAGE_KEY, model);
};

/** 将朝代 ID 解析为显示名称 */
const resolveDynastyName = (dynastyId?: string): string => {
  if (!dynastyId) return '唐朝'; // 默认为唐朝
  const found = DYNASTIES.find(d => d.id === dynastyId || d.name === dynastyId);
  return found ? found.name : dynastyId;
};

const buildPrompt = (request: AIRequest): string => {
  switch (request.type) {
    case 'polish':
      return PROMPTS.polish(request.text || '');
    case 'historical': {
      // 确保传入的是朝代名称而非 ID
      const dynastyName = resolveDynastyName(request.dynasty);
      return PROMPTS.historical(request.text || '', dynastyName);
    }
    case 'poetry':
      return PROMPTS.poetry(request.scene || '');
    case 'buddhist':
      return PROMPTS.buddhist(request.scene || '');
    case 'taoist':
      return PROMPTS.taoist(request.scene || '');
    default:
      return request.text || '';
  }
};

/** 从 axios error 对象中安全提取错误消息 */
const extractErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return '调用失败';

  const err = error as Record<string, unknown>;

  // 优先取 API 结构化错误信息
  if (
    err.response &&
    typeof err.response === 'object'
  ) {
    const resp = err.response as Record<string, unknown>;
    const data = resp.data;
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      // 通义千问标准错误格式: { error: { message: "..." } }
      const errorObj = d['error'];
      if (errorObj && typeof errorObj === 'object') {
        const e = errorObj as Record<string, unknown>;
        if (typeof e['message'] === 'string') return e['message'] as string;
      }
      // OpenAI 兼容格式: { message: "..." }
      if (typeof d['message'] === 'string') return d['message'] as string;
    }
    // data 是纯字符串的情况
    if (typeof data === 'string' && data.length > 0) return data;
    // HTTP 状态码提示
    if (typeof resp.status === 'number') {
      if (resp.status === 401) return 'API密钥无效，请检查设置';
      if (resp.status === 403) return 'API密钥权限不足';
      if (resp.status === 429) return '请求过于频繁，请稍后再试';
      if (resp.status >= 500) return 'AI服务暂不可用，请稍后再试';
    }
  }

  // 网络层错误
  const code = err.code as string | undefined;
  if (code === 'ECONNABORTED') return '请求超时，请重试';
  if (code === 'ERR_NETWORK' || code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
    return '网络连接失败，请检查网络';
  }

  // 兜底
  return (err.message as string | undefined) || '调用失败';
};

export const callAI = async (request: AIRequest, attempt = 1): Promise<AIResponse> => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return { success: false, error: '请先在设置中配置API密钥' };
    }

    const model = await getModel();
    const prompt = buildPrompt(request);

    const response = await axios.post(
      API_CONFIG.baseURL,
      {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: request.type === 'poetry' || request.type === 'buddhist' || request.type === 'taoist' ? 1500 : 800,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (content) {
      return { success: true, data: content };
    }
    return { success: false, error: 'AI返回内容为空' };
  } catch (error: unknown) {
    // 网络错误、超时、限流、服务器错误时自动重试，最多3次
    const err = error as Record<string, unknown>;
    const code = err.code as string | undefined;
    // 提取 HTTP 状态码（axios 错误响应结构）
    const httpStatus = (err.response as Record<string, unknown> | undefined)?.status as number | undefined;
    const isRetryable =
      code === 'ECONNABORTED' ||
      code === 'ERR_NETWORK' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      !err.response ||
      // 429 限流和 5xx 服务器错误也应重试（带退避）
      httpStatus === 429 ||
      (httpStatus !== undefined && httpStatus >= 500);

    if (isRetryable && attempt < MAX_RETRIES) {
      const delay = attempt * 2000; // 2s, 4s 递增退避
      await sleep(delay);
      return callAI(request, attempt + 1);
    }

    return { success: false, error: extractErrorMessage(error) };
  }
};
