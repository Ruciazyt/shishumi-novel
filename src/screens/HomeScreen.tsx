import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { ProjectCard } from '../components/ProjectCard';
import { DynastySelector } from '../components/DynastySelector';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha } from '../constants/colors';
import { createProject, deleteProject, getProjects } from '../services/storage';
import { countChars } from '../utils/text';
import { Project, RootStackParamList, DynastyId } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const { state, dispatch } = useApp();
  const sortedProjects = useMemo(
    () => [...state.projects].sort((a, b) => b.updatedAt - a.updatedAt),
    [state.projects]
  );

  // 全局统计数据 — 合并为单次 reduce，避免两次遍历 projects 数组
  const stats = useMemo(() => {
    let totalChapters = 0;
    let totalChars = 0;
    for (const p of state.projects) {
      totalChapters += p.chapters.length;
      for (const c of p.chapters) {
        totalChars += countChars(c.content);
      }
    }
    return { totalProjects: state.projects.length, totalChapters, totalChars };
  }, [state.projects]);
  const navigation = useNavigation<NavigationProp>();
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDynasty, setNewDynasty] = useState<DynastyId>('tang');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const projects = await getProjects();
      dispatch({ type: 'SET_PROJECTS', payload: projects });
    } catch (err) {
      console.error('[HomeScreen] refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const handleCreateProject = useCallback(async () => {
    if (!newTitle.trim()) {
      Alert.alert('错误', '请输入书名');
      return;
    }

    setIsCreating(true);
    try {
      const project = await createProject({
        title: newTitle.trim(),
        dynasty: newDynasty,
        description: newDescription.trim(),
        chapters: [],
      });

      dispatch({ type: 'ADD_PROJECT', payload: project });
      setModalVisible(false);
      setNewTitle('');
      setNewDynasty('tang');
      setNewDescription('');
    } catch (err) {
      console.error('[HomeScreen] createProject failed:', err);
      const msg = err instanceof Error ? err.message : '请重试';
      Alert.alert('错误', `创建作品失败：${msg}`);
    } finally {
      setIsCreating(false);
    }
  }, [newTitle, newDynasty, newDescription, dispatch]);

  const handleProjectPress = useCallback((project: Project) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
    navigation.navigate('Project', { projectId: project.id });
  }, [dispatch, navigation]);

  const handleProjectLongPress = useCallback((project: Project) => {
    Alert.alert(
      '删除项目',
      `确定删除《${project.title}》吗？该操作不可恢复。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const ok = await deleteProject(project.id);
              if (!ok) throw new Error('deleteProject returned false');
              dispatch({ type: 'DELETE_PROJECT', payload: project.id });
            } catch (err) {
              console.error('[HomeScreen] deleteProject failed:', err);
              Alert.alert('错误', '删除作品失败，请重试');
            }
          },
        },
      ]
    );
  }, [dispatch]);

  /** FlatList renderItem — useCallback 包装，箭头函数捕获 item 适配 ProjectCard 的 ()=>void 类型 */
  const renderProjectItem = useCallback(
    ({ item }: { item: Project }) => (
      <ProjectCard
        project={item}
        onPress={() => handleProjectPress(item)}
        onLongPress={() => handleProjectLongPress(item)}
      />
    ),
    [handleProjectPress, handleProjectLongPress]
  );

  return (
    <View style={styles.container}>
      {/* Elegant Header - 古籍装帧风格 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>史书墨</Text>
            <Text style={styles.headerSubtitle}>历史小说创作</Text>
          </View>
          <View style={styles.headerDecoration}>
            <Text style={styles.headerDecorationText} accessible={false}>📜</Text>
          </View>
        </View>
        {stats.totalProjects > 0 && (
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>
              {stats.totalProjects}部作品 · {stats.totalChapters}章节 · {stats.totalChars.toLocaleString()}字
            </Text>
          </View>
        )}
      </View>

      {/* 历史探秘入口 */}
      <TouchableOpacity
        style={styles.inspirationBanner}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Inspiration')}
      >
        <View style={styles.inspirationBannerLeft}>
          <Text style={styles.inspirationBannerEmoji} accessible={false}>🔍</Text>
          <View>
            <Text style={styles.inspirationBannerTitle}>历史探秘</Text>
            <Text style={styles.inspirationBannerSubtitle}>野史传说 · 悬案之谜 · 创作灵感</Text>
          </View>
        </View>
        <Text style={styles.inspirationBannerArrow}>→</Text>
      </TouchableOpacity>

      {/* Project List */}
      <FlatList
        data={sortedProjects}
        renderItem={renderProjectItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.vermillion}
            colors={[Colors.vermillion]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyDecoration}>
              <Text style={styles.emptyIcon} accessible={false}>📖</Text>
            </View>
            <Text style={styles.emptyTitle}>墨未落，纸尚新</Text>
            <Text style={styles.emptySubtitle}>点击右下角按钮，开始您的创作</Text>
          </View>
        }
      />

      {/* FAB - 悬浮新建按钮 with elegant design */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
        accessibilityLabel="新建作品"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* 新建作品弹窗 */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>新建作品</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
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
                  value={newTitle}
                  onChangeText={setNewTitle}
                  autoFocus
                  maxLength={50}
                />
                <Text style={styles.charCount}>{newTitle.length}/50</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>时代背景</Text>
                <DynastySelector
                  selected={newDynasty}
                  onSelect={setNewDynasty}
                  layout="horizontal"
                  showSummary
                  customLabel="自定义"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>简介</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="请输入简介（可选）"
                  placeholderTextColor={Colors.textLight}
                  value={newDescription}
                  onChangeText={setNewDescription}
                  multiline
                  maxLength={200}
                />
                <Text style={styles.charCount}>{newDescription.length}/200</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
                onPress={handleCreateProject}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color={Colors.textOnVermillion} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>创建作品</Text>
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
  // 历史探秘入口
  inspirationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ColorsAlpha.goldCardBg,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm + 2,
    marginBottom: Spacing.xs,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.paperDark,
  },
  inspirationBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inspirationBannerEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  inspirationBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.inkDark,
  },
  inspirationBannerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  inspirationBannerArrow: {
    fontSize: 18,
    color: Colors.textLight,
  },

  // Header - 古籍装帧风格
  header: {
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: ColorsAlpha.goldBorder,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.vermillion,
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
    letterSpacing: 2,
  },
  headerDecoration: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: ColorsAlpha.vermillionBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDecorationText: {
    fontSize: 24,
  },
  headerStats: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: ColorsAlpha.goldBorder,
  },
  headerStatsText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    letterSpacing: 1,
  },
  // List
  list: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  // Empty State - 美学设计
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyDecoration: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xxl,
    backgroundColor: ColorsAlpha.vermillionBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    letterSpacing: 2,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    textAlign: 'center',
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
  // Modal
  modalOverlay: {
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
  formGroup: {
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: Spacing.xs,
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