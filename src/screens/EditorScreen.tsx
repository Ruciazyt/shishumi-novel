import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Modal,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { AIAssistant } from '../components/AIAssistant';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha } from '../constants/colors';
import { getDynastyById, DYNASTY_WRITING_TIPS, DYNASTY_PLACEHOLDERS, DYNASTY_SUMMARIES, DYNASTIES } from '../data/dynasties';
import { updateChapter, saveDynasty } from '../services/storage';
import { formatLastSaved } from '../utils/time';
import { countChars } from '../utils/text';

import { DynastyBadge } from '../components/DynastyBadge';
import { RootStackParamList, AIAssistantType, DynastyId } from '../types';

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [writingTipVisible, setWritingTipVisible] = useState(false);
  const [dynastyModalVisible, setDynastyModalVisible] = useState(false);

  // Undo/Redo 历史记录
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 用于防抖自动保存 - 用 ref 记录上次保存的内容，避免依赖数组陷阱
  const lastSavedContentRef = useRef<string>('');
  const pendingContentRef = useRef<string>('');
  const projectRef = useRef(project);
  const chapterRef = useRef(chapter);
  const chapterIdRef = useRef(chapterId);
  pendingContentRef.current = content;
  projectRef.current = project;
  chapterRef.current = chapter;
  chapterIdRef.current = chapterId;

  // 用于 handleInsertContent — 始终读取最新 content，避免 stale closure
  const contentForInsertRef = useRef(content);
  contentForInsertRef.current = content;

  // 用于撤销/重做的稳定引用，避免 stale closure
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  // 防抖历史记录 timer ref
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 记录上一次推入历史的文本，避免重复记录相同内容
  const lastRecordedRef = useRef<string>('');
  const isMountedRef = useRef(true);

  // 清除历史记录防抖 timer
  const clearHistoryTimer = () => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
  };

  // 初始化历史记录
  useEffect(() => {
    if (chapter) {
      const initial = chapter.content;
      setContent(initial);
      lastSavedContentRef.current = initial;
      pendingContentRef.current = initial;
      lastRecordedRef.current = initial;
      setHistory([initial]);
      setHistoryIndex(0);
      historyRef.current = [initial];
      historyIndexRef.current = 0;
      setHasUnsavedChanges(false);
      // 从章节的 updatedAt 初始化最后保存时间
      if (chapter.updatedAt) {
        setLastSavedAt(new Date(chapter.updatedAt));
      }
    }
    clearHistoryTimer(); // 切换章节时清除旧历史 timer
    return () => clearHistoryTimer();
  }, [chapter?.id]);

  // 记录历史（防抖 500ms）
  const recordHistory = useCallback((text: string) => {
    // 内容无变化则跳过
    if (text === lastRecordedRef.current) return;
    clearHistoryTimer();
    historyTimerRef.current = setTimeout(() => {
      lastRecordedRef.current = text;
      setHistory(prev => [...prev.slice(0, historyIndexRef.current + 1), text].slice(-20));
      setHistoryIndex(prev => Math.min(prev + 1, 19));
      historyIndexRef.current = Math.min(historyIndexRef.current + 1, 19);
    }, 500);
  }, []); // 空依赖，靠 ref 访问最新 state

  // 撤销
  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    const newIndex = idx - 1;
    const newContent = historyRef.current[newIndex];
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    setContent(newContent);
    pendingContentRef.current = newContent;
  }, []);

  // 重做
  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    const hist = historyRef.current;
    if (idx >= hist.length - 1) return;
    const newIndex = idx + 1;
    const newContent = hist[newIndex];
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    setContent(newContent);
    pendingContentRef.current = newContent;
  }, []);

  // 用户输入时记录历史（防抖）— useCallback 避免每次渲染创建新函数引用
  const handleContentChange = useCallback((text: string) => {
    setContent(text);
    pendingContentRef.current = text;
    recordHistory(text);
  }, [recordHistory]);

  // AppState listener: 立即在后台保存，避免 OS 杀死进程时丢失数据
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // 仅保存到 storage，不 dispatch，避免组件卸载后更新 state
        const latestContent = pendingContentRef.current;
        const currentChapter = chapterRef.current;
        const currentProject = projectRef.current;
        if (!currentProject || !currentChapter) return;
        if (latestContent === lastSavedContentRef.current) return;
        updateChapter(currentProject.id, currentChapter.id, { content: latestContent }).then(updated => {
          if (updated) lastSavedContentRef.current = latestContent;
        });
      }
    });
    return () => subscription.remove();
  }, []);

  // 10秒防抖自动保存：timer 只在 mount 时创建，不依赖 content
  // content 变化只更新 ref，不重启 timer
  useEffect(() => {
    // 捕获创建 timer 时的 chapterId，确保后续 callback 只在章节未切换时执行
    const timerChapterId = chapterId;
    const timer = setTimeout(async () => {
      // 章节已切换则跳过，避免旧章节内容被错误保存到新章节
      if (timerChapterId !== chapterIdRef.current) return;
      const latestContent = pendingContentRef.current;
      const currentChapter = chapterRef.current;
      const currentProject = projectRef.current;
      if (!currentProject || !currentChapter) return;
      if (latestContent === lastSavedContentRef.current) return; // 无变化则跳过
      setIsSaving(true);
      const updated = await updateChapter(currentProject.id, currentChapter.id, { content: latestContent });
      if (timerChapterId !== chapterIdRef.current) { setIsSaving(false); return; }
      if (updated) {
        lastSavedContentRef.current = latestContent;
        const updatedProject = {
          ...currentProject,
          chapters: currentProject.chapters.map(c =>
            c.id === currentChapter.id ? updated : c
          ),
        };
        dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
        setJustSaved(true);
      }
      setIsSaving(false);
    }, 10000);
    return () => { clearTimeout(timer); };
  }, [chapterId]); // chapterId 变化时重置 timer，防止切章节后旧 timer 仍触发

  // 自动保存成功后短暂显示"已保存"提示
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const handleAIPress = (type: AIAssistantType) => {
    setAiType(type);
    setAiVisible(true);
  };

  useEffect(() => {
    if (chapter) {
      if (content !== chapter.content) {
        setHasUnsavedChanges(true);
      } else {
        setHasUnsavedChanges(false);
      }
    }
  }, [content, chapter?.content]);

  const handleSave = async () => {
    if (!project || !chapter) return;
    setIsSaving(true);
    if (!isMountedRef.current) { setIsSaving(false); return; }
    const updated = await updateChapter(project.id, chapter.id, { content });
    if (!isMountedRef.current) return;
    if (updated) {
      lastSavedContentRef.current = content;
      const updatedProject = {
        ...project,
        chapters: project.chapters.map(c =>
          c.id === chapter.id ? updated : c
        ),
      };
      dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
      setJustSaved(true);
      // 更新历史记录为已保存状态
      setHistory(prev => {
        const newHistory = [...prev.slice(0, historyIndexRef.current + 1)];
        newHistory[newHistory.length - 1] = updated.content;
        return newHistory;
      });
    }
    setIsSaving(false);
  };

  const handleBack = async () => {
    if (hasUnsavedChanges) {
      await handleSave();
    }
    navigation.goBack();
  };

  const handleInsertContent = (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    // 去除内容末尾的换行，避免与前缀的 \n\n 重复积累产生多余空行
    const baseContent = contentForInsertRef.current.replace(/\n+$/, '');
    const prefix = baseContent ? '\n\n' : '';
    const newContent = baseContent + prefix + trimmedText;
    setContent(newContent);
    pendingContentRef.current = newContent;
    recordHistory(newContent);
  };

  if (!project || !chapter) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>章节不存在</Text>
      </View>
    );
  }

  const chapterIndex = project?.chapters.findIndex(c => c.id === chapterId) ?? -1;
  const canGoPrev = chapterIndex > 0;
  const canGoNext = chapterIndex < (project?.chapters.length ?? 0) - 1;
  const prevChapterId = canGoPrev ? project?.chapters[chapterIndex - 1].id : null;
  const nextChapterId = canGoNext ? project?.chapters[chapterIndex + 1].id : null;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 统计字数（useMemo 避免每次按键重复计算）
  const { charCount, wordCount } = React.useMemo(() => {
    const trimmed = content.trim();
    return {
      charCount: countChars(content),
      wordCount: trimmed ? trimmed.split(/\s+/).length : 0,
    };
  }, [content]);

  const chapterDisplay = chapterIndex >= 0 ? `第${chapterIndex + 1}章/共${project?.chapters.length ?? 0}章 · ` : '';
  // 简短占位符（用于 TextInput placeholder）
  const handlePrevChapter = async () => {
    if (canGoPrev && prevChapterId) {
      if (hasUnsavedChanges) await handleSave();
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
      navigation.navigate('Editor', { chapterId: prevChapterId });
    }
  };

  const handleNextChapter = async () => {
    if (canGoNext && nextChapterId) {
      if (hasUnsavedChanges) await handleSave();
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
      navigation.navigate('Editor', { chapterId: nextChapterId });
    }
  };

  // 朝代元数据：一次性获取，避免 4 个 useMemo 各自重复调用 getDynastyById
  const dynastyMeta = React.useMemo(() => {
    const dynastyId = project?.dynasty ?? state.dynasty;
    const dynastyData = getDynastyById(dynastyId);
    return {
      display: dynastyData?.name || dynastyId,
      summary: dynastyData ? (DYNASTY_SUMMARIES[dynastyData.name] || '') : '',
      writingTip: dynastyData ? (DYNASTY_WRITING_TIPS[dynastyData.name] || '') : '',
      placeholder: dynastyData ? (DYNASTY_PLACEHOLDERS[dynastyData.name] || '开始写作...') : '开始写作...',
    };
  }, [project?.dynasty, state.dynasty]);

  const dynastyDisplay = dynastyMeta.display;
  const dynastySummary = dynastyMeta.summary;
  const dynastyWritingTip = dynastyMeta.writingTip;
  const dynastyPlaceholder = dynastyMeta.placeholder;

  const handleDynastyChange = async (dynastyId: DynastyId) => {
    // 更新全局 dynasty 设置
    dispatch({ type: 'SET_DYNASTY', payload: dynastyId });
    // 同时更新当前项目的朝代（项目级优先于全局）
    if (project) {
      const updatedProject = { ...project, dynasty: dynastyId };
      dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
    }
    await saveDynasty(dynastyId);
    setDynastyModalVisible(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonContainer}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {chapterDisplay}{chapter.title}
        </Text>
        <View style={styles.headerRight}>

          <TouchableOpacity
            onPress={undo}
            disabled={!canUndo}
            style={[styles.undoRedoBtn, !canUndo && styles.undoRedoBtnDisabled]}
            accessibilityLabel="撤销"
            accessibilityRole="button"
          >
            <Text style={[styles.undoRedoText, !canUndo && styles.undoRedoTextDisabled]}>↩</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={redo}
            disabled={!canRedo}
            style={[styles.undoRedoBtn, !canRedo && styles.undoRedoBtnDisabled]}
            accessibilityLabel="重做"
            accessibilityRole="button"
          >
            <Text style={[styles.undoRedoText, !canRedo && styles.undoRedoTextDisabled]}>↪</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWritingTipVisible(true)}
            style={styles.tipBtn}
            accessibilityLabel="写作提示"
            accessibilityRole="button"
          >
            <Text style={styles.tipBtnText}>📜</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            accessibilityLabel="保存"
            accessibilityRole="button"
          >
            <Text style={[styles.saveButton, (!hasUnsavedChanges || isSaving) && styles.saveButtonDisabled]}>
              {isSaving ? '保存中' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 字数统计栏 */}
      <View style={styles.statsBar}>
        <View style={styles.statsBarLeft}>
          <TouchableOpacity
            style={{ marginRight: Spacing.sm }}
            onPress={() => setDynastyModalVisible(true)}
            accessibilityLabel={`当前朝代：${dynastyDisplay}，点击切换`}
            accessibilityRole="button"
          >
            <DynastyBadge name={dynastyDisplay} subtext={dynastySummary} size="xs" />
          </TouchableOpacity>
          <Text style={styles.statsText}>
            {chapterDisplay}{charCount} 字{wordCount > 0 ? ` · ${wordCount} 词` : ''}{lastSavedAt ? ` · ${formatLastSaved(lastSavedAt)}` : ''}
          </Text>
        </View>
        <View style={styles.statsBarRight}>
          {isSaving ? (
            <Text style={styles.savingIndicator}>● 保存中</Text>
          ) : justSaved ? (
            <Text style={styles.savedIndicator}>✓ 已保存</Text>
          ) : hasUnsavedChanges ? (
            <Text style={styles.unsavedIndicator}>● 未保存</Text>
          ) : null}
          <TouchableOpacity
            onPress={Keyboard.dismiss}
            style={styles.keyboardDismissBtn}
            accessibilityLabel="收起键盘"
            accessibilityRole="button"
          >
            <Text style={styles.keyboardDismissBtnText}>⌨</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Editor */}
      <ScrollView style={styles.editorContainer}>
        <TextInput
          style={styles.editor}
          placeholder={dynastyPlaceholder}
          placeholderTextColor={Colors.textLight}
          value={content}
          onChangeText={handleContentChange}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolButton, aiVisible && aiType === 'polish' && styles.toolButtonActive]}
          onPress={() => handleAIPress('polish')}
          accessibilityLabel="润色当前文本"
          accessibilityRole="button"
        >
          <Text style={[styles.toolButtonText, aiVisible && aiType === 'polish' && styles.toolButtonTextActive]}>润色</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiVisible && aiType === 'historical' && styles.toolButtonActive]}
          onPress={() => handleAIPress('historical')}
          accessibilityLabel="添加历史细节"
          accessibilityRole="button"
        >
          <Text style={[styles.toolButtonText, aiVisible && aiType === 'historical' && styles.toolButtonTextActive]}>历史细节</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiVisible && aiType === 'poetry' && styles.toolButtonActive]}
          onPress={() => handleAIPress('poetry')}
          accessibilityLabel="推荐相关诗词"
          accessibilityRole="button"
        >
          <Text style={[styles.toolButtonText, aiVisible && aiType === 'poetry' && styles.toolButtonTextActive]}>诗词</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiVisible && aiType === 'buddhist' && styles.toolButtonActive]}
          onPress={() => handleAIPress('buddhist')}
          accessibilityLabel="推荐佛教经典引用"
          accessibilityRole="button"
        >
          <Text style={[styles.toolButtonText, aiVisible && aiType === 'buddhist' && styles.toolButtonTextActive]}>佛教</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiVisible && aiType === 'taoist' && styles.toolButtonActive]}
          onPress={() => handleAIPress('taoist')}
          accessibilityLabel="推荐道家经典引用"
          accessibilityRole="button"
        >
          <Text style={[styles.toolButtonText, aiVisible && aiType === 'taoist' && styles.toolButtonTextActive]}>道家</Text>
        </TouchableOpacity>
        {/* 章节导航 */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navChapterBtn, !canGoPrev && styles.navChapterBtnDisabled]}
            onPress={handlePrevChapter}
            disabled={!canGoPrev}
            accessibilityLabel="上一章"
            accessibilityRole="button"
          >
            <Text style={[styles.navChapterBtnText, !canGoPrev && styles.navChapterBtnTextDisabled]}>‹ 上一章</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navChapterBtn, !canGoNext && styles.navChapterBtnDisabled]}
            onPress={handleNextChapter}
            disabled={!canGoNext}
            accessibilityLabel="下一章"
            accessibilityRole="button"
          >
            <Text style={[styles.navChapterBtnText, !canGoNext && styles.navChapterBtnTextDisabled]}>下一章 ›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <AIAssistant
        visible={aiVisible}
        onClose={() => setAiVisible(false)}
        onInsertText={handleInsertContent}
        initialType={aiType}
      />

      {/* 朝代切换弹窗 */}
      <Modal visible={dynastyModalVisible} animationType="slide" transparent>
        <View style={styles.tipModalOverlay}>
          <TouchableOpacity
            style={styles.tipModalBackdrop}
            activeOpacity={1}
            onPress={() => setDynastyModalVisible(false)}
          />
          <View style={styles.tipModalContent}>
            <View style={styles.tipModalHeader}>
              <Text style={styles.tipModalTitle}>📜 切换朝代</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDynastyModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dynastySwitchList}>
              {DYNASTIES.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.dynastySwitchItem,
                    (project?.dynasty || state.dynasty) === d.id && styles.dynastySwitchItemActive,
                  ]}
                  onPress={() => handleDynastyChange(d.id as DynastyId)}
                >
                  <View style={styles.dynastySwitchItemContent}>
                    <Text
                      style={[
                        styles.dynastySwitchText,
                        (project?.dynasty || state.dynasty) === d.id && styles.dynastySwitchTextActive,
                      ]}
                    >
                      {d.name}
                    </Text>
                    <Text style={styles.dynastySwitchDesc}>{d.languageFeatures}</Text>
                  </View>
                  {(project?.dynasty || state.dynasty) === d.id && (
                    <Text style={styles.dynastySwitchCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 写作提示弹窗 */}
      <Modal visible={writingTipVisible} animationType="slide" transparent>
        <View style={styles.tipModalOverlay}>
          <TouchableOpacity
            style={styles.tipModalBackdrop}
            activeOpacity={1}
            onPress={() => setWritingTipVisible(false)}
          />
          <View style={styles.tipModalContent}>
            <View style={styles.tipModalHeader}>
              <View style={styles.tipModalTitleRow}>
                <Text style={styles.tipModalTitle}>📜 写作提示</Text>
                {dynastySummary ? (
                  <Text style={styles.tipModalSubtitle} numberOfLines={1}>
                    {dynastySummary}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setWritingTipVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.tipModalScroll}>
              <Text style={styles.tipModalText}>{dynastyWritingTip}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: ColorsAlpha.goldBorder,
  },
  backButtonContainer: {
    padding: Spacing.xs,
  },
  backButton: {
    fontSize: FontSize.md,
    color: Colors.vermillion,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  undoRedoBtn: {
    padding: Spacing.xs,
  },
  undoRedoBtnDisabled: {
    padding: Spacing.xs,
    backgroundColor: Colors.paperDark,
    borderRadius: BorderRadius.sm,
  },
  undoRedoText: {
    fontSize: 20,
    color: Colors.vermillion,
  },
  undoRedoTextDisabled: {
    opacity: 0.35,
  },
  tipBtn: {
    padding: Spacing.xs,
  },
  tipBtnText: {
    fontSize: 20,
  },
  saveButton: {
    fontSize: FontSize.md,
    color: Colors.vermillion,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.35,
  },
  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.paperDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statsText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  savingIndicator: {
    fontSize: FontSize.xs,
    color: Colors.vermillion,
  },
  unsavedIndicator: {
    fontSize: FontSize.xs,
    color: Colors.warning,
  },
  savedIndicator: {
    fontSize: FontSize.xs,
    color: Colors.success,
  },
  // Stats Bar - 收起键盘按钮
  statsBarLeft: {
    flex: 1,
  },
  statsBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  keyboardDismissBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  keyboardDismissBtnText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  // Editor
  editorContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  editor: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 30,
    minHeight: 400,
  },
  // Toolbar
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: ColorsAlpha.goldBorder,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.backgroundCard,
    gap: Spacing.xs,
  },
  toolButton: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 56,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    backgroundColor: Colors.paperDark,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toolButtonActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  toolButtonText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  toolButtonTextActive: {
    color: Colors.textOnVermillion,
  },
  // Toolbar - Chapter Navigation
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  navChapterBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
  },
  navChapterBtnDisabled: {
    opacity: 0.4,
    borderColor: Colors.border,
  },
  navChapterBtnText: {
    fontSize: FontSize.sm,
    color: Colors.gold,
    fontWeight: '600',
  },
  navChapterBtnTextDisabled: {
    color: Colors.textLight,
  },
  // Error
  errorText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  // Writing Tip Modal
  tipModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tipModalBackdrop: {
    flex: 1,
  },
  tipModalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '70%',
  },
  tipModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ColorsAlpha.goldBorder,
  },
  tipModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  tipModalTitleRow: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  tipModalSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  tipModalScroll: {
    padding: Spacing.lg,
  },
  tipModalText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  // Dynasty Switch Modal
  dynastySwitchList: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  dynastySwitchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dynastySwitchItemActive: {
    backgroundColor: ColorsAlpha.vermillionBadgeBg,
    borderColor: Colors.vermillion,
  },
  dynastySwitchItemContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  dynastySwitchText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  dynastySwitchTextActive: {
    color: Colors.vermillion,
  },
  dynastySwitchDesc: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    lineHeight: 16,
  },
  dynastySwitchCheck: {
    fontSize: FontSize.md,
    color: Colors.vermillion,
    fontWeight: 'bold',
  },
});