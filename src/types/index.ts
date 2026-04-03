// 数据模型类型定义

/** 朝代 ID — 仅允许预定义的五个值，TypeScript 编译期检查防止无效字符串 */
export type DynastyId = 'tang' | 'song' | 'yuan' | 'ming' | 'qing' | 'custom';

export interface Project {
  id: string;
  title: string;
  dynasty: DynastyId;
  description: string;
  createdAt: number;
  updatedAt: number;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Dynasty {
  id: DynastyId;
  name: string;
  languageFeatures: string;
  clothingFeatures: string;
  architectureFeatures: string;
  etiquetteFeatures: string;
}

export interface AIRequest {
  type: 'polish' | 'historical' | 'poetry' | 'buddhist' | 'taoist' | 'inspiration';
  text?: string;
  dynasty?: string;
  scene?: string;
}

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
}

export type AIAssistantType = 'polish' | 'historical' | 'poetry' | 'buddhist' | 'taoist';

export type RootStackParamList = {
  Home: undefined;
  Project: { projectId: string };
  Editor: { chapterId: string };
  Settings: undefined;
  Inspiration: undefined;
};
