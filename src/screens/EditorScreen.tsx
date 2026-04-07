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
  Alert,
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
import { countChars } from '../utils/text';
import { formatLastSaved } from '../utils/time';

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
  const hasUnsavedChangesRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Ref for editor ScrollView — used to auto-scroll to inserted AI content
  const editorScrollRef = useRef<ScrollView>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  // 30秒递增计数器，强制 statsBarRightContent 重新计算相对时间
  const [tick, setTick] = useState(0);
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
  // Stable refs for navigation callbacks — avoids dispatch/navigation causing callback re-creates
  const dispatchRef = useRef(dispatch);
  const navigationRef = useRef(navigation);
  pendingContentRef.current = content;
  projectRef.current = project;
  chapterRef.current = chapter;
  chapterIdRef.current = chapterId;

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
  // 组件卸载时标记，防止异步操作更新已卸载组件的 state
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // 同步 dispatch/navigation 到 ref，确保 nav callbacks 稳定
  useEffect(() => {
    dispatchRef.current = dispatch;
    navigationRef.current = navigation;
  }, [dispatch, navigation]);

  /** 持久化内容到 storage + dispatch 更新 project state，返回是否成功 */
  const persistContent = useCallback(async (
    contentToSave: string,
    proj: NonNullable<typeof projectRef.current>,
    chap: NonNullable<typeof chapterRef.current>,
  ) => {
    const updated = await updateChapter(proj.id, chap.id, { content: contentToSave });
    if (updated) {
      lastSavedContentRef.current = contentToSave;
      hasUnsavedChangesRef.current = false;
      dispatch({
        type: 'UPDATE_PROJECT',
        payload: {
          ...proj,
          chapters: proj.chapters.map(c => c.id === chap.id ? updated : c),
        },
      });
    }
    return !!updated;
  }, [dispatch]);

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
      hasUnsavedChangesRef.current = false;
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
    hasUnsavedChangesRef.current = text !== lastSavedContentRef.current;
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
      setIsAutoSaving(true);
      setIsSaving(true);
      const ok = await persistContent(latestContent, currentProject, currentChapter);
      if (timerChapterId !== chapterIdRef.current) { setIsAutoSaving(false); setIsSaving(false); return; }
      if (ok) {
        setLastSavedAt(new Date());
        setJustSaved(true);
      }
      setIsAutoSaving(false);
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

  // 30秒定时器：更新相对时间显示（如"自动保存于 X分钟前"）
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleAIPress = (type: AIAssistantType) => {
    setAiType(type);
    setAiVisible(true);
  };



  // 使用 useCallback + 空依赖实现稳定引用，通过 ref 读取最新值避免 stale closure
  const handleSave = useCallback(async () => {
    const currentProject = projectRef.current;
    const currentChapter = chapterRef.current;
    if (!currentProject || !currentChapter) return;
    const latestContent = pendingContentRef.current;
    setIsSaving(true);
    if (!isMountedRef.current) { setIsSaving(false); return; }
    const ok = await persistContent(latestContent, currentProject, currentChapter);
    if (!isMountedRef.current) return;
    if (ok) {
      setLastSavedAt(new Date());
      setJustSaved(true);
      setHistory(prev => {
        const newHistory = [...prev.slice(0, historyIndexRef.current + 1)];
        newHistory[newHistory.length - 1] = latestContent;
        return newHistory;
      });
    }
    setIsSaving(false);
  }, []); // 空依赖 — 所有值通过 ref 读取，保持引用稳定

  const handleBack = () => {
    if (hasUnsavedChangesRef.current) {
      Alert.alert(
        '有未保存的更改',
        '您可以保存后离开，或放弃更改',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '放弃更改',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
          {
            text: '保存并离开',
            onPress: async () => {
              await handleSave();
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }
    navigation.goBack();
  };

  const handleInsertContent = useCallback((text: string) => {
    const trimmedText = text.trim();
    // Normalize runs of 3+ newlines to 2 (prevents excessive blank lines
    // when inserting multiple times into content with existing paragraph breaks).
    const normalized = pendingContentRef.current.replace(/\n{3,}/g, '\n\n');
    // Ensure at least \n\n at the end: if the normalized content already ends
    // with \n\n (meaning there were paragraph breaks), preserve them to protect
    // the original paragraph structure. Otherwise strip trailing newlines.
    const baseContent = normalized.endsWith('\n\n')
      ? normalized
      : normalized.replace(/\n+$/, '');
    if (!trimmedText) {
      // Even when AI returns empty/whitespace, keep pendingContentRef in sync
      // with the currently displayed (normalized) TextInput content. Otherwise
      // pendingContentRef holds the previous AI result and corrupts the next
      // manual edit: new text gets appended to the stale AI content.
      pendingContentRef.current = normalized;
      return;
    }
    const prefix = baseContent ? '\n\n' : '';
    const newContent = baseContent + prefix + trimmedText;
    setContent(newContent);
    pendingContentRef.current = newContent;
    recordHistory(newContent);
    // Auto-scroll editor to show newly inserted AI content
    editorScrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  if (!project || !chapter) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>章节不存在</Text>
      </View>
    );
  }

  // 章节导航状态 — 使用 useMemo 避免每次渲染重复计算 findIndex
  const { chapterIndex, canGoPrev, canGoNext, prevChapterId, nextChapterId, chapterDisplay } = React.useMemo(() => {
    const chapters = project?.chapters ?? [];
    const idx = chapters.findIndex(c => c.id === chapterId);
    return {
      chapterIndex: idx,
      canGoPrev: idx > 0,
      canGoNext: idx < chapters.length - 1,
      prevChapterId: idx > 0 ? chapters[idx - 1].id : null,
      nextChapterId: idx < chapters.length - 1 ? chapters[idx + 1].id : null,
      chapterDisplay: idx >= 0 ? `第${idx + 1}章/共${chapters.length}章 · ` : '',
    };
  }, [project?.chapters, chapterId]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 统计字数（useMemo 避免每次按键重复计算）
  const charCount = React.useMemo(() => countChars(content), [content]);
  /** 内容过长时显示警告（>5000 字），提示用户注意分段 */
  const isLongContent = charCount > 5000;

  /** 章节导航：使用 projectRef 避免 project 引用变化导致回调重建 */
  const handlePrevChapter = useCallback(async () => {
    const p = projectRef.current;
    if (!p) return;
    const idx = p.chapters.findIndex(c => c.id === chapterId);
    if (idx > 0) {
      if (hasUnsavedChangesRef.current) await handleSave();
      dispatchRef.current({ type: 'SET_CURRENT_PROJECT', payload: p });
      navigationRef.current.navigate('Editor', { chapterId: p.chapters[idx - 1].id });
    }
  }, [chapterId, handleSave]);

  const handleNextChapter = useCallback(async () => {
    const p = projectRef.current;
    if (!p) return;
    const idx = p.chapters.findIndex(c => c.id === chapterId);
    if (idx < p.chapters.length - 1) {
      if (hasUnsavedChangesRef.current) await handleSave();
      dispatchRef.current({ type: 'SET_CURRENT_PROJECT', payload: p });
      navigationRef.current.navigate('Editor', { chapterId: p.chapters[idx + 1].id });
    }
  }, [chapterId, handleSave]);

  // 朝代元数据：一次性获取，避免 4 个 useMemo 各自重复调用 getDynastyById
  const dynastyMeta = React.useMemo(() => {
    const dynastyId = project?.dynasty ?? state.dynasty;
    const dynastyData = getDynastyById(dynastyId);
    if (dynastyId === 'custom') {
      return {
        display: '自定义/架空',
        summary: '',
        writingTip: '自定义朝代无预设写作引导，请根据您的创作设定自由发挥。',
        placeholder: '开始写作...',
      };
    }
    return {
      display: dynastyData?.name || dynastyId,
      summary: dynastyData ? (DYNASTY_SUMMARIES[dynastyData.name] || '') : '',
      writingTip: dynastyData ? (DYNASTY_WRITING_TIPS[dynastyData.name] || '') : '',
      placeholder: dynastyData ? (DYNASTY_PLACEHOLDERS[dynastyData.name] || '开始写作...') : '开始写作...',
    };
  }, [project?.dynasty, state.dynasty]);

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

  /** 统计栏右侧内容状态：返回纯数据而非 JSX，符合 React 数据驱动渲染原则 */
  const saveStatus = React.useMemo<'saving' | 'saved' | 'unsaved' | 'autoSaved' | null>(() => {
    if (isSaving) return 'saving';
    if (justSaved) return 'saved';
    if (lastSavedAt) return 'autoSaved';
    if (hasUnsavedChangesRef.current) return 'unsaved';
    return null;
  }, [isSaving, justSaved, lastSavedAt]);

  /** 格式化自动保存时间文案 */
  const autoSaveLabel = React.useMemo(() => {
    if (saveStatus !== 'autoSaved' || !lastSavedAt) return '';
    const label = formatLastSaved(lastSavedAt);
    return label === '刚刚' ? '刚刚自动保存' : `${label}自动保存`;
  }, [saveStatus, lastSavedAt, tick]);

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
            <Text style={styles.undoRedoText}>↩</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={redo}
            disabled={!canRedo}
            style={[styles.undoRedoBtn, !canRedo && styles.undoRedoBtnDisabled]}
            accessibilityLabel="重做"
            accessibilityRole="button"
          >
            <Text style={styles.undoRedoText}>↪</Text>
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
            <Text style={[styles.saveButton, (!hasUnsavedChangesRef.current || isSaving) && styles.saveButtonDisabled]}>
              {isSaving ? (isAutoSaving ? '自动保存中...' : '保存中...') : '保存'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 字数统计栏 */}
      <View style={styles.statsBar}>
        <View style={styles.statsBarLeft}>
          <TouchableOpacity
            onPress={() => setDynastyModalVisible(true)}
            accessibilityLabel={`当前朝代：${dynastyMeta.display}，点击切换`}
            accessibilityRole="button"
          >
            <DynastyBadge name={dynastyMeta.display} subtext={dynastyMeta.summary} size="xs" />
          </TouchableOpacity>
          {chapterIndex >= 0 && (
            <View style={styles.statsChapterChip}>
              <Text style={styles.statsChapterChipText}>{chapterDisplay}</Text>
            </View>
          )}
          <Text style={styles.statsText}>
            {charCount.toLocaleString()} 字
          </Text>
          {isLongContent && (
            <Text style={styles.contentLengthWarning}>内容较长，建议注意分段</Text>
          )}
        </View>
        <View style={styles.statsBarRight}>
          {saveStatus === 'saving' && <Text style={styles.savingIndicator}>● 保存中</Text>}
          {saveStatus === 'saved' && <Text style={styles.savedIndicator}>✓ 已保存</Text>}
          {saveStatus === 'autoSaved' && <Text style={styles.savedIndicator}>{autoSaveLabel}</Text>}
          {saveStatus === 'unsaved' && <Text style={styles.unsavedIndicator}>● 未保存</Text>}
          <TouchableOpacity
            onPress={Keyboard.dismiss}
            style={styles.keyboardDismissBtn}
            accessibilityLabel="收起键盘"
            accessibilityRole="button"
          >
            <Text style={styles.keyboardDismissBtnText}>⌨ 收起键盘</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Editor */}
      <ScrollView ref={editorScrollRef} style={styles.editorContainer} keyboardDismissMode="on-drag">
        <TextInput
          style={styles.editor}
          placeholder={dynastyMeta.placeholder}
          placeholderTextColor={Colors.textLight}
          value={content}
          onChangeText={handleContentChange}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
      </ScrollView>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        {chapterIndex >= 0 && (
          <View style={styles.chapterProgressChip} accessibilityLabel={`${chapterDisplay}章节进度`}>
            <Text style={styles.chapterProgressChipText} numberOfLines={1}>
              {chapterDisplay}{chapter.title}
            </Text>
          </View>
        )}
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
              <TouchableOpacity
                style={[
                  styles.dynastySwitchItem,
                  (project?.dynasty || state.dynasty) === 'custom' && styles.dynastySwitchItemActive,
                ]}
                onPress={() => handleDynastyChange('custom')}
              >
                <View style={styles.dynastySwitchItemContent}>
                  <Text
                    style={[
                      styles.dynastySwitchText,
                      (project?.dynasty || state.dynasty) === 'custom' && styles.dynastySwitchTextActive,
                    ]}
                  >
                    自定义/架空
                  </Text>
                  <Text style={styles.dynastySwitchDesc}>自定义创作，无历史背景限制</Text>
                </View>
                {(project?.dynasty || state.dynasty) === 'custom' && (
                  <Text style={styles.dynastySwitchCheck}>✓</Text>
                )}
              </TouchableOpacity>
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
                {dynastyMeta.summary ? (
                  <Text style={styles.tipModalSubtitle} numberOfLines={1}>
                    {dynastyMeta.summary}
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
              <Text style={styles.tipModalText}>{dynastyMeta.writingTip}</Text>
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
    opacity: 0.35,
  },
  undoRedoText: {
    fontSize: 20,
    color: Colors.vermillion,
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
    opacity: 0.6,
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
  statsBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statsBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statsChapterChip: {
    backgroundColor: ColorsAlpha.goldBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'center',
  },
  statsChapterChipText: {
    fontSize: FontSize.xs,
    color: Colors.gold,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statsText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  contentLengthWarning: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: '600',
    marginLeft: Spacing.xs,
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
  // Keyboard Dismiss Button
  keyboardDismissBtn: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  keyboardDismissBtnText: {
    fontSize: FontSize.sm,
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
    textAlignVertical: 'top',
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
  // Toolbar - Chapter Progress Chip
  chapterProgressChip: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
    backgroundColor: ColorsAlpha.goldBorder,
    borderRadius: BorderRadius.md,
    // 上边框分隔 AI 按钮区和章节导航区
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
  },
  chapterProgressChipText: {
    fontSize: FontSize.xs,
    color: Colors.gold,
    fontWeight: '600',
    letterSpacing: 1,
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