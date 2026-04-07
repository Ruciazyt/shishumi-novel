import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { type Inspiration } from '../data/inspirations';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha, CategoryColors, CategoryAlpha } from '../constants/colors';
import { DynastyBadge } from './DynastyBadge';

/** Reusable bullet-list section — React.memo avoids re-render when parent card re-renders */
export const BulletSection = React.memo<{
  title: string;
  items: string[];
  titleColor?: string;
  itemColor?: string;
  /** Section index within the card — ensures unique keys across sections with identical titles */
  sectionIndex: number;
}>(function BulletSection({
  title,
  items,
  titleColor,
  itemColor,
  sectionIndex,
}) {
  if (!items || items.length === 0) return null;
  return (
    <View>
      <Text style={[styles.sectionTitle, titleColor ? { color: titleColor } : undefined]}>{title}</Text>
      {items.map((text, i) => (
        <Text key={`${sectionIndex}-${i}`} style={[styles.bulletItem, itemColor ? { color: itemColor } : undefined]} selectable>· {text}</Text>
      ))}
    </View>
  );
});
BulletSection.displayName = 'BulletSection';

/** Horizontal filter chip row */
export const FilterChipRow = React.memo(function FilterChipRow({
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={styles.filterChipRow}
    >
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
            accessibilityLabel={`筛选：${item}`}
            accessibilityRole="button"
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
});
FilterChipRow.displayName = 'FilterChipRow';

/** 灵感卡片组件：React.memo 避免 FlatList 展开/收起时所有卡片无谓重绘 */
export const InspirationCard = React.memo<{
  item: Inspiration;
  isAI: boolean;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}>(({ item, isAI, isExpanded, onToggle }) => {
  const catColor = CategoryColors[item.category] || Colors.textSecondary;

  // useMemo：避免每次渲染都重复计算数组长度（数组引用不变时直接复用缓存值）
  const totalItems = React.useMemo(
    () =>
      (item.historicalFacts?.length ?? 0) +
      (item.folkVersions?.length ?? 0) +
      (item.creativeAngles?.length ?? 0) +
      (item.characterIdeas?.length ?? 0),
    [item.historicalFacts, item.folkVersions, item.creativeAngles, item.characterIdeas]
  );

  return (
    <TouchableOpacity
      style={[styles.card, isAI && styles.cardAI]}
      activeOpacity={0.8}
      onPress={() => onToggle(item.id)}
      accessibilityLabel={`${item.title}，${item.category}，${item.dynasty}，${isExpanded ? '已展开，点击收起' : '已折叠，点击展开'}`}
      accessibilityRole="button"
    >
      {/* 装饰边框 - 古籍装帧风格，与 ProjectCard 保持一致 */}
      <View style={styles.decorationBorder} />
      {isAI && (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>🤖 AI 创作</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <View style={styles.tagRow}>
          {/* 分类标签：使用预计算透明度背景色（源自 CategoryAlpha 设计令牌） */}
          <View style={[styles.tag, { backgroundColor: CategoryAlpha[item.category] }]}>
            <Text style={[styles.tagText, { color: catColor }]}>{item.category}</Text>
          </View>
          {/* 朝代标签：统一使用 DynastyBadge 组件 */}
          <DynastyBadge
            name={item.dynasty}
            size="xs"
            variant="dynasty"
          />
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.summary} numberOfLines={isExpanded ? undefined : 2} selectable>
          {item.summary}
        </Text>
      </View>

      {isExpanded && (
        <View style={styles.cardBody}>
          <BulletSection title="📖 正史记载" items={item.historicalFacts} sectionIndex={0} />
          <BulletSection title="📜 野史说法" items={item.folkVersions} titleColor={Colors.goldDark} itemColor={Colors.textSecondary} sectionIndex={1} />
          <BulletSection title="✍️ 创作角度" items={item.creativeAngles} titleColor={Colors.vermillion} itemColor={Colors.textPrimary} sectionIndex={2} />
          <BulletSection title="👤 人物设定灵感" items={item.characterIdeas ?? []} titleColor={Colors.inkLight} itemColor={Colors.textPrimary} sectionIndex={3} />
        </View>
      )}

      <View style={styles.expandHint}>
        {isExpanded ? (
          <Text style={styles.expandText}>▲ 点击收起</Text>
        ) : (
          <View style={styles.expandHintRow}>
            {totalItems > 0 && (
              <View style={styles.contentCountBadge}>
                <Text style={styles.contentCountBadgeText}>含{totalItems}项内容</Text>
              </View>
            )}
            <Text style={styles.expandText}>▼ 点击展开详情</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});
InspirationCard.displayName = 'InspirationCard';

const styles = StyleSheet.create({
  filterChipRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.paperDark,
    marginRight: Spacing.sm,
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
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardAI: {
    borderColor: Colors.vermillion,
    borderWidth: 1.5,
    backgroundColor: ColorsAlpha.vermillionBadgeBg,
  },
  decorationBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.vermillion,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vermillion,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm + 4,
  },
  aiBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.textOnVermillion,
    fontWeight: 'bold',
  },
  cardHeader: {
    padding: Spacing.md + 2,
    paddingTop: Spacing.sm + 2,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
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
  expandHintRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  contentCountBadge: {
    backgroundColor: ColorsAlpha.vermillionBadgeBg,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: ColorsAlpha.vermillionBadgeBorder,
  },
  contentCountBadgeText: { fontSize: FontSize.xs, color: Colors.vermillion, fontWeight: '600' },
  expandText: { fontSize: FontSize.xs, color: Colors.textLight },
});
