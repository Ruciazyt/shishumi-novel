import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project } from '../types';

const PROJECTS_KEY = 'shishumi_projects';

export const getProjects = async (): Promise<Project[]> => {
  try {
    const data = await AsyncStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveProjects = async (projects: Project[]): Promise<void> => {
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  const projects = await getProjects();
  return projects.find(p => p.id === id) || null;
};

export const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
  const projects = await getProjects();
  const newProject: Project = {
    ...project,
    id: Date.now().toString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  projects.push(newProject);
  await saveProjects(projects);
  return newProject;
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project | null> => {
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
};

export const deleteProject = async (id: string): Promise<boolean> => {
  const projects = await getProjects();
  const filtered = projects.filter(p => p.id !== id);
  if (filtered.length === projects.length) return false;
  await saveProjects(filtered);
  return true;
};

export const addChapter = async (projectId: string, chapter: Omit<import('../types').Chapter, 'id' | 'createdAt' | 'updatedAt'>): Promise<import('../types').Chapter | null> => {
  const projects = await getProjects();
  const projectIndex = projects.findIndex(p => p.id === projectId);
  if (projectIndex === -1) return null;

  const newChapter: import('../types').Chapter = {
    ...chapter,
    id: Date.now().toString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  projects[projectIndex].chapters.push(newChapter);
  projects[projectIndex].updatedAt = Date.now();
  await saveProjects(projects);
  return newChapter;
};

export const updateChapter = async (projectId: string, chapterId: string, updates: Partial<import('../types').Chapter>): Promise<import('../types').Chapter | null> => {
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
};

export const deleteChapter = async (projectId: string, chapterId: string): Promise<boolean> => {
  const projects = await getProjects();
  const projectIndex = projects.findIndex(p => p.id === projectId);
  if (projectIndex === -1) return false;

  const chapterIndex = projects[projectIndex].chapters.findIndex(c => c.id === chapterId);
  if (chapterIndex === -1) return false;

  projects[projectIndex].chapters.splice(chapterIndex, 1);
  projects[projectIndex].updatedAt = Date.now();
  await saveProjects(projects);
  return true;
};
