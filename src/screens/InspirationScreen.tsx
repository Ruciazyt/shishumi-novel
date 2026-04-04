import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, LayoutAnimation, Platform, UIManager,
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { INSPIRATIONS, CATEGORIES, DYNASTIES_FILTER, type Inspiration } from '../data/inspirations';
import { callAI } from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha, DynastyColors, rgba } from '../constants/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 使用设计系统语义化颜色，保持与 App 整体风格一致
const CATEGORY_COLORS: Record<string, string> = {
  '野史传说': Colors.goldDark,       // 土金色 — 古韵
  '历史悬案': Colors.textSecondary,  // 灰色
  '帝王之谜': Colors.vermillion,    // 朱砂红 — 权谋
  '战争秘闻': Colors.error,          // 错误红 — 血战
  '人物逸事': Colors.inkLight,       // 墨浅色 — 文人
};

// 复用 constants/colors.ts 中定义的朝代色，Others fallback 到 textSecondary
const DYNASTY_COLORS: Record<string, string> = {
  ...DynastyColors,
  '其他': Colors.textSecondary,
};


type InspirationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Inspiration">;

interface Props {
  navigation: InspirationScreenNavigationProp;
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
      summary: parsed.summary || '',
      historicalFacts: Array.isArray(parsed.historicalFacts) ? parsed.historicalFacts.slice(0, 5) : [],
      folkVersions: Array.isArray(parsed.folkVersions) ? parsed.folkVersions.slice(0, 5) : [],
      creativeAngles: Array.isArray(parsed.creativeAngles) ? parsed.creativeAngles.slice(0, 5) : [],
      characterIdeas: Array.isArray(parsed.characterIdeas) ? parsed.characterIdeas.slice(0, 4) : [],
    };
  } catch {
    return null;
  }
}

/** Reusable bullet-list section */
function BulletSection({
  title,
  items,
  titleColor,
  itemColor,
}: {
  title: string;
  items: string[];
  titleColor?: string;
  itemColor?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, titleColor ? { color: titleColor } : undefined]}>{title}</Text>
      {items.map((text, i) => (
        <Text key={i} style={[styles.bulletItem, itemColor ? { color: itemColor } : undefined]}>· {text}</Text>
      ))}
    </View>
  );
}

/** Horizontal filter chip row */
function FilterChipRow({
  items,
  selected,
  onSelect,
  style,
}: {
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
  style?: object;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style}>
      {items.map(item => {
        const isAll = item === '全部';
        const isActive = selected === item;
        return (
          <TouchableOpacity
            key={item}
            style={[
              styles.filterChip,
              isActive && (isAll ? styles.filterChipActiveAll : styles.filterChipActive),
            ]}
            onPress={() => onSelect(item)}
          >
            <Text
              style={[
                styles.filterChipText,
                isActive && (isAll ? styles.filterChipTextActiveAll : styles.filterChipTextActive),
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}


/** 灵感卡片组件：React.memo 避免 FlatList 展开/收起时所有卡片无谓重绘 */
const InspirationCard = React.memo<{
  item: Inspiration;
  isAI: boolean;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}>(({ item, isAI, isExpanded, onToggle }) => {
  const catColor = CATEGORY_COLORS[item.category] || Colors.textSecondary;
  const dynColor = DYNASTY_COLORS[item.dynasty] || Colors.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.card, isAI && styles.cardAI]}
      activeOpacity={0.8}
      onPress={() => onToggle(item.id)}
    >
      {isAI && (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>🤖 AI 创作</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: rgba(catColor, 0.13) }]}>
            <Text style={[styles.tagText, { color: catColor }]}>{item.category}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: rgba(dynColor, 0.13) }]}>
            <Text style={[styles.tagText, { color: dynColor }]}>{item.dynasty}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.summary} numberOfLines={isExpanded ? undefined : 2}>
          {item.summary}
        </Text>
      </View>

      {isExpanded && (
        <View style={styles.cardBody}>
          <BulletSection title="📖 正史记载" items={item.historicalFacts} />
          <BulletSection title="📜 野史说法" items={item.folkVersions} titleColor={Colors.goldDark} itemColor={Colors.textSecondary} />
          <BulletSection title="✍️ 创作角度" items={item.creativeAngles} titleColor={Colors.vermillion} itemColor={Colors.textPrimary} />
          <BulletSection title="👤 人物设定灵感" items={item.characterIdeas || []} titleColor={Colors.inkLight} itemColor={Colors.textPrimary} />
        </View>
      )}

      <View style={styles.expandHint}>
        <Text style={styles.expandText}>
          {isExpanded ? '▲ 点击收起' : '▼ 点击展开详情'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});
