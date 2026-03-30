import React, { useState } from 'react';
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
  const [chapterContent, setChapterContent] = useState('');

  if (!project) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>项目不存在</Text>
      </View>
    );
  }

  const handleChapterPress = (chapter: Chapter) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
    navigation.navigate('Editor', { chapterId: chapter.id });
  };

  const handleChapterLongPress = (chapter: Chapter) => {
    Alert.alert('章节操作', `《${chapter.title}》`, [
      { text: '取消', style: 'cancel' },
      {
        text: '编辑',
        onPress: () => {
          setEditingChapter(chapter);
          setChapterTitle(chapter.title);
          setChapterContent(chapter.content);
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
  };

  const handleAddChapter = () => {
    setEditingChapter(null);
    setChapterTitle('');
    setChapterContent('');
    setChapterModalVisible(true);
  };

  const handleSaveChapter = async () => {
    if (!chapterTitle.trim()) {
      Alert.alert('错误', '请输入章节标题');
      return;
    }

    if (editingChapter) {
      const updated = await updateChapter(project.id, editingChapter.id, {
        title: chapterTitle.trim(),
        content: chapterContent,
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
        content: chapterContent,
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
    setChapterContent('');
    setEditingChapter(null);
  };

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
        <Text style={styles.dynasty}>{project.dynasty}</Text>
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
              />
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
  dynasty: {
    fontSize: 14,
    color: Colors.vermillion,
    marginBottom: 4,
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
  formGroup: {
    marginBottom: 16,
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
