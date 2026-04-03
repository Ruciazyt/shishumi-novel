import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, LayoutAnimation, Platform, UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { INSPIRATIONS, CATEGORIES, DYNASTIES_FILTER, type Inspiration } from '../data/inspirations';

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

interface Props {
  navigation: any;
}

export default function InspirationScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedDynasty, setSelectedDynasty] = useState<string>('全部');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const renderItem = ({ item }: { item: Inspiration }) => {
    const isExpanded = expandedId === item.id;
    const catColor = CATEGORY_COLORS[item.category] || '#718096';
    const dynColor = DYNASTY_COLORS[item.dynasty] || '#718096';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => toggleExpand(item.id)}
      >
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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📖 正史记载</Text>
              {item.historicalFacts.map((fact, i) => (
                <Text key={i} style={styles.bulletItem}>· {fact}</Text>
              ))}
            </View>

            <View style={[styles.section, { marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: '#8B4513' }]}>📜 野史说法</Text>
              {item.folkVersions.map((fact, i) => (
                <Text key={i} style={[styles.bulletItem, { color: '#5A3E28' }]}>· {fact}</Text>
              ))}
            </View>

            <View style={[styles.section, { marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: '#6B21A8' }]}>✍️ 创作角度</Text>
              {item.creativeAngles.map((fact, i) => (
                <Text key={i} style={[styles.bulletItem, { color: '#6B21A8' }]}>· {fact}</Text>
              ))}
            </View>

            {item.characterIdeas && (
              <View style={[styles.section, { marginTop: 12 }]}>
                <Text style={[styles.sectionTitle, { color: '#0369A1' }]}>👤 人物设定灵感</Text>
                {item.characterIdeas.map((idea, i) => (
                  <Text key={i} style={[styles.bulletItem, { color: '#0369A1' }]}>· {idea}</Text>
                ))}
              </View>
            )}
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>历史探秘</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.subtitle}>
        <Text style={styles.subtitleText}>
          野史传说 × 历史悬案 × 创作灵感
        </Text>
      </View>

      {/* 朝代筛选 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {DYNASTIES_FILTER.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.filterChip, selectedDynasty === d && styles.filterChipActive]}
            onPress={() => setSelectedDynasty(d)}
          >
            <Text style={[styles.filterChipText, selectedDynasty === d && styles.filterChipTextActive]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 分类筛选 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow2}>
        <TouchableOpacity
          style={[styles.filterChip, selectedCategory === '全部' && styles.filterChipActive]}
          onPress={() => setSelectedCategory('全部')}
        >
          <Text style={[styles.filterChipText, selectedCategory === '全部' && styles.filterChipTextActive]}>
            全部
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.filterChip, selectedCategory === c && styles.filterChipActive]}
            onPress={() => setSelectedCategory(c)}
          >
            <Text style={[styles.filterChipText, selectedCategory === c && styles.filterChipTextActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 列表 */}
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#5C3D2E' },
  subtitle: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  subtitleText: { fontSize: 13, color: '#8B7355', fontStyle: 'italic' },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 44,
  },
  filterRow2: {
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
  },
  filterChipActive: {
    backgroundColor: '#7B5E3C',
  },
  filterChipText: {
    fontSize: 13,
    color: '#8B7355',
  },
  filterChipTextActive: {
    color: '#FFF',
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
