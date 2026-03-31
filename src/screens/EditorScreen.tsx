import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { AIAssistant } from '../components/AIAssistant';
import { PoetryRecommend } from '../components/PoetryRecommend';
import { Colors } from '../constants/colors';
import { updateChapter } from '../services/storage';
import { RootStackParamList, AIAssistantType } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditorScreenRouteProp = RouteProp<RootStackParamList, 'Editor'>;

export const EditorScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditorScreenRouteProp>();
  const { state, dispatch } = useApp();
  const { chapterId } = route.params;

  const project = state.currentProject;
  const chapter = project?.chapters.find(c => c.id === chapterId);

  const [content, setContent] = useState(chapter?.content || '');
  const [aiVisible, setAiVisible] = useState(false);
  const [aiType, setAiType] = useState<AIAssistantType>('polish');
  const [poetryVisible, setPoetryVisible] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Undo/Redo 历史记录
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 用于防抖自动保存
  const contentRef = useRef(content);
  const chapterRef = useRef(chapter);
  contentRef.current = content;
  chapterRef.current = chapter;

  // 初始化历史记录
  useEffect(() => {
    if (chapter) {
      setContent(chapter.content);
      setHistory([chapter.content]);
      setHistoryIndex(0);
      setHasUnsavedChanges(false);
    }
  }, [chapter?.id]);

  // 记录历史
  const recordHistory = useCallback((text: string) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), text].slice(-20));
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
    }
  }, [historyIndex, history]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
    }
  }, [historyIndex, history]);

  // 用户输入时记录历史
  const handleContentChange = (text: string) => {
    setContent(text);
    recordHistory(text);
  };

  // 30秒防抖自动保存：每次内容变化后等待30秒无操作再保存
  useEffect(() => {
    const timer = setTimeout(async () => {
      const latestContent = contentRef.current;
      const currentChapter = chapterRef.current;
      if (!project || !currentChapter) return;
      if (latestContent !== currentChapter.content) {
        const updated = await updateChapter(project.id, currentChapter.id, { content: latestContent });
        if (updated) {
          const updatedProject = {
            ...project,
            chapters: project.chapters.map(c =>
              c.id === currentChapter.id ? updated : c
            ),
          };
          dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
          setHasUnsavedChanges(false);
        }
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [content, project, dispatch]);

  const handleAIPress = (type: AIAssistantType) => {
    setAiType(type);
    setAiVisible(true);
  };

  const handlePoetryPress = () => {
    setPoetryVisible(true);
  };

  useEffect(() => {
    if (chapter) {
      const initial = chapter.content;
      if (content !== initial) {
        setHasUnsavedChanges(true);
      } else {
        setHasUnsavedChanges(false);
      }
    }
  }, [content, chapter?.content]);

  const handleSave = async () => {
    if (!project || !chapter) return;
    const updated = await updateChapter(project.id, chapter.id, { content });
    if (updated) {
      const updatedProject = {
        ...project,
        chapters: project.chapters.map(c =>
          c.id === chapter.id ? updated : c
        ),
      };
      dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
      setHasUnsavedChanges(false);
      // 更新历史记录为已保存状态
      setHistory(prev => {
        const newHistory = [...prev.slice(0, historyIndex + 1)];
        newHistory[newHistory.length - 1] = updated.content;
        return newHistory;
      });
    }
  };

  const handleBack = async () => {
    if (hasUnsavedChanges) {
      await handleSave();
    }
    navigation.goBack();
  };

  const handleInsertText = (text: string) => {
    const newContent = content + '\n\n' + text;
    setContent(newContent);
    recordHistory(newContent);
  };

  const handlePoetrySelect = (poetry: string) => {
    const newContent = content + '\n\n' + poetry;
    setContent(newContent);
    recordHistory(newContent);
  };

  if (!project || !chapter) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>章节不存在</Text>
      </View>
    );
  }

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 统计字数（移除了中日韩字符的复杂逻辑，中文按字符数，英文按单词数）
  const charCount = content.replace(/\s/g, '').length;
  const wordCount = content.trim()
    ? content.trim().split(/\s+/).length
    : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {chapter.title}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={undo} disabled={!canUndo} style={styles.undoRedoBtn}>
            <Text style={[styles.undoRedoText, !canUndo && styles.undoRedoDisabled]}>↩</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={redo} disabled={!canRedo} style={styles.undoRedoBtn}>
            <Text style={[styles.undoRedoText, !canRedo && styles.undoRedoDisabled]}>↪</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.saveButton, !hasUnsavedChanges && styles.saveButtonDisabled]}>
              保存
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 字数统计栏 */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {charCount} 字{wordCount > 0 ? ` / ${wordCount} 词` : ''}
        </Text>
        {hasUnsavedChanges && (
          <Text style={styles.unsavedIndicator}>● 未保存</Text>
        )}
      </View>

      <ScrollView style={styles.editorContainer}>
        <TextInput
          style={styles.editor}
          placeholder="开始写作..."
          placeholderTextColor={Colors.textLight}
          value={content}
          onChangeText={handleContentChange}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolButton, aiType === 'polish' && !poetryVisible && styles.toolButtonActive]}
          onPress={() => handleAIPress('polish')}
        >
          <Text style={[styles.toolButtonText, aiType === 'polish' && !poetryVisible && styles.toolButtonTextActive]}>润色</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiType === 'historical' && styles.toolButtonActive]}
          onPress={() => handleAIPress('historical')}
        >
          <Text style={[styles.toolButtonText, aiType === 'historical' && styles.toolButtonTextActive]}>历史细节</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, poetryVisible && styles.toolButtonActive]}
          onPress={handlePoetryPress}
        >
          <Text style={[styles.toolButtonText, poetryVisible && styles.toolButtonTextActive]}>诗词</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiType === 'buddhist' && styles.toolButtonActive]}
          onPress={() => handleAIPress('buddhist')}
        >
          <Text style={[styles.toolButtonText, aiType === 'buddhist' && styles.toolButtonTextActive]}>佛教</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiType === 'taoist' && styles.toolButtonActive]}
          onPress={() => handleAIPress('taoist')}
        >
          <Text style={[styles.toolButtonText, aiType === 'taoist' && styles.toolButtonTextActive]}>道家</Text>
        </TouchableOpacity>
      </View>

      <AIAssistant
        visible={aiVisible}
        onClose={() => setAiVisible(false)}
        onInsertText={handleInsertText}
        initialType={aiType}
      />

      <PoetryRecommend
        visible={poetryVisible}
        onClose={() => setPoetryVisible(false)}
        onSelect={handlePoetrySelect}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    fontSize: 16,
    color: Colors.vermillion,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoRedoBtn: {
    padding: 4,
  },
  undoRedoText: {
    fontSize: 18,
    color: Colors.vermillion,
  },
  undoRedoDisabled: {
    color: Colors.textLight,
  },
  saveButton: {
    fontSize: 16,
    color: Colors.vermillion,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: Colors.textLight,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.paperDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statsText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  unsavedIndicator: {
    fontSize: 12,
    color: Colors.warning,
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  editor: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 28,
    minHeight: 400,
  },
  toolbar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: Colors.backgroundCard,
    gap: 4,
  },
  toolButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 2,
    backgroundColor: Colors.paperDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toolButtonActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  toolButtonText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  toolButtonTextActive: {
    color: Colors.textOnVermillion,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 60,
  },
});
