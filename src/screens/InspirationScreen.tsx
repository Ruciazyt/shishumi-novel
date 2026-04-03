import React, { useState, useMemo } from 'react';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORY_COLORS: Record<string, string> = {
  '野史传说': '#8B4513',
  '历史悬案': '#4A5568',
  '帝王之谜': '#6B21A8',
  '战争秘闻': '#B91C1C',
  '人物逸事': '#0369A1',
};

const DYNASTY_COLORS: Record<string, string> = {
  '明朝': '#C53030',
  '清朝': '#2B6CB0',
  '宋朝': '#D69E2E',
  '唐朝': '#805AD5',
  '元朝': '#319231',
  '其他': '#718096',
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
  isFirst,
}: {
  title: string;
  items: string[];
  titleColor?: string;
  itemColor?: string;
  isFirst?: boolean;
}) {
  if (!items || items.length === 0) return null;
  return (
    <View style={[styles.section, !isFirst && { marginTop: 12 }]}>
      <Text style={[styles.sectionTitle, titleColor ? { color: titleColor } : undefined]}>{title}</Text>
      {items.map((text, i) => (
        <Text key={i} style={[styles.bulletItem, itemColor ? { color: itemColor } : undefined]}>· {text}</Text>
      ))}
    </View>
  );
}

/** Horizontal filter chip row — deduplicates dynasty/category filter blocks */
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

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

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
    } catch (e) {
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

  const renderItem = (item: Inspiration, isAI = false) => {
    const isExpanded = expandedId === item.id;
    const catColor = CATEGORY_COLORS[item.category] || '#718096';
    const dynColor = DYNASTY_COLORS[item.dynasty] || '#718096';

    return (
      <TouchableOpacity
        style={[styles.card, isAI && styles.cardAI]}
        activeOpacity={0.8}
        onPress={() => toggleExpand(item.id)}
      >
        {isAI && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>🤖 AI 创作</Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: catColor + '22' }]}>
              <Text style={[styles.tagText, { color: catColor }]}>{item.category}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: dynColor + '22' }]}>
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
            <BulletSection title="📖 正史记载" items={item.historicalFacts} isFirst />
            <BulletSection title="📜 野史说法" items={item.folkVersions} titleColor="#8B4513" itemColor="#5A3E28" />
            <BulletSection title="✍️ 创作角度" items={item.creativeAngles} titleColor="#6B21A8" itemColor="#6B21A8" />
            <BulletSection title="👤 人物设定灵感" items={item.characterIdeas || []} titleColor="#0369A1" itemColor="#0369A1" />
          </View>
        )}

        <View style={styles.expandHint}>
          <Text style={styles.expandText}>
            {isExpanded ? '▲ 点击收起' : '▼ 点击展开详情'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const dynastyItems = ['全部', ...DYNASTIES_FILTER.filter(d => d !== '全部')];
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
            placeholderTextColor="#B0A090"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleAISearch}
            returnKeyType="search"
            maxLength={100}
          />
          {aiSearching ? (
            <ActivityIndicator size="small" color="#7B5E3C" style={styles.searchBtn} />
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
              <ActivityIndicator size="small" color="#7B5E3C" />
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
  container: { flex: 1, backgroundColor: '#FDF6EC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#E8DCC8',
    borderBottomWidth: 1,
    borderBottomColor: '#D4C4A8',
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 16, color: '#7B5E3C' },
  headerSpacer: { width: 50 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#5C3D2E' },
  subtitle: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  subtitleText: { fontSize: 13, color: '#8B7355', fontStyle: 'italic' },
  searchSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F0E6D2',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D4C0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#3D2B1F',
    borderWidth: 1,
    borderColor: '#D4C4A8',
  },
  searchBtn: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8DCC8',
    borderWidth: 1,
    borderColor: '#D4C4A8',
  },
  searchBtnActive: {
    backgroundColor: '#7B5E3C',
    borderColor: '#7B5E3C',
  },
  searchBtnText: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: 'bold',
  },
  searchBtnTextActive: {
    color: '#FFF',
  },
  clearBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  clearBtnText: {
    fontSize: 12,
    color: '#B0A090',
  },
  aiSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  aiLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8B7355',
    fontStyle: 'italic',
  },
  aiSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B21A8',
    marginBottom: 10,
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 44,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#EDE0CC',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#D4C4A8',
  },
  filterChipActive: {
    backgroundColor: '#7B5E3C',
    borderColor: '#7B5E3C',
  },
  filterChipActiveAll: {
    backgroundColor: '#3D2B1F',
    borderColor: '#3D2B1F',
  },
  filterChipText: {
    fontSize: 13,
    color: '#8B7355',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  filterChipTextActiveAll: {
    color: '#E8DCC8',
    fontWeight: 'bold',
  },
  list: { padding: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAI: {
    borderColor: '#9B59B6',
    borderWidth: 1.5,
    backgroundColor: '#FAF5FF',
  },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6B21A8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 8,
  },
  aiBadgeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
  },
  cardHeader: {},
  tagRow: { flexDirection: 'row', marginBottom: 8 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  tagText: { fontSize: 11, fontWeight: 'bold' },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#3D2B1F', marginBottom: 6, lineHeight: 24 },
  summary: { fontSize: 14, color: '#6B5B4F', lineHeight: 22 },
  cardBody: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0E6D2',
  },
  section: {},
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#3D2B1F', marginBottom: 6 },
  bulletItem: { fontSize: 13.5, color: '#5C4A3A', lineHeight: 22, paddingLeft: 4, marginBottom: 3 },
  expandHint: { alignItems: 'center', marginTop: 10 },
  expandText: { fontSize: 12, color: '#B0A090' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#B0A090' },
});
