// 应用常量配置

export const APP_NAME = '史书墨';
export const APP_VERSION = '0.1.0';

export const QWEN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
export const QWEN_MODEL = 'qwen-turbo';

export const ERAS = [
  '先秦',
  '秦汉',
  '魏晋南北朝',
  '隋唐',
  '宋辽金元',
  '明清',
  '民国',
  '其他',
];

export const AI_OPERATION_TYPES = {
  POLISH: 'polish',
  HISTORY_DETAIL: 'history_detail',
  ERA_QUERY: 'era_query',
  POETRY: 'poetry',
  QUOTE: 'quote',
} as const;

export const STORAGE_KEYS = {
  PROJECTS: '@shishumi_projects',
  SETTINGS: '@shishumi_settings',
} as const;
