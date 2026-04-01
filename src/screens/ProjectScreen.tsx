import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { ChapterList } from '../components/ChapterList';
import { Colors } from '../constants/colors';
import { addChapter, updateChapter, deleteChapter } from '../services/storage';
import { DYNASTIES, getDynastyById } from '../data/dynasties';
import { Chapter } from '../types';
import { RootStackParamList } from '../types';

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
    () => getDynastyById(project.dynasty) || DYNASTIES.find(d => d.name === project.dynasty),
    [project.dynasty]
  );

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
            await deleteChapter(project.id, chapter.id);
            const updatedProject = {
              ...project,
              chapters: project.chapters.filter(c => c.id !== chapter.id),
            };
            dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
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
      }
    }

    setChapterModalVisible(false);
    setChapterTitle('');
    setEditingChapter(null);
  }, [chapterTitle, editingChapter, dispatch, project]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {project.title}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.projectInfo}>
        <View style={styles.projectInfoTop}>
          <Text style={styles.dynasty}>{dynastyData?.name || project.dynasty}</Text>
          <TouchableOpacity
            style={styles.dynastyInfoBtn}
            onPress={() => setDynastyModalVisible(true)}
          >
            <Text style={styles.dynastyInfoBtnText}>ℹ️ 时代背景</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {project.description || '暂无简介'}
        </Text>
      </View>

      <ChapterList
        chapters={project.chapters}
        onChapterPress={handleChapterPress}
        onChapterLongPress={handleChapterLongPress}
      />

      {/* FAB - 右下角悬浮新建章节按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddChapter}
        activeOpacity={0.8}
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
                {dynastyData ? `${dynastyData.name} 时代背景` : project.dynasty}
              </Text>
              <TouchableOpacity onPress={() => setDynastyModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            {dynastyData ? (
              <View style={styles.dynastyDetails}>
                <View style={styles.dynastyDetailItem}>
                  <Text style={styles.dynastyDetailLabel}>语言特点</Text>
                  <Text style={styles.dynastyDetailValue}>{dynastyData.languageFeatures}</Text>
                </View>
                <View style={styles.dynastyDetailItem}>
                  <Text style={styles.dynastyDetailLabel}>服饰特征</Text>
                  <Text style={styles.dynastyDetailValue}>{dynastyData.clothingFeatures}</Text>
                </View>
                <View style={styles.dynastyDetailItem}>
                  <Text style={styles.dynastyDetailLabel}>建筑风格</Text>
                  <Text style={styles.dynastyDetailValue}>{dynastyData.architectureFeatures}</Text>
                </View>
                <View style={styles.dynastyDetailItem}>
                  <Text style={styles.dynastyDetailLabel}>礼仪制度</Text>
                  <Text style={styles.dynastyDetailValue}>{dynastyData.etiquetteFeatures}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noDynastyText}>暂无时代背景数据</Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={chapterModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingChapter ? '编辑章节' : '新建章节'}
              </Text>
              <TouchableOpacity onPress={() => setChapterModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
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

            <TouchableOpacity style={styles.submitButton} onPress={handleSaveChapter}>
              <Text style={styles.submitButtonText}>
                {editingChapter ? '保存' : '创建'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 60,
  },
  projectInfo: {
    padding: 16,
    backgroundColor: Colors.paperDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  projectInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dynasty: {
    fontSize: 14,
    color: Colors.vermillion,
  },
  dynastyInfoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dynastyInfoBtnText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.vermillion,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.textOnVermillion,
    fontWeight: '300',
    lineHeight: 30,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 60,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  dynastyModalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  dynastyDetails: {
    gap: 16,
  },
  dynastyDetailItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 12,
  },
  dynastyDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.vermillion,
    marginBottom: 4,
  },
  dynastyDetailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  noDynastyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  submitButton: {
    backgroundColor: Colors.vermillion,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.textOnVermillion,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
