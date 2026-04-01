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
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha } from '../constants/colors';
import {
  getApiKey, setApiKey, getApiType, setApiType,
  getApiBaseUrl, setApiBaseUrl,
  getModel, setModel,
  getAvailableModels, DEFAULT_MODEL,
  API_PROVIDERS, type ApiType
} from '../services/api';
import { DYNASTIES } from '../data/dynasties';
import { saveDynasty } from '../services/storage';

export const SettingsScreen: React.FC = () => {
  const { state, dispatch } = useApp();
  const [apiType, setApiTypeState] = useState<ApiType>('qwen');
  const [apiKey, setApiKeyInput] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const availableModels = getAvailableModels(apiType);

  useEffect(() => {
    const loadData = async () => {
      const [type, key, url, model] = await Promise.all([
        getApiType(),
        getApiKey(),
        getApiBaseUrl(),
        getModel(),
      ]);
      setApiTypeState(type);
      if (key) setApiKeyInput(key);
      // 如果是 OpenAI 类型，显示自定义 URL
      if (type === 'openai') {
        setCustomBaseUrl(url);
      }
      setSelectedModel(model);
    };
    loadData();
  }, []);

  const handleApiTypeChange = async (newType: ApiType) => {
    setApiTypeState(newType);
    await setApiType(newType);
    // 切换后重置模型为默认值
    const newDefault = DEFAULT_MODEL(newType);
    setSelectedModel(newDefault);
    await setModel(newDefault);
    // 如果切换到千问，设置默认 URL
    if (newType === 'qwen') {
      const qwenUrl = API_PROVIDERS.find(p => p.id === 'qwen')!.baseUrl;
      await setApiBaseUrl(qwenUrl);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('错误', '请输入API密钥');
      return;
    }
    await setApiKey(apiKey.trim());
    Alert.alert('成功', 'API密钥已保存');
  };

  const handleSaveCustomUrl = async () => {
    if (apiType === 'openai' && !customBaseUrl.trim()) {
      Alert.alert('错误', '请输入API接口地址');
      return;
    }
    await setApiBaseUrl(customBaseUrl.trim());
    Alert.alert('成功', '接口地址已保存');
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    await setModel(modelId);
  };

  const handleDynastyChange = async (dynastyId: string) => {
    dispatch({ type: 'SET_DYNASTY', payload: dynastyId });
    await saveDynasty(dynastyId);
  };

  const selectedDynastyDetail = DYNASTIES.find(d => d.id === state.dynasty);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>设置</Text>
      </View>

      {/* API 类型选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API 接口类型</Text>
        <View style={styles.card}>
          <View style={styles.apiTypeSelector}>
            {API_PROVIDERS.map(provider => (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.apiTypeItem,
                  apiType === provider.id && styles.apiTypeItemActive,
                ]}
                onPress={() => handleApiTypeChange(provider.id as ApiType)}
              >
                <Text
                  style={[
                    styles.apiTypeName,
                    apiType === provider.id && styles.apiTypeNameActive,
                  ]}
                >
                  {provider.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* API 配置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API 配置</Text>
        <View style={styles.card}>
          <Text style={styles.label}>API Key</Text>
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

          {/* OpenAI 类型需要自定义 URL */}
          {apiType === 'openai' && (
            <>
              <View style={[styles.label, { marginTop: Spacing.lg }]}>
                <Text style={styles.labelText}>接口地址（OpenAI 兼容）</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="https://api.openai.com/v1/chat/completions"
                placeholderTextColor={Colors.textLight}
                value={customBaseUrl}
                onChangeText={setCustomBaseUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveCustomUrl}>
                <Text style={styles.saveButtonText}>保存接口地址</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* 模型选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>模型选择</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>
            {apiType === 'qwen'
              ? '不同模型在速度、费用和生成质量上有差异'
              : '选择您的 API 提供商支持的模型'}
          </Text>
          <View style={styles.modelList}>
            {availableModels.map(model => (
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
                  numberOfLines={1}
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

      {/* 默认时代背景 */}
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

      {/* 时代背景详情 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>时代背景详情</Text>
        <View style={styles.card}>
          {selectedDynastyDetail && (
            <View>
              <Text style={styles.detailTitle}>{selectedDynastyDetail.name}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>语言特点：</Text>
                <Text style={styles.detailValue}>{selectedDynastyDetail.languageFeatures}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>服饰特征：</Text>
                <Text style={styles.detailValue}>{selectedDynastyDetail.clothingFeatures}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>建筑风格：</Text>
                <Text style={styles.detailValue}>{selectedDynastyDetail.architectureFeatures}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>礼仪制度：</Text>
                <Text style={styles.detailValue}>{selectedDynastyDetail.etiquetteFeatures}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 关于 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        <View style={styles.card}>
          <Text style={styles.aboutText}>史书墨 v1.0.1</Text>
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
    padding: Spacing.lg,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: ColorsAlpha.goldBorder,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: ColorsAlpha.goldBorder,
  },
  // API Type Selector
  apiTypeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  apiTypeItem: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  apiTypeItemActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  apiTypeName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  apiTypeNameActive: {
    color: Colors.textOnVermillion,
    fontWeight: '600',
  },
  // API Config
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  labelText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '500',
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
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  visibilityButton: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.paperDark,
    borderRadius: BorderRadius.md,
  },
  visibilityButtonText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  saveButton: {
    backgroundColor: Colors.vermillion,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonText: {
    color: Colors.textOnVermillion,
    fontSize: FontSize.md,
    fontWeight: '600',
    letterSpacing: 2,
  },
  // Model List
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  modelList: {
    gap: Spacing.sm,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modelItemActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  modelName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  modelNameActive: {
    color: Colors.textOnVermillion,
    fontWeight: '600',
  },
  modelCheck: {
    fontSize: FontSize.sm,
    color: Colors.textOnVermillion,
    fontWeight: 'bold',
  },
  // Dynasty List
  dynastyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  dynastyItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dynastyItemActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  dynastyName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  dynastyNameActive: {
    color: Colors.textOnVermillion,
    fontWeight: '600',
  },
  // Detail
  detailTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.vermillion,
    marginBottom: Spacing.md,
  },
  detailRow: {
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  // About
  aboutText: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  aboutSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});