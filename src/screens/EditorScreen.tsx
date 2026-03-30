import React, { useState, useEffect } from 'react';
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
import { Poetry推荐 } from '../components/Poetry推荐';
import { Colors } from '../constants/colors';
import { updateChapter } from '../services/storage';
import { RootStackParamList } from '../types';

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
  const [poetryVisible, setPoetryVisible] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (chapter) {
      setContent(chapter.content);
    }
  }, [chapter?.id]);

  useEffect(() => {
    if (content !== (chapter?.content || '')) {
      setHasUnsavedChanges(true);
    }
  }, [content]);

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
    }
  };

  const handleBack = async () => {
    if (hasUnsavedChanges) {
      await handleSave();
    }
    navigation.goBack();
  };

  const handleInsertText = (text: string) => {
    setContent(prev => prev + '\n\n' + text);
  };

  const handlePoetrySelect = (poetry: string) => {
    setContent(prev => prev + '\n\n' + poetry);
  };

  if (!project || !chapter) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>章节不存在</Text>
      </View>
    );
  }

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
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.saveButton, !hasUnsavedChanges && styles.saveButtonDisabled]}>
            保存
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.editorContainer}>
        <TextInput
          style={styles.editor}
          placeholder="开始写作..."
          placeholderTextColor={Colors.textLight}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setAiVisible(true)}
        >
          <Text style={styles.toolButtonText}>AI助手</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setPoetryVisible(true)}
        >
          <Text style={styles.toolButtonText}>诗词推荐</Text>
        </TouchableOpacity>
      </View>

      <AIAssistant
        visible={aiVisible}
        onClose={() => setAiVisible(false)}
        onInsertText={handleInsertText}
      />

      <Poetry推荐
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
    marginHorizontal: 16,
  },
  saveButton: {
    fontSize: 16,
    color: Colors.vermillion,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: Colors.textLight,
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
    paddingHorizontal: 16,
    backgroundColor: Colors.backgroundCard,
  },
  toolButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    backgroundColor: Colors.paperDark,
    borderRadius: 8,
  },
  toolButtonText: {
    fontSize: 14,
    color: Colors.vermillion,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 60,
  },
});
