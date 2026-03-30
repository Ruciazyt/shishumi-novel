// 写作界面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { AIFeedback } from '../components/AIFeedback';
import { RootStackParamList } from '../types';
import { polishText, getHistoryDetail, recommendPoetry, recommendQuote } from '../services/qwenApi';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Writing'>;
type RouteType = RouteProp<RootStackParamList, 'Writing'>;

type AIFeedbackType = 'polish' | 'history_detail' | 'poetry' | 'quote';

export function WritingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { state, updateChapter, saveChapterVersion } = useApp();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ type: AIFeedbackType; content: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const project = state.projects.find((p) => p.id === route.params.projectId);
  const chapter = project?.chapters.find((c) => c.id === route.params.chapterId);

  useEffect(() => {
    if (chapter) {
      setContent(chapter.content);
    }
  }, [chapter?.id]);

  const handleContentChange = (text: string) => {
    setContent(text);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!project || !chapter) return;
    await saveChapterVersion(project.id, chapter.id, content, 'manual');
    await updateChapter(project.id, { ...chapter, content });
    setHasChanges(false);
    Alert.alert('保存成功', '内容已保存');
  };

  const handleAIOperation = async (type: AIFeedbackType) => {
    if (!content.trim() && type !== 'history_detail') {
      Alert.alert('提示', '请先输入内容');
      return;
    }
    if (!state.settings.apiKey) {
      Alert.alert('提示', '请先在设置中配置通义千问 API Key');
      navigation.navigate('Settings');
      return;
    }

    setLoading(true);
    setAiResult(null);
    try {
      let result: string;
      switch (type) {
        case 'polish':
          result = await polishText(state.settings.apiKey, content, project?.era);
          break;
        case 'history_detail':
          result = await getHistoryDetail(state.settings.apiKey, content, project?.era);
          break;
        case 'poetry':
          result = await recommendPoetry(state.settings.apiKey, content, project?.era);
          break;
        case 'quote':
          result = await recommendQuote(state.settings.apiKey, content);
          break;
        default:
          return;
      }
      setAiResult({ type, content: result });
    } catch (error: any) {
      Alert.alert('AI 处理失败', error.message || '请检查 API Key 和网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyResult = async () => {
    if (!aiResult || !project || !chapter) return;
    
    if (aiResult.type === 'polish') {
      setContent(aiResult.content);
      setHasChanges(true);
      await saveChapterVersion(project.id, chapter.id, aiResult.content, 'ai_edit');
      await updateChapter(project.id, { ...chapter, content: aiResult.content });
    }
    setAiResult(null);
  };

  const getButtonLabel = (type: AIFeedbackType) => {
    const labels: Record<AIFeedbackType, string> = {
      polish: '✨ 润色',
      history_detail: '📜 历史细节',
      poetry: '📝 诗词推荐',
      quote: '☸️ 经典引用',
    };
    return labels[type];
  };

  if (!project || !chapter) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>章节不存在</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{chapter.title}</Text>
        <TouchableOpacity style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]} onPress={handleSave}>
          <Text style={[styles.saveBtnText, !hasChanges && styles.saveBtnTextDisabled]}>保存</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView style={styles.editorContainer} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.editor}
            value={content}
            onChangeText={handleContentChange}
            placeholder="开始创作..."
            placeholderTextColor="#A09080"
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={styles.aiPanel}>
          <Text style={styles.aiPanelTitle}>AI 辅助</Text>
          <View style={styles.aiButtons}>
            {(['polish', 'history_detail', 'poetry', 'quote'] as AIFeedbackType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.aiBtn}
                onPress={() => handleAIOperation(type)}
                disabled={loading}
              >
                <Text style={styles.aiBtnText}>{getButtonLabel(type)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#8B7355" />
            <Text style={styles.loadingText}>AI 处理中...</Text>
          </View>
        )}

        {aiResult && (
          <AIFeedback
            type={aiResult.type}
            content={aiResult.content}
            onApply={aiResult.type === 'polish' ? handleApplyResult : undefined}
            onClose={() => setAiResult(null)}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#E8DCC8',
    borderBottomWidth: 1,
    borderBottomColor: '#D4C4A8',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backBtnText: {
    fontSize: 14,
    color: '#8B7355',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D2914',
  },
  saveBtn: {
    backgroundColor: '#8B7355',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveBtnDisabled: {
    backgroundColor: '#D4C4A8',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
  },
  saveBtnTextDisabled: {
    color: '#A09080',
  },
  content: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  editor: {
    flex: 1,
    backgroundColor: '#FFFEF5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#3D2914',
    lineHeight: 28,
    minHeight: 400,
    borderWidth: 1,
    borderColor: '#D4C4A8',
    textAlignVertical: 'top',
  },
  aiPanel: {
    backgroundColor: '#E8DCC8',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#D4C4A8',
  },
  aiPanelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D2914',
    marginBottom: 10,
  },
  aiButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  aiBtn: {
    backgroundColor: '#8B7355',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  aiBtnText: {
    color: '#FFF',
    fontSize: 13,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245,239,224,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B7355',
  },
  errorText: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
    marginTop: 40,
  },
});
