import axios from 'axios';
import { PROMPTS, API_CONFIG } from '../constants/prompts';
import { AIRequest, AIResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_STORAGE_KEY = 'shishumi_api_key';

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

const buildPrompt = (request: AIRequest): string => {
  switch (request.type) {
    case 'polish':
      return PROMPTS.polish(request.text || '');
    case 'historical':
      return PROMPTS.historical(request.text || '', request.dynasty || '');
    case 'poetry':
      return PROMPTS.poetry(request.scene || '');
    case 'buddhist':
    case 'taoist':
      return PROMPTS.buddhist(request.scene || '');
    default:
      return request.text || '';
  }
};

export const callAI = async (request: AIRequest): Promise<AIResponse> => {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return { success: false, error: '请先在设置中配置API密钥' };
    }

    const prompt = buildPrompt(request);

    const response = await axios.post(
      API_CONFIG.baseURL,
      {
        model: API_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
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
