import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { getApiKey, setApiKey, getModel, setModel, AVAILABLE_MODELS, DEFAULT_MODEL } from '../services/api';
import { DYNASTIES } from '../data/dynasties';
import { saveDynasty } from '../services/storage';

export const SettingsScreen: React.FC = () => {
  const { state, dispatch } = useApp();
  const [apiKey, setApiKeyInput] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

  useEffect(() => {
    const loadData = async () => {
      const [key, model] = await Promise.all([getApiKey(), getModel()]);
      if (key) setApiKeyInput(key);
      setSelectedModel(model);
    };
    loadData();
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('错误', '请输入API密钥');
      return;
    }
    await setApiKey(apiKey.trim());
    Alert.alert('成功', 'API密钥已保存');
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    await setModel(modelId);
  };

  const handleDynastyChange = async (dynastyId: string) => {
    dispatch({ type: 'SET_DYNASTY', payload: dynastyId });
    await saveDynasty(dynastyId);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>设置</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API 配置</Text>
        <View style={styles.card}>
          <Text style={styles.label}>通义千问 API Key</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="请输入API密钥"
              placeholderTextColor={Colors.textLight}
              value={apiKey}
              onChangeText={setApiKeyInput}
              secureTextEntry={!apiKeyVisible}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.visibilityButton}
              onPress={() => setApiKeyVisible(!apiKeyVisible)}
            >
              <Text style={styles.visibilityButtonText}>
                {apiKeyVisible ? '隐藏' : '显示'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveApiKey}>
            <Text style={styles.saveButtonText}>保存密钥</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>模型选择</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>不同模型在速度、费用和生成质量上有差异</Text>
          <View style={styles.modelList}>
            {AVAILABLE_MODELS.map(model => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelItem,
                  selectedModel === model.id && styles.modelItemActive,
                ]}
                onPress={() => handleModelChange(model.id)}
              >
                <Text
                  style={[
                    styles.modelName,
                    selectedModel === model.id && styles.modelNameActive,
                  ]}
                >
                  {model.name}
                </Text>
                {selectedModel === model.id && (
                  <Text style={styles.modelCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>默认时代背景</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>选择默认时代后，AI将根据该时代特征进行调整</Text>
          <View style={styles.dynastyList}>
            {DYNASTIES.map(dynasty => (
              <TouchableOpacity
                key={dynasty.id}
                style={[
                  styles.dynastyItem,
                  state.dynasty === dynasty.id && styles.dynastyItemActive,
                ]}
                onPress={() => handleDynastyChange(dynasty.id)}
              >
                <Text
                  style={[
                    styles.dynastyName,
                    state.dynasty === dynasty.id && styles.dynastyNameActive,
                  ]}
                >
                  {dynasty.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>时代背景详情</Text>
        <View style={styles.card}>
          {DYNASTIES.filter(d => d.id === state.dynasty).map(dynasty => (
            <View key={dynasty.id}>
              <Text style={styles.detailTitle}>{dynasty.name}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>语言特点：</Text>
                <Text style={styles.detailValue}>{dynasty.languageFeatures}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>服饰特征：</Text>
                <Text style={styles.detailValue}>{dynasty.clothingFeatures}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>建筑风格：</Text>
                <Text style={styles.detailValue}>{dynasty.architectureFeatures}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>礼仪制度：</Text>
                <Text style={styles.detailValue}>{dynasty.etiquetteFeatures}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        <View style={styles.card}>
          <Text style={styles.aboutText}>史书墨 v0.1.0</Text>
          <Text style={styles.aboutSubtext}>历史小说AI辅助创作工具</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  visibilityButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.paperDark,
    borderRadius: 8,
  },
  visibilityButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  saveButton: {
    backgroundColor: Colors.vermillion,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: Colors.textOnVermillion,
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 12,
  },
  modelList: {
    gap: 8,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modelItemActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  modelName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modelNameActive: {
    color: Colors.textOnVermillion,
    fontWeight: '600',
  },
  modelCheck: {
    fontSize: 14,
    color: Colors.textOnVermillion,
    fontWeight: 'bold',
  },
  dynastyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dynastyItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dynastyItemActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  dynastyName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dynastyNameActive: {
    color: Colors.textOnVermillion,
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.vermillion,
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  aboutText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  aboutSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
