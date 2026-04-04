import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { ChapterList } from '../components/ChapterList';
import { DynastyBadge } from '../components/DynastyBadge';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha } from '../constants/colors';
import { addChapter, updateChapter, deleteChapter, updateProject, CUSTOM_DYNASTY_KEY } from '../services/storage';
import { countChars } from '../utils/text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDynastyById, DYNASTY_WRITING_TIPS } from '../data/dynasties';
import { Chapter, DynastyId, RootStackParamList } from '../types';
import { DynastySelector } from '../components/DynastySelector';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProjectScreenRouteProp = RouteProp<RootStackParamList, 'Project'>;

export const ProjectScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProjectScreenRouteProp>();
  const { state, dispatch } = useApp();
  const project = state.currentProject;

  const [chapterModalVisible, setChapterModalVisible] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [dynastyModalVisible, setDynastyModalVisible] = useState(false);
  const [isSavingChapter, setIsSavingChapter] = useState(false);

  // Project edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDynasty, setEditDynasty] = useState<DynastyId>('tang');
  const [editCustomDynastyName, setEditCustomDynastyName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);
  // Loading state for edit project modal: prevents async race that causes empty custom dynasty name flash
  const [isLoadingEditModal, setIsLoadingEditModal] = useState(false);

  if (!project) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>项目不存在</Text>
      </View>
    );
  }

  // Derive dynasty metadata once per project (stable reference — project never
  // mutates, only gets replaced on update).
  const dynastyData = useMemo(
    () => getDynastyById(project.dynasty),
    [project.dynasty]
  );

  // Derived project stats — memoized to avoid recalc on every render
  const projectStats = useMemo(() => {
    const chapterCount = project.chapters.length;
    const wordCount = project.chapters.reduce(
      (sum, ch) => sum + countChars(ch.content), 0
    );
    return { chapterCount, wordCount };
  }, [project.chapters]);

  const handleChapterPress = useCallback(
    (chapter: Chapter) => {
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
      navigation.navigate('Editor', { chapterId: chapter.id });
    },
    [dispatch, navigation, project]
  );

  const handleChapterLongPress = useCallback(
    (chapter: Chapter) => {
      Alert.alert('章节操作', `《${chapter.title}》`, [
        { text: '取消', style: 'cancel' },
        {
          text: '编辑',
          onPress: () => {
            setEditingChapter(chapter);
            setChapterTitle(chapter.title);
            setChapterModalVisible(true);
          },
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const ok = await deleteChapter(project.id, chapter.id);
              if (!ok) throw new Error('deleteChapter returned false');
              // delete 成功后才更新 UI，避免失败时留下不一致状态
              const updatedProject = {
                ...project,
                chapters: project.chapters.filter(c => c.id !== chapter.id),
              };
              dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
            } catch (err) {
              console.error('[ProjectScreen] deleteChapter failed:', err);
              Alert.alert('错误', '删除章节失败，请重试');
            }
          },
        },
      ]);
    },
    [dispatch, project]
  );

  const handleAddChapter = useCallback(() => {
    setEditingChapter(null);
    setChapterTitle('');
    setChapterModalVisible(true);
  }, []);

  const handleSaveChapter = useCallback(async () => {
    if (!chapterTitle.trim()) {
      Alert.alert('错误', '请输入章节标题');
      return;
    }

    setIsSavingChapter(true);
    try {
      if (editingChapter) {
        const updated = await updateChapter(project.id, editingChapter.id, {
          title: chapterTitle.trim(),
          content: editingChapter?.content ?? '',
        });
        if (updated) {
          const updatedProject = {
            ...project,
            chapters: project.chapters.map(c =>
              c.id === editingChapter.id ? updated : c
            ),
          };
          dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
        } else {
          Alert.alert('错误', '保存章节失败，请重试');
          setIsSavingChapter(false);
          return;
        }
      } else {
        const newChapter = await addChapter(project.id, {
          title: chapterTitle.trim(),
          content: '',
        });
        if (newChapter) {
          const updatedProject = {
            ...project,
            chapters: [...project.chapters, newChapter],
          };
          dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
        } else {
          Alert.alert('错误', '创建章节失败，请重试');
          setIsSavingChapter(false);
          return;
        }
      }

      setChapterModalVisible(false);
      setChapterTitle('');
      setEditingChapter(null);
    } finally {
      setIsSavingChapter(false);
    }
  }, [chapterTitle, editingChapter, dispatch, project]);

  /** 打开项目编辑弹窗，初始化表单数据 */
  const handleEditProject = useCallback(async () => {
    setIsLoadingEditModal(true);
    setEditTitle(project.title);
    setEditDynasty(project.dynasty as DynastyId);
    setEditDescription(project.description);
    if ((project.dynasty as string) === 'custom') {
      // Await before opening modal to prevent empty dynasty name flash
      const name = await AsyncStorage.getItem(CUSTOM_DYNASTY_KEY);
      setEditCustomDynastyName(name || '');
    } else {
      setEditCustomDynastyName('');
    }
    setEditModalVisible(true);
    setIsLoadingEditModal(false);
  }, [project]);

  /** 保存项目编辑 */
  const handleSaveProject = useCallback(async () => {
    if (!editTitle.trim()) {
      Alert.alert('错误', '请输入书名');
      return;
    }
    const dynastyToSave: DynastyId = editDynasty === 'custom' ? 'custom' : editDynasty;
    setIsSavingProject(true);
    try {
      const updated = await updateProject(project.id, {
        title: editTitle.trim(),
        dynasty: dynastyToSave,
        description: editDescription.trim(),
      });
      if (updated) {
        if (editDynasty === 'custom') {
          await AsyncStorage.setItem(CUSTOM_DYNASTY_KEY, editCustomDynastyName.trim() || '自定义朝代');
        }
        dispatch({ type: 'UPDATE_PROJECT', payload: updated });
        setEditModalVisible(false);
      } else {
        Alert.alert('错误', '保存失败，请重试');
      }
    } finally {
      setIsSavingProject(false);
    }
  }, [editTitle, editDynasty, editCustomDynastyName, editDescription, dispatch, project.id]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {project.title}
        </Text>
        <TouchableOpacity
          onPress={handleEditProject}
          style={styles.editButton}
          disabled={isLoadingEditModal}
          accessibilityLabel="编辑项目"
          accessibilityRole="button"
        >
          <Text style={styles.editButtonText}>
            {isLoadingEditModal ? '加载中' : '编辑'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Project Info - 时代背景信息 */}
      <View style={styles.projectInfo}>
        <View style={styles.projectInfoContent}>
          <DynastyBadge
            variant="dynasty"
            name={dynastyData?.name || (project.dynasty === 'custom' ? '自定义/架空' : project.dynasty)}
          />
          <Text style={styles.description} numberOfLines={2}>
            {project.description || '暂无简介'}
          </Text>
          {projectStats.chapterCount > 0 && (
            <View style={styles.projectStatsRow}>
              <Text style={styles.projectStatsText}>
                📄 {projectStats.chapterCount}章节
              </Text>
              <Text style={styles.projectStatsText}>
                ✍️ {projectStats.wordCount.toLocaleString()}字
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.dynastyInfoBtn}
          onPress={() => setDynastyModalVisible(true)}
          accessibilityLabel="查看时代背景详情"
          accessibilityRole="button"
        >
          <Text style={styles.dynastyInfoBtnText}>时代背景</Text>
        </TouchableOpacity>
      </View>

      {/* Chapter List */}
      <ChapterList
        chapters={project.chapters}
        onChapterPress={handleChapterPress}
        onChapterLongPress={handleChapterLongPress}
      />

      {/* FAB - 右下角悬浮新建章节按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddChapter}
        activeOpacity={0.85}
        accessibilityLabel="新建章节"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* 时代背景详情弹窗 */}
      <Modal visible={dynastyModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDynastyModalVisible(false)}
          />
          <View style={styles.dynastyModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {dynastyData ? `${dynastyData.name} 时代背景` : (project.dynasty === 'custom' ? '自定义/架空 时代背景' : project.dynasty)}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDynastyModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {dynastyData ? (
              <ScrollView style={styles.dynastyTipsScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.dynastyWritingTips}>{DYNASTY_WRITING_TIPS[dynastyData.name] || ''}</Text>
              </ScrollView>
            ) : (
              <Text style={styles.noDynastyText}>暂无时代背景数据</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* 章节创建/编辑弹窗 */}
      <Modal visible={chapterModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setChapterModalVisible(false);
              setEditingChapter(null);
              setChapterTitle('');
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingChapter ? '编辑章节' : '新建章节'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setChapterModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>章节标题</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入章节标题"
                placeholderTextColor={Colors.textLight}
                value={chapterTitle}
                onChangeText={setChapterTitle}
                autoFocus
                maxLength={50}
              />
              <Text style={styles.charCount}>{chapterTitle.length}/50</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSavingChapter && styles.submitButtonDisabled]}
              onPress={handleSaveChapter}
              disabled={isSavingChapter}
            >
              {isSavingChapter ? (
                <ActivityIndicator color={Colors.textOnVermillion} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingChapter ? '保存' : '创建'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 项目编辑弹窗 */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>编辑作品</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>书名</Text>
                <TextInput
                  style={styles.input}
                  placeholder="请输入书名"
                  placeholderTextColor={Colors.textLight}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  autoFocus
                  maxLength={50}
                />
                <Text style={styles.charCount}>{editTitle.length}/50</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>时代背景</Text>
                <DynastySelector
                  selected={editDynasty}
                  onSelect={setEditDynasty}
                />
                {editDynasty === 'custom' && (
                  <TextInput
                    style={[styles.input, { marginTop: Spacing.sm }]}
                    placeholder="请输入自定义朝代名称"
                    placeholderTextColor={Colors.textLight}
                    value={editCustomDynastyName}
                    onChangeText={setEditCustomDynastyName}
                    maxLength={20}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>简介</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="请输入简介（可选）"
                  placeholderTextColor={Colors.textLight}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  maxLength={200}
                />
                <Text style={styles.charCount}>{editDescription.length}/200</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSavingProject && styles.submitButtonDisabled]}
                onPress={handleSaveProject}
                disabled={isSavingProject}
              >
                {isSavingProject ? (
                  <ActivityIndicator color={Colors.textOnVermillion} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>保存修改</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  editButton: {
    padding: Spacing.xs,
  },
  editButtonText: {
    fontSize: FontSize.md,
    color: Colors.vermillion,
    fontWeight: '500',
  },
  // Project Info - 古籍装帧风格
  projectInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    backgroundColor: Colors.paperDark,
    borderBottomWidth: 1,
    borderBottomColor: ColorsAlpha.goldBorder,
  },
  projectInfoContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  projectStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  projectStatsText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  dynastyInfoBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  dynastyInfoBtnText: {
    fontSize: FontSize.sm,
    color: Colors.gold,
    fontWeight: '500',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.vermillion,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.textOnVermillion,
    fontWeight: '300',
    lineHeight: 30,
  },
  // Error
  errorText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalScroll: {},
  modalScrollContent: {
    paddingBottom: 40,
  },
  dynastyModalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    maxHeight: '60%',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ColorsAlpha.goldBorder,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  dynastyTipsScroll: {
    maxHeight: 400,
  },
  dynastyWritingTips: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  noDynastyText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  // Form
  formGroup: {
    marginBottom: Spacing.md,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.vermillion,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.textOnVermillion,
    fontSize: FontSize.md,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
