// 数据模型类型定义

export interface Project {
  id: string;
  title: string;
  dynasty: string;
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
  id: string;
  name: string;
  languageFeatures: string;
  clothingFeatures: string;
  architectureFeatures: string;
  etiquetteFeatures: string;
}

export interface AIRequest {
  type: 'polish' | 'historical' | 'poetry' | 'buddhist' | 'taoist';
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
};
