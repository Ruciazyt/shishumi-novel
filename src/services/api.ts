import axios from 'axios';
import { PROMPTS } from '../constants/prompts';
import { AIRequest, AIResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DYNASTIES } from '../data/dynasties';

const API_TYPE_KEY = 'shishumi_api_type';
const API_KEY_STORAGE_KEY = 'shishumi_api_key';
const API_BASE_URL_KEY = 'shishumi_api_base_url';
const MODEL_STORAGE_KEY = 'shishumi_model';
const MAX_RETRIES = 3;

export type ApiType = 'qwen' | 'openai';

export const API_PROVIDERS = [
  { id: 'qwen', name: '通义千问 (DashScope)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions' },
  { id: 'openai', name: 'OpenAI 兼容接口', baseUrl: '' }, // 用户自定义
];

export const QWEN_MODELS: { id: string; name: string }[] = [
  { id: 'qwen-turbo', name: 'qwen-turbo（快速·经济）' },
  { id: 'qwen-plus', name: 'qwen-plus（增强·平衡）' },
  { id: 'qwen-max', name: 'qwen-max（最强·高精度）' },
  { id: 'qwen-long', name: 'qwen-long（长文本·200万上下文）' },
];

export const OPENAI_MODELS: { id: string; name: string }[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini（快速·经济）' },
  { id: 'gpt-4o', name: 'GPT-4o（增强·平衡）' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo（最强）' },
  { id: 'custom', name: '自定义模型' },
];

export const getAvailableModels = (apiType: ApiType) => {
  return apiType === 'qwen' ? QWEN_MODELS : OPENAI_MODELS;
};

export const DEFAULT_MODEL = (apiType: ApiType) => {
  return apiType === 'qwen' ? 'qwen-turbo' : 'gpt-4o-mini';
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getApiType = async (): Promise<ApiType> => {
  try {
    const stored = await AsyncStorage.getItem(API_TYPE_KEY);
    return (stored as ApiType) || 'qwen';
  } catch {
    return 'qwen';
  }
};

export const setApiType = async (type: ApiType): Promise<void> => {
  await AsyncStorage.setItem(API_TYPE_KEY, type);
};

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
    if (stored) return stored;
    // 默认返回千问的URL
    return API_PROVIDERS.find(p => p.id === 'qwen')!.baseUrl;
  } catch {
    return API_PROVIDERS.find(p => p.id === 'qwen')!.baseUrl;
  }
};

export const setApiBaseUrl = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(API_BASE_URL_KEY, url);
};

export const getModel = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(MODEL_STORAGE_KEY);
    return stored || DEFAULT_MODEL(await getApiType());
  } catch {
    return DEFAULT_MODEL('qwen');
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
    default:
      return request.text || '';
  }
};

/** 从 axios error 对象中安全提取错误消息 */
const extractErrorMessage = (error: unknown, attempt = 1, maxRetries = MAX_RETRIES): string => {
  if (!error || typeof error !== 'object') {
    return '调用失败';
  }

  const err = error as Record<string, unknown>;

  // axios 错误：err.response 存在
  const errResponse = err.response;
  if (errResponse && typeof errResponse === 'object') {
    const resp = errResponse as Record<string, unknown>;
    const data = resp.data;

    // data 为对象时，尝试提取 error.message 或直接的 message 字段
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      // 通义千问标准错误格式: { error: { message: "..." } }
      // OpenAI 兼容格式: { error: { message: "..." } } 或 { message: "..." }
      const errorObj = d['error'];
      const msg = (errorObj && typeof errorObj === 'object')
        ? (errorObj as Record<string, unknown>)['message']
        : d['message'];
      if (typeof msg === 'string') return msg;
    }

    // data 为字符串时直接返回（如 "Rate limit exceeded"）
    if (typeof data === 'string' && data.length > 0) return data;

    // HTTP 状态码映射
    if (typeof resp.status === 'number') {
      if (resp.status === 401) return 'API密钥无效，请检查设置';
      if (resp.status === 403) return 'API密钥权限不足';
      if (resp.status === 429) return '请求过于频繁，请稍后再试';
      if (resp.status >= 500) return 'AI服务暂不可用，请稍后再试';
      // 其他 HTTP 错误（400/404/422 等）返回状态码描述
      return `请求失败（HTTP ${resp.status}）`;
    }
  }

  // 网络层错误（未收到服务器响应）
  const code = err.code as string | undefined;
  if (code === 'ECONNABORTED') return '请求超时，请重试';
  if (code === 'ERR_NETWORK' || code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
    return '网络连接失败，请检查网络';
  }

  // 兜底：返回 err.message 或默认文本
  return (err.message as string | undefined) || '调用失败';
};

export const callAI = async (request: AIRequest, attempt = 1): Promise<AIResponse> => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return { success: false, error: '请先在设置中配置API密钥' };
    }

    const [baseUrl, model] = await Promise.all([
      getApiBaseUrl(),
      getModel(),
    ]);
    const prompt = buildPrompt(request);

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Authorization header - both qwen and OpenAI-compatible use Bearer
    headers['Authorization'] = `Bearer ${apiKey}`;

    // 构建请求体
    const body: Record<string, unknown> = {
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: request.type === 'poetry' || request.type === 'buddhist' || request.type === 'taoist' ? 2000 : 1500,
    };

    const response = await axios.post(baseUrl, body, {
      headers,
      timeout: 30000,
    });

    // 通用的 OpenAI 兼容格式解析
    const content = response.data.choices?.[0]?.message?.content;
    if (content) {
      return { success: true, data: content };
    }
    return { success: false, error: 'AI返回内容为空' };
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    const code = err.code as string | undefined;
    const httpStatus = (err.response as Record<string, unknown> | undefined)?.status as number | undefined;

    // 判断是否值得重试：网络层错误（无 response）或服务端错误/限流
    const isNetworkError = !httpStatus;
    const isRetryable =
      code === 'ECONNABORTED' ||
      code === 'ERR_NETWORK' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      isNetworkError ||
      httpStatus === 429 ||
      (httpStatus !== undefined && httpStatus >= 500);

    if (isRetryable && attempt < MAX_RETRIES) {
      // 指数退避：2s → 4s → 8s
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
      return callAI(request, attempt + 1);
    }

    // 重试耗尽或不可重试的错误，返回带上下文的错误信息
    const baseError = extractErrorMessage(error, attempt, MAX_RETRIES);
    if (attempt > 1) {
      return { success: false, error: `${baseError}（已重试${attempt - 1}次）` };
    }
    return { success: false, error: baseError };
  }
};
