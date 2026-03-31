import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { ProjectCard } from '../components/ProjectCard';
import { Colors } from '../constants/colors';
import { DYNASTIES } from '../data/dynasties';
import { createProject, deleteProject } from '../services/storage';
import { Project, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const { state, dispatch } = useApp();
  const sortedProjects = useMemo(
    () => [...state.projects].sort((a, b) => b.updatedAt - a.updatedAt),
    [state.projects]
  );
  const navigation = useNavigation<NavigationProp>();
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDynasty, setNewDynasty] = useState('tang');
  const [newDescription, setNewDescription] = useState('');

  const handleCreateProject = async () => {
    if (!newTitle.trim()) {
      Alert.alert('错误', '请输入书名');
      return;
    }

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
  };

  const handleProjectPress = (project: Project) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
    navigation.navigate('Project', { projectId: project.id });
  };

  const handleProjectLongPress = (project: Project) => {
    Alert.alert(
      '删除项目',
      `确定要删除《${project.title}》吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteProject(project.id);
            dispatch({ type: 'DELETE_PROJECT', payload: project.id });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>史书墨</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={sortedProjects}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => handleProjectPress(item)}
            onLongPress={() => handleProjectLongPress(item)}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>暂无作品</Text>
            <Text style={styles.emptySubtitle}>点击右下角新建作品开始创作</Text>
          </View>
        }
      />

      {/* FAB - 右下角悬浮新建按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

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
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
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
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>时代背景</Text>
                <View style={styles.dynastySelector}>
                  {DYNASTIES.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={[
                        styles.dynastyButton,
                        newDynasty === d.id && styles.dynastyButtonActive,
                      ]}
                      onPress={() => setNewDynasty(d.id)}
                    >
                      <Text
                        style={[
                          styles.dynastyButtonText,
                          newDynasty === d.id && styles.dynastyButtonTextActive,
                        ]}
                      >
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleCreateProject}>
                <Text style={styles.submitButtonText}>创建作品</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  headerRight: {
    width: 60,
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
  list: {
    padding: 16,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalScroll: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalScrollContent: {
    paddingBottom: 40,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dynastySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dynastyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dynastyButtonActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  dynastyButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dynastyButtonTextActive: {
    color: Colors.textOnVermillion,
  },
  submitButton: {
    backgroundColor: Colors.vermillion,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: Colors.textOnVermillion,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
