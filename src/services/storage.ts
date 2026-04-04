import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, Chapter } from '../types';

/** 可靠的 ID 生成（兼容 React Native，不依赖 uuid 库） */
let _idCounter = 0;
const generateId = (): string => `${Date.now()}-${++_idCounter}-${Math.random().toString(36).slice(2, 9)}`;

const PROJECTS_KEY = 'shishumi_projects';

/** 内存缓存：避免每次操作都解析全量 JSON（Read-through cache） */
let _cachedRaw: string | null = null;

/** 强制清除所有项目数据（用于存储损坏后的恢复） */
export const resetAllProjects = async (): Promise<void> => {
  _cachedRaw = null;
  await AsyncStorage.removeItem(PROJECTS_KEY);
};

export const getProjects = async (): Promise<Project[]> => {
  // 缓存命中：直接解析缓存字符串，避免重复 AsyncStorage I/O
  if (_cachedRaw !== null) {
    try {
      return JSON.parse(_cachedRaw) as Project[];
    } catch {
      _cachedRaw = null; // 缓存损坏则清除，避免后续操作读取损坏数据
    }
  }
  try {
    const data = await AsyncStorage.getItem(PROJECTS_KEY);
    _cachedRaw = data;
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('[storage] getProjects failed, resetting storage:', err);
    _cachedRaw = null;
    await resetAllProjects(); // AsyncStorage 损坏，强制重置
    return [];
  }
};

export const saveProjects = async (projects: Project[]): Promise<void> => {
  let raw: string;
  try {
    raw = JSON.stringify(projects);
  } catch (err) {
    console.error('[storage] JSON.stringify failed:', err);
    throw new Error('数据序列化失败');
  }
  _cachedRaw = raw; // 写入缓存，避免下次读取重新解析
  try {
    await AsyncStorage.setItem(PROJECTS_KEY, raw);
  } catch (err) {
    console.error('[storage] AsyncStorage.setItem failed:', err);
    // AsyncStorage 写入失败，清空缓存，下次从空状态重新开始
    _cachedRaw = null;
    throw new Error('存储写入失败，请检查手机存储空间'); // 返回明确错误信息
  }
};

export const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
  const projects = await getProjects();
  const newProject: Project = {
    ...project,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  // 先验证新项目数据完整
  if (!newProject.id || !newProject.title) {
    throw new Error('项目数据不完整，请重试');
  }
  // 只在保存成功后才返回；失败时不清除缓存以保留原有数据
  await saveProjects([...projects, newProject]);
  return newProject;
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project | null> => {
  try {
    const projects = await getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: Date.now(),
    };
    await saveProjects(projects);
    return projects[index];
  } catch (err) {
    console.error('[storage] updateProject failed:', err);
    return null;
  }
};

export const deleteProject = async (id: string): Promise<boolean> => {
  try {
    const projects = await getProjects();
    const filtered = projects.filter(p => p.id !== id);
    if (filtered.length === projects.length) return false;
    await saveProjects(filtered);
    return true;
  } catch (err) {
    console.error('[storage] deleteProject failed:', err);
    return false;
  }
};

export const addChapter = async (projectId: string, chapter: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chapter | null> => {
  try {
    const projects = await getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return null;

    const newChapter: Chapter = {
      ...chapter,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    projects[projectIndex].chapters.push(newChapter);
    projects[projectIndex].updatedAt = Date.now();
    await saveProjects(projects);
    return newChapter;
  } catch (err) {
    console.error('[storage] addChapter failed:', err);
    return null;
  }
};

export const updateChapter = async (projectId: string, chapterId: string, updates: Partial<Chapter>): Promise<Chapter | null> => {
  try {
    const projects = await getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return null;

    const chapterIndex = projects[projectIndex].chapters.findIndex(c => c.id === chapterId);
    if (chapterIndex === -1) return null;

    projects[projectIndex].chapters[chapterIndex] = {
      ...projects[projectIndex].chapters[chapterIndex],
      ...updates,
      updatedAt: Date.now(),
    };
    projects[projectIndex].updatedAt = Date.now();
    await saveProjects(projects);
    return projects[projectIndex].chapters[chapterIndex];
  } catch (err) {
    console.error('[storage] updateChapter failed:', err);
    return null;
  }
};

export const deleteChapter = async (projectId: string, chapterId: string): Promise<boolean> => {
  try {
    const projects = await getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return false;

    const chapterIndex = projects[projectIndex].chapters.findIndex(c => c.id === chapterId);
    if (chapterIndex === -1) return false;

    projects[projectIndex].chapters.splice(chapterIndex, 1);
    projects[projectIndex].updatedAt = Date.now();
    await saveProjects(projects);
    return true;
  } catch (err) {
    console.error('[storage] deleteChapter failed:', err);
    return false;
  }
};

const DYNASTY_KEY = 'shishumi_dynasty';
/** Storage key for custom dynasty name (used by both ProjectScreen and SettingsScreen) */
export const CUSTOM_DYNASTY_KEY = 'shishumi_custom_dynasty';

export const getDynasty = async (): Promise<string> => {
  try {
    const data = await AsyncStorage.getItem(DYNASTY_KEY);
    return data || 'tang';
  } catch {
    return 'tang';
  }
};

export const saveDynasty = async (dynasty: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(DYNASTY_KEY, dynasty);
  } catch (err) {
    console.error('[storage] saveDynasty failed:', err);
  }
};
