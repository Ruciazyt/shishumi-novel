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
  } catch (error: any) {
    // 网络错误或超时时自动重试，最多3次
    const isRetryable =
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      !error.response;

    if (isRetryable && attempt < MAX_RETRIES) {
      const delay = attempt * 2000; // 2s, 4s 递增退避
      await sleep(delay);
      return callAI(request, attempt + 1);
    }

    if (error.response?.status === 401) {
      return { success: false, error: 'API密钥无效，请检查设置' };
    }
    if (error.code === 'ECONNABORTED') {
      return { success: false, error: '请求超时，请重试' };
    }
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message || '调用失败',
    };
  }
};
