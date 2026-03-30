// 资料查阅界面
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../types';
import { ERAS } from '../utils/constants';
import { queryEra, getHistoryDetail, recommendPoetry, recommendQuote } from '../services/qwenApi';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Reference'>;
type RouteType = RouteProp<RootStackParamList, 'Reference'>;

export function ReferenceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { state } = useApp();

  const project = route.params?.projectId
    ? state.projects.find((p) => p.id === route.params.projectId)
    : null;

  const [mode, setMode] = useState<'era' | 'detail' | 'poetry' | 'quote'>('era');
  const [eraInput, setEraInput] = useState(project?.era || '');
  const [detailInput, setDetailInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!state.settings.apiKey) {
      Alert.alert('提示', '请先在设置中配置通义千问 API Key');
      navigation.navigate('Settings');
      return;
    }

    if (mode === 'era' && !eraInput.trim()) {
      Alert.alert('提示', '请输入要查询的时代');
      return;
    }
    if (mode === 'detail' && !detailInput.trim()) {
      Alert.alert('提示', '请输入要查询的历史细节描述');
      return;
    }
    if (mode === 'poetry' && !detailInput.trim()) {
      Alert.alert('提示', '请输入场景描述');
      return;
    }
    if (mode === 'quote' && !detailInput.trim()) {
      Alert.alert('提示', '请输入场景描述');
      return;
    }

    setLoading(true);
    setResult('');
    try {
      let res: string;
      switch (mode) {
        case 'era':
          res = await queryEra(state.settings.apiKey, eraInput.trim());
          break;
        case 'detail':
          res = await getHistoryDetail(state.settings.apiKey, detailInput.trim(), eraInput.trim() || undefined);
          break;
        case 'poetry':
          res = await recommendPoetry(state.settings.apiKey, detailInput.trim(), eraInput.trim() || undefined);
          break;
        case 'quote':
          res = await recommendQuote(state.settings.apiKey, detailInput.trim());
          break;
        default:
          return;
      }
      setResult(res);
    } catch (error: any) {
      Alert.alert('查询失败', error.message || '请检查 API Key 和网络连接');
    } finally {
      setLoading(false);
    }
  };

  const getModeLabel = (m: typeof mode) => {
    const labels: Record<typeof mode, string> = {
      era: '📖 时代背景',
      detail: '📜 历史细节',
      poetry: '📝 诗词推荐',
      quote: '☸️ 经典引用',
    };
    return labels[m];
  };

  const getModeHint = (m: typeof mode) => {
    const hints: Record<typeof mode, string> = {
      era: '查询朝代的历史背景、社会风貌、文化特色等',
      detail: '输入需要的场景描述，如"宫廷宴会"、"战场厮杀"等',
      poetry: '根据场景情绪推荐适合引用的古诗词',
      quote: '根据场景推荐佛道经典语句',
    };
    return hints[m];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>资料查阅</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.modeSelector}>
        {(['era', 'detail', 'poetry', 'quote'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
              {getModeLabel(m)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {project && (
          <View style={styles.projectInfo}>
            <Text style={styles.projectLabel}>当前项目：</Text>
            <Text style={styles.projectName}>{project.title}</Text>
            <Text style={styles.projectEra}>（{project.era}）</Text>
          </View>
        )}

        <Text style={styles.hint}>{getModeHint(mode)}</Text>

        {(mode === 'era' || mode === 'detail' || mode === 'poetry') && (
          <>
            <Text style={styles.inputLabel}>时代背景（可选）</Text>
            <TouchableOpacity
              style={styles.eraPicker}
              onPress={() => {
                Alert.alert('选择朝代', ERAS.map((e) => e).join('\n'), [
                  ...ERAS.map((era) => ({
                    text: era,
                    onPress: () => setEraInput(era),
                  })),
                  { text: '取消', style: 'cancel' as const },
                ]);
              }}
            >
              <Text style={styles.eraPickerText}>{eraInput || '点击选择朝代'}</Text>
            </TouchableOpacity>
          </>
        )}

        {mode !== 'era' && (
          <>
            <Text style={styles.inputLabel}>场景描述</Text>
            <TextInput
              style={styles.textArea}
              value={detailInput}
              onChangeText={setDetailInput}
              placeholder="请输入场景描述..."
              placeholderTextColor="#A09080"
              multiline
              numberOfLines={4}
            />
          </>
        )}

        {mode === 'era' && (
          <>
            <Text style={styles.inputLabel}>查询的时代</Text>
            <TextInput
              style={styles.input}
              value={eraInput}
              onChangeText={setEraInput}
              placeholder="如：唐朝、明朝、春秋等"
              placeholderTextColor="#A09080"
            />
          </>
        )}

        <TouchableOpacity style={styles.queryBtn} onPress={handleQuery} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.queryBtnText}>查询</Text>
          )}
        </TouchableOpacity>

        {result && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>查询结果</Text>
            <Text style={styles.resultContent}>{result}</Text>
          </View>
        )}
      </ScrollView>
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
    textAlign: 'center',
  },
  placeholder: {
    width: 60,
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFF8E7',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: '#F5EFE0',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#8B7355',
  },
  modeBtnText: {
    fontSize: 11,
    color: '#8B7355',
    textAlign: 'center',
  },
  modeBtnTextActive: {
    color: '#FFF',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  projectLabel: {
    fontSize: 13,
    color: '#8B7355',
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D2914',
  },
  projectEra: {
    fontSize: 12,
    color: '#8B7355',
    marginLeft: 4,
  },
  hint: {
    fontSize: 13,
    color: '#8B7355',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D2914',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D4C4A8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#3D2914',
    marginBottom: 16,
  },
  eraPicker: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D4C4A8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  eraPickerText: {
    fontSize: 16,
    color: '#3D2914',
  },
  textArea: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D4C4A8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#3D2914',
    marginBottom: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  queryBtn: {
    backgroundColor: '#8B7355',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  queryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#FFFEF5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4C4A8',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3D2914',
    marginBottom: 12,
  },
  resultContent: {
    fontSize: 14,
    color: '#5D4E3A',
    lineHeight: 24,
  },
});
