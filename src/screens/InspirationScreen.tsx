import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, LayoutAnimation, Platform, UIManager,
  TextInput, ActivityIndicator, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { INSPIRATIONS, CATEGORIES, DYNASTIES_FILTER, type Inspiration } from '../data/inspirations';
import { callAI } from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha } from '../constants/colors';
import { InspirationCard, FilterChipRow } from '../components/InspirationCard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function parseAIResult(text: string): Inspiration | null {
  try {
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);
    if (!parsed.title || !parsed.dynasty || !parsed.category) return null;

    return {
      id: `ai-${Date.now()}`,
      title: parsed.title,
      dynasty: parsed.dynasty,
      category: parsed.category,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      historicalFacts: Array.isArray(parsed.historicalFacts) ? parsed.historicalFacts.slice(0, 5) : [],
      folkVersions: Array.isArray(parsed.folkVersions) ? parsed.folkVersions.slice(0, 5) : [],
      creativeAngles: Array.isArray(parsed.creativeAngles) ? parsed.creativeAngles.slice(0, 5) : [],
      characterIdeas: Array.isArray(parsed.characterIdeas) ? parsed.characterIdeas.slice(0, 4) : [],
    };
  } catch {
    return null;
  }
}

export default function InspirationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Inspiration'>>();

  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedDynasty, setSelectedDynasty] = useState<string>('全部');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<Inspiration[]>([]);
  const [aiError, setAiError] = useState<string>('');
  const [searched, setSearched] = useState(false);

  // AI 搜索前保存筛选状态，清除时恢复，避免用户筛选偏好丢失
  const preAISearchCategoryRef = useRef(selectedCategory);
  const preAISearchDynastyRef = useRef(selectedDynasty);
  // Refs 用于追踪最新筛选值（ref 更新不触发重渲染，保持 executeAISearch 稳定性）
  const selectedCategoryRef = useRef(selectedCategory);
  const selectedDynastyRef = useRef(selectedDynasty);
  selectedCategoryRef.current = selectedCategory;
  selectedDynastyRef.current = selectedDynasty;

  // Guard: prevents state updates after component unmount (e.g. user navigates away mid-AI-search)
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // AbortController ref：支持取消进行中的 HTTP 请求，避免搜索结果 race
  const abortControllerRef = useRef<AbortController | null>(null);

  // 防抖搜索 timer ref：避免每次按键都触发 API 调用
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // searchQueryRef：跟踪当前搜索文本，用于 handleAISearch 按钮回调稳定引用
  // （避免 searchQuery 在 useCallback deps 中导致 handleAISearch 每次输入都重建）
  const searchQueryRef = useRef('');

  // 组件卸载时清除待发的 debounce 定时器，防止卸载后回调仍执行导致状态更新
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      // Abort any in-flight AI request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const filtered = useMemo(() => {
    return INSPIRATIONS.filter(item => {
      const catMatch = selectedCategory === '全部' || item.category === selectedCategory;
      const dynMatch = selectedDynasty === '全部' || item.dynasty === selectedDynasty;
      return catMatch && dynMatch;
    });
  }, [selectedCategory, selectedDynasty]);

  /** AI 结果也受朝代筛选器约束 — 否则"元朝"选中时 AI 仍返回"明朝"内容会误导用户 */
  const filteredAIResults = useMemo(() => {
    if (selectedDynasty === '全部') return aiResults;
    return aiResults.filter(item => item.dynasty === selectedDynasty);
  }, [aiResults, selectedDynasty]);

  const toggleExpand = useCallback((id: string) => {
    // 仅在展开状态实际变化时触发布局动画，避免冗余动画调用
    setExpandedId(prev => {
      const next = prev === id ? null : id;
      if (next !== prev) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      return next;
    });
  }, []);

  const executeAISearch = useCallback(async (query: string) => {
    if (!query) return;

    setAiSearching(true);
    setSearched(true);
    setAiResults([]);
    setAiError('');
    setExpandedId(null);
    // 重置筛选器：AI 搜索时隐藏筛选器，清除搜索后恢复"全部"状态
    // 保存进入 AI 搜索前的筛选状态，清除时恢复
    // 注意：不禁用 FlatList（searched=true 时已自动隐藏），保留用户筛选偏好，
    // 避免 executeAISearch 中 reset 到'全部'导致 clearAISearch 无法恢复正确状态
    preAISearchCategoryRef.current = selectedCategoryRef.current;
    preAISearchDynastyRef.current = selectedDynastyRef.current;

    // Cancel any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await callAI({
        type: 'inspiration',
        text: query,
      }, 1, controller.signal);

      if (result.success && result.data) {
        const parsed = parseAIResult(result.data);
        if (parsed) {
          setAiResults([parsed]);
          setAiError('');
        } else {
          setAiError('AI 返回格式无法解析，请换个关键词重试');
        }
      } else {
        setAiError(result.error || 'AI 搜索失败，请检查 API 配置');
      }
    } catch {
      // callAI throws only on network errors; result.error covers API-level errors
      if (isMountedRef.current) {
        setAiError('搜索过程中发生错误，请稍后重试');
      }
    } finally {
      // Only update state if component is still mounted (user may have navigated away)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (isMountedRef.current) {
        setAiSearching(false);
      }
    }
  }, []);

  // 防抖搜索：用户输入后等待 300ms 无新输入再触发，避免频繁 API 调用
  const handleSearchInputChange = useCallback((text: string) => {
    setSearchQuery(text);
    searchQueryRef.current = text;
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      const trimmed = searchQueryRef.current.trim();
      if (trimmed) {
        executeAISearch(trimmed);
      }
      searchDebounceRef.current = null;
    }, 300);
  }, [executeAISearch]);

  const handleAISearch = useCallback(() => {
    const query = searchQueryRef.current.trim();
    if (!query) return;
    // 立即清除待定的防抖计时器，直接执行搜索
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    executeAISearch(query);
  }, [executeAISearch]);

  // useCallback 保证稳定引用，避免 FlatList onPress 接受到每次渲染重建的函数引用
  const clearAISearch = useCallback(() => {
    setAiResults([]);
    setAiError('');
    setSearched(false);
    setSearchQuery('');
    // 恢复 AI 搜索前的筛选偏好
    setSelectedCategory(preAISearchCategoryRef.current);
    setSelectedDynasty(preAISearchDynastyRef.current);
  }, []);

  // useCallback 包装 renderItem，保证 FlatList receive stable render function reference
  // FlatList 要求签名 ({ item, index }) => ReactElement，isAI 固定为 false（AI 结果单独处理）
  const renderItem = useCallback(
    ({ item }: { item: Inspiration }) => (
      <InspirationCard
        item={item}
        isAI={false}
        isExpanded={expandedId === item.id}
        onToggle={toggleExpand}
      />
    ),
    [expandedId, toggleExpand]
  );

  const dynastyItems = ['全部', ...DYNASTIES_FILTER];
  const categoryItems = ['全部', ...CATEGORIES];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>历史探秘</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.subtitle}>
        <Text style={styles.subtitleText}>
          野史传说 × 历史悬案 × 创作灵感
        </Text>
      </View>

      {/* AI 搜索栏 */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="输入历史话题，让 AI 为你探索..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            onSubmitEditing={handleAISearch}
            returnKeyType="search"
            maxLength={100}
            accessibilityLabel="历史话题搜索"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {aiSearching ? (
            <ActivityIndicator size="small" color={Colors.vermillion} style={styles.searchBtn} />
          ) : (
            <TouchableOpacity
              style={[styles.searchBtn, searchQuery.trim() && !aiSearching ? styles.searchBtnActive : null]}
              onPress={handleAISearch}
              disabled={!searchQuery.trim() || aiSearching}
            >
              <Text style={[styles.searchBtnText, searchQuery.trim() ? styles.searchBtnTextActive : null]}>
                搜索
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.keyboardDismissRow}>
          <TouchableOpacity
            style={styles.keyboardDismissBtn}
            onPress={Keyboard.dismiss}
            accessibilityLabel="收起键盘"
            accessibilityRole="button"
          >
            <Text style={styles.keyboardDismissBtnText}>⌨ 收起键盘</Text>
          </TouchableOpacity>
        </View>
        {searched && !aiSearching && (
          <TouchableOpacity onPress={clearAISearch} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕ 清除 AI 结果，回到资料库</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* AI 搜索结果 */}
      {searched && (
        <View style={styles.aiSection}>
          {aiSearching ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator size="small" color={Colors.vermillion} />
              <Text style={styles.aiLoadingText}>AI 正在为你探索历史...</Text>
            </View>
          ) : aiError ? (
            <View style={styles.aiErrorContainer}>
              <Text style={styles.aiErrorText}>{aiError}</Text>
              <View style={styles.aiErrorActions}>
                <TouchableOpacity style={styles.retryButton} onPress={handleAISearch}>
                  <Text style={styles.retryButtonText}>重试</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearButton} onPress={clearAISearch}>
                  <Text style={styles.clearButtonText}>清除</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : filteredAIResults.length > 0 ? (
            <>
              <Text style={styles.aiSectionTitle}>🔮 AI 为你找到的灵感</Text>
              {filteredAIResults.map(item => <InspirationCard key={item.id} item={item} isAI={true} isExpanded={expandedId === item.id} onToggle={toggleExpand} />)}
              {selectedDynasty !== '全部' && aiResults.length > filteredAIResults.length && (
                <Text style={styles.aiResultsNote}>
                  💡 还有 {aiResults.length - filteredAIResults.length} 条结果（{selectedDynasty}），切换至"全部"朝代即可查看
                </Text>
              )}
            </>
          ) : !aiError && !aiSearching && searched && filteredAIResults.length === 0 ? (
            <View style={styles.aiEmptyContainer}>
              <Text style={styles.aiEmptyIcon}>🔍</Text>
              {selectedDynasty !== '全部' && aiResults.length > 0 ? (
                <>
                  <Text style={styles.aiEmptyText}>AI 返回了 {aiResults.length} 条灵感，但都与"{selectedDynasty}"无关</Text>
                  <Text style={styles.aiEmptyHint}>切换至"全部"朝代，或尝试其他历史话题</Text>
                </>
              ) : (
                <>
                  <Text style={styles.aiEmptyText}>未找到相关灵感</Text>
                  <Text style={styles.aiEmptyHint}>试试其他关键词，如"安史之乱""郑和下西洋"</Text>
                </>
              )}
            </View>
          ) : null}
        </View>
      )}

      {/* 筛选器 */}
      {!searched && (
        <>
          <View style={styles.filterRow}>
            <FilterChipRow
              items={dynastyItems}
              selected={selectedDynasty}
              onSelect={setSelectedDynasty}
            />
          </View>
          <View style={styles.filterRow}>
            <FilterChipRow
              items={categoryItems}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        </>
      )}

      {/* 列表 */}
      {!searched && (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无符合条件的条目</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: ColorsAlpha.goldBorder,
  },
  backBtn: { padding: Spacing.xs },
  backBtnText: { fontSize: FontSize.md, color: Colors.vermillion },
  headerSpacer: { width: 50 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.textPrimary },
  subtitle: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm + 2,
    paddingBottom: Spacing.xs,
  },
  subtitleText: { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic' },
  searchSection: {
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.paperDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchBtn: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchBtnActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  searchBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  searchBtnTextActive: {
    color: Colors.textOnVermillion,
  },
  clearBtn: {
    marginTop: Spacing.xs + 2,
    alignSelf: 'flex-start',
  },
  clearBtnText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  keyboardDismissRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.xs,
  },
  keyboardDismissBtn: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  keyboardDismissBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  aiSection: {
    paddingHorizontal: Spacing.md - 2,
    paddingTop: Spacing.sm + 4,
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  aiLoadingText: {
    marginLeft: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  aiSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: 'bold',
    color: Colors.vermillion,
    marginBottom: Spacing.sm + 4,
  },
  aiResultsNote: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  // AI 搜索空结果状态
  aiEmptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  aiEmptyIcon: {
    fontSize: 36,
    marginBottom: Spacing.md,
  },
  aiEmptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  aiEmptyHint: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  aiErrorContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
    marginBottom: Spacing.sm,
  },
  aiErrorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  aiErrorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.vermillion,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.textOnVermillion,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.paperDark,
  },
  clearButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  filterRow: {
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.sm,
  },
  list: { padding: Spacing.md - 2, paddingBottom: 40 },
  empty: { padding: Spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, color: Colors.textLight },
});
