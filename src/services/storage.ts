import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Project, Chapter } from '../types';

const PROJECTS_KEY = 'shishumi_projects';

export const getProjects = async (): Promise<Project[]> => {
  try {
    const data = await AsyncStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('[storage] getProjects failed:', err);
    return [];
  }
};

export const saveProjects = async (projects: Project[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('[storage] saveProjects failed:', err);
    throw err; // re-throw so caller knows save failed
  }
};

export const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
  const projects = await getProjects();
  const newProject: Project = {
    ...project,
    id: uuidv4(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  projects.push(newProject);
  await saveProjects(projects);
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
      id: uuidv4(),
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
