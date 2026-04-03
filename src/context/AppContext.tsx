import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Project, DynastyId } from '../types';
import { getProjects, saveProjects } from '../services/storage';

interface AppState {
  projects: Project[];
  loading: boolean;
  currentProject: Project | null;
  dynasty: DynastyId;
}

type AppAction =
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null }
  | { type: 'SET_DYNASTY'; payload: DynastyId };

const initialState: AppState = {
  projects: [],
  loading: true,
  currentProject: null,
  dynasty: 'tang',
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
        currentProject:
          state.currentProject?.id === action.payload.id
            ? action.payload
            : state.currentProject,
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        currentProject:
          state.currentProject?.id === action.payload ? null : state.currentProject,
      };
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload };
    case 'SET_DYNASTY':
      return { ...state, dynasty: action.payload };
    default:
      return state;
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const loadData = async () => {
      const [projects, dynasty] = await Promise.all([
        getProjects(),
        import('../services/storage').then(m => m.getDynasty()),
      ]);
      dispatch({ type: 'SET_PROJECTS', payload: projects });
      dispatch({ type: 'SET_DYNASTY', payload: dynasty as DynastyId });
    };
    loadData();
  }, []);

  // 监听 projects 变化，保存所有变更（仅在非 loading 状态）
  // 注意：SET_PROJECTS 同时改变 projects 和 loading，
  // 因此无需额外的 loading-complete effect — 本 effect 在 projects 变化时已覆盖保存。
  useEffect(() => {
    if (!state.loading) {
      saveProjects(state.projects).catch(err => {
        console.error('[AppContext] saveProjects failed:', err);
      });
    }
  }, [state.projects, state.loading]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
