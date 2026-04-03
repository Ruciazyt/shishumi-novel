import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha } from '../constants/colors';
import {
  getApiKey, setApiKey, getApiType, setApiType,
  getApiBaseUrl, setApiBaseUrl,
  getModel, setModel,
  getAvailableModels, DEFAULT_MODEL, fetchAvailableModels,
  API_PROVIDERS, type ApiType
} from '../services/api';
import {
  checkForUpdate, showUpdateDialog, downloadAndInstall,
  openReleasePage, getAppVersion, compareVersions,
  type ReleaseInfo
} from '../services/update';
import { DYNASTIES, DYNASTY_WRITING_TIPS } from '../data/dynasties';
import { type DynastyId } from '../types';
import { DynastySelector } from '../components/DynastySelector';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveDynasty } from '../services/storage';

const CUSTOM_DYNASTY_KEY = 'shishumi_custom_dynasty';

export const SettingsScreen: React.FC = () => {
  const { state, dispatch } = useApp();
  const [apiType, setApiTypeState] = useState<ApiType>('qwen');
  const [apiKey, setApiKeyInput] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null);
  const [customDynastyName, setCustomDynastyName] = useState('');
  const [customDynastyInput, setCustomDynastyInput] = useState('');
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const availableModels = models.length > 0 ? models : getAvailableModels(apiType);
  const currentVersion = getAppVersion();

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
      if (type === 'openai') {
        setCustomBaseUrl(url);
      }
      setSelectedModel(model);
      setModels(getAvailableModels(type));
      // Load custom dynasty name if in custom mode
      if (state.dynasty === 'custom') {
        const customName = await AsyncStorage.getItem(CUSTOM_DYNASTY_KEY);
        if (customName) {
          setCustomDynastyName(customName);
          setCustomDynastyInput(customName);
        }
      }
    };
    loadData();
  }, []);

  // 每次进入设置页面时检查更新
  // 使用 sequenceRef 确保只有最新请求能更新 state（防止 re-focus 后旧请求覆盖新数据）
  const sequenceRef = React.useRef(0);
  const checkUpdate = useCallback(async () => {
    const seq = ++sequenceRef.current;
    setCheckingUpdate(true);
    try {
      const release = await checkForUpdate();
      if (seq === sequenceRef.current && release) {
        setLatestRelease(release);
      }
    } finally {
      if (seq === sequenceRef.current) setCheckingUpdate(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkUpdate();
      return () => { sequenceRef.current = -999; }; // 标记为已废弃，阻止进行中旧请求更新 state
    }, [checkUpdate])
  );

  const handleUpdatePress = () => {
    if (!latestRelease) {
      // 没有检测到新版本，手动检查
      checkUpdate();
      return;
    }

    const comparison = compareVersions(currentVersion, latestRelease.version);
    if (comparison > 0) {
      // 有新版本
      const downloadUrl = latestRelease.downloadUrl;
      if (downloadUrl) {
        showUpdateDialog(
          latestRelease,
          () => downloadAndInstall(downloadUrl),
          () => {}
        );
      } else {
        // 没有 APK，直接打开 release 页面
        Alert.alert(
          '发现新版本',
          `${latestRelease.version}\n\n点击确定查看更新详情`,
          [
            { text: '取消', style: 'cancel' },
            {
              text: '确定',
              onPress: () => openReleasePage(latestRelease.htmlUrl),
            },
          ]
        );
      }
    } else {
      // 已是最新版本
      Alert.alert('已是最新版本', `当前版本 ${currentVersion} 已是最新版本`);
    }
  };

  const handleApiTypeChange = async (newType: ApiType) => {
    setApiTypeState(newType);
    await setApiType(newType);
    const newDefault = DEFAULT_MODEL(newType);
    setSelectedModel(newDefault);
    await setModel(newDefault);
    setModels(getAvailableModels(newType));
    if (newType === 'qwen') {
      const qwenUrl = API_PROVIDERS.find(p => p.id === 'qwen')!.baseUrl;
      await setApiBaseUrl(qwenUrl);
    } else if (newType === 'minimax') {
      const minimaxUrl = API_PROVIDERS.find(p => p.id === 'minimax')!.baseUrl;
      await setApiBaseUrl(minimaxUrl);
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
    if (apiType !== 'qwen' && !customBaseUrl.trim()) {
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

  const handleDynastyChange = async (dynastyId: DynastyId) => {
    if (dynastyId === 'custom') {
      // Don't dispatch yet; custom name input handles final save
      return;
    }
    dispatch({ type: 'SET_DYNASTY', payload: dynastyId });
    await saveDynasty(dynastyId);
  };

  const handleSaveCustomDynasty = async () => {
    const name = customDynastyInput.trim();
    if (!name) {
      Alert.alert('错误', '请输入自定义朝代名称');
      return;
    }
    dispatch({ type: 'SET_DYNASTY', payload: 'custom' });
    await saveDynasty('custom');
    await AsyncStorage.setItem(CUSTOM_DYNASTY_KEY, name);
    setCustomDynastyName(name);
  };

  const handleFetchModels = async () => {
    if (!apiKey.trim()) {
      Alert.alert('错误', '请先保存 API 密钥后再获取模型列表');
      return;
    }
    if (!customBaseUrl.trim()) {
      Alert.alert('错误', '请先保存接口地址后再获取模型列表');
      return;
    }
    setFetchingModels(true);
    try {
      const fetched = await fetchAvailableModels(apiKey.trim(), customBaseUrl.trim());
      if (fetched.length === 0) {
        Alert.alert('获取失败', '未能获取到模型列表，请检查 API 地址和密钥是否正确');
      } else {
        setModels(fetched);
        // Auto-select first model if current selection not in list
        if (!fetched.find(m => m.id === selectedModel)) {
          setSelectedModel(fetched[0].id);
          await setModel(fetched[0].id);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '未知错误';
      Alert.alert('获取失败', msg);
    } finally {
      setFetchingModels(false);
    }
  };

  const selectedDynastyDetail = useMemo(
    () => (state.dynasty === 'custom' ? null : DYNASTIES.find(d => d.id === state.dynasty)),
    [state.dynasty]
  );

  // 判断是否有可用更新
  const hasUpdate = latestRelease && compareVersions(currentVersion, latestRelease.version) > 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>设置</Text>
            <Text style={styles.headerSubtitle}>配置与偏好</Text>
          </View>
          <View style={styles.headerDecoration}>
            <Text style={styles.headerDecorationText}>⚙️</Text>
          </View>
        </View>
      </View>

      {/* 版本与更新 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>版本与更新</Text>
        <View style={styles.card}>
          <View style={styles.versionRow}>
            <View>
              <Text style={styles.versionLabel}>当前版本</Text>
              <Text style={styles.versionValue}>v{currentVersion}</Text>
            </View>
            <TouchableOpacity
              style={[styles.updateButton, hasUpdate && styles.updateButtonNew]}
              onPress={handleUpdatePress}
              disabled={checkingUpdate}
            >
              {checkingUpdate ? (
                <ActivityIndicator size="small" color={Colors.textOnVermillion} />
              ) : (
                <Text style={styles.updateButtonText}>
                  {hasUpdate ? `发现新版本 ${latestRelease!.version}` : '检查更新'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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

          {apiType !== 'qwen' && (
            <>
              <View style={{ marginTop: Spacing.md }}>
                <Text style={styles.label}>接口地址 {apiType === 'openai' ? '（OpenAI 兼容）' : ''}</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={apiType === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.minimaxi.com/anthropic/v1'}
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
          {(apiType === 'openai' || apiType === 'minimax') && (
            <TouchableOpacity
              style={styles.fetchModelsButton}
              onPress={handleFetchModels}
              disabled={fetchingModels}
            >
              {fetchingModels ? (
                <ActivityIndicator size="small" color={Colors.textOnVermillion} />
              ) : (
                <Text style={styles.fetchModelsButtonText}>🔄 获取可用模型</Text>
              )}
            </TouchableOpacity>
          )}
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
          <DynastySelector
            selected={state.dynasty as DynastyId}
            onSelect={handleDynastyChange}
          />
          {state.dynasty === 'custom' && (
            <View style={{ marginTop: Spacing.md }}>
              <TextInput
                style={styles.input}
                placeholder="请输入自定义朝代名称，如：架空朝代"
                placeholderTextColor={Colors.textLight}
                value={customDynastyInput}
                onChangeText={setCustomDynastyInput}
                maxLength={20}
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveCustomDynasty}>
                <Text style={styles.saveButtonText}>保存自定义朝代</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* 时代背景详情 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>时代背景详情</Text>
        <View style={styles.card}>
          {state.dynasty === 'custom' ? (
            <View>
              <Text style={styles.detailTitle}>{customDynastyName || '自定义/架空'}</Text>
              <Text style={styles.detailValue}>自定义朝代无预设背景资料，请根据您的创作需求自行设定语言、服饰、建筑和礼仪特征。</Text>
            </View>
          ) : selectedDynastyDetail && (
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
              {DYNASTY_WRITING_TIPS[selectedDynastyDetail.name] && (
                <View style={styles.writingTipsContainer}>
                  <Text style={styles.writingTipsLabel}>写作引导</Text>
                  <Text style={styles.writingTipsText}>{DYNASTY_WRITING_TIPS[selectedDynastyDetail.name]}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        <View style={styles.card}>
          <Text style={styles.aboutText}>史书墨 v{currentVersion}</Text>
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
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  versionValue: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  updateButton: {
    backgroundColor: Colors.paperDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 100,
    alignItems: 'center',
  },
  updateButtonNew: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  updateButtonText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  apiTypeSelector: {
    flexDirection: 'row',
    gap: 8,
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
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
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
    padding: 12,
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
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  modelList: {
    gap: 8,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
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
  fetchModelsButton: {
    backgroundColor: Colors.paperDark,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  fetchModelsButtonText: {
    fontSize: FontSize.sm,
    color: Colors.gold,
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.vermillion,
    marginBottom: Spacing.md,
  },
  detailRow: {
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  writingTipsContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.paperDark,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: ColorsAlpha.goldBorder,
  },
  writingTipsLabel: {
    fontSize: FontSize.xs,
    color: Colors.gold,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  writingTipsText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  aboutText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  aboutSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