InspirationCard.displayName = 'InspirationCard';

export default function InspirationScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedDynasty, setSelectedDynasty] = useState<string>('全部');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<Inspiration[]>([]);
  const [searched, setSearched] = useState(false);

  const filtered = useMemo(() => {
    return INSPIRATIONS.filter(item => {
      const catMatch = selectedCategory === '全部' || item.category === selectedCategory;
      const dynMatch = selectedDynasty === '全部' || item.dynasty === selectedDynasty;
      return catMatch && dynMatch;
    });
  }, [selectedCategory, selectedDynasty]);

  const toggleExpand = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const handleAISearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setAiSearching(true);
    setSearched(true);
    setAiResults([]);
    setExpandedId(null);

    try {
      const result = await callAI({
        type: 'historical',
        text: query,
      });

      if (result.success && result.data) {
        const parsed = parseAIResult(result.data);
        if (parsed) {
          setAiResults([parsed]);
        } else {
          Alert.alert('提示', 'AI 返回格式无法解析，请换个关键词重试');
        }
      } else {
        Alert.alert('AI 搜索失败', result.error || '请检查 API 配置');
      }
    } catch {
      Alert.alert('错误', '搜索过程中发生错误');
    } finally {
      setAiSearching(false);
    }
  };

  const clearAISearch = () => {
    setAiResults([]);
    setSearched(false);
    setSearchQuery('');
  };

  // useCallback 包装 renderItem，保证 FlatList receive stable render function reference
  const renderItem = useCallback(
    (item: Inspiration, isAI = false) => (
      <InspirationCard
        item={item}
        isAI={isAI}
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
            onChangeText={setSearchQuery}
            onSubmitEditing={handleAISearch}
            returnKeyType="search"
            maxLength={100}
          />
          {aiSearching ? (
            <ActivityIndicator size="small" color={Colors.vermillion} style={styles.searchBtn} />
          ) : (
            <TouchableOpacity
              style={[styles.searchBtn, searchQuery.trim() ? styles.searchBtnActive : null]}
              onPress={handleAISearch}
              disabled={!searchQuery.trim()}
            >
              <Text style={[styles.searchBtnText, searchQuery.trim() ? styles.searchBtnTextActive : null]}>
                搜索
              </Text>
            </TouchableOpacity>
          )}
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
          ) : aiResults.length > 0 ? (
            <>
              <Text style={styles.aiSectionTitle}>🔮 AI 为你找到的灵感</Text>
              {aiResults.map(item => renderItem(item, true))}
            </>
          ) : null}
        </View>
      )}

      {/* 筛选器 */}
      {!searched && (
        <>
          <FilterChipRow
            items={dynastyItems}
            selected={selectedDynasty}
            onSelect={setSelectedDynasty}
            style={styles.filterRow}
          />
          <FilterChipRow
            items={categoryItems}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            style={styles.filterRow}
          />
        </>
      )}

      {/* 列表 */}
      {!searched && (
        <FlatList
          data={filtered}
          renderItem={({ item }) => renderItem(item, false)}
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
  filterRow: {
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.sm,
    maxHeight: 44,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.paperDark,
    marginHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  filterChipActiveAll: {
    backgroundColor: Colors.inkDark,
    borderColor: Colors.inkDark,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textOnVermillion,
    fontWeight: 'bold',
  },
  filterChipTextActiveAll: {
    color: Colors.paper,
    fontWeight: 'bold',
  },
  list: { padding: Spacing.md - 2, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
    marginBottom: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAI: {
    borderColor: Colors.vermillion,
    borderWidth: 1.5,
    backgroundColor: ColorsAlpha.vermillionBadgeBg,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vermillion,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
    marginBottom: Spacing.sm,
  },
  aiBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.textOnVermillion,
    fontWeight: 'bold',
  },
  cardHeader: {},
  tagRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  tag: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
    marginRight: Spacing.sm,
  },
  tagText: { fontSize: FontSize.xs, fontWeight: 'bold' },
  cardTitle: {
    fontSize: FontSize.lg - 2,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs + 2,
    lineHeight: 24,
  },
  summary: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  cardBody: {
    marginTop: Spacing.sm + 4,
    paddingTop: Spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: ColorsAlpha.goldBorder,
  },
  section: {},
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs + 2,
  },
  bulletItem: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingLeft: 4,
    marginBottom: 3,
  },
  expandHint: { alignItems: 'center', marginTop: Spacing.sm + 4 },
  expandText: { fontSize: FontSize.xs, color: Colors.textLight },
  empty: { padding: Spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.sm, color: Colors.textLight },
});
