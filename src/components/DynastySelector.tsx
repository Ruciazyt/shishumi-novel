import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { DynastyId } from '../types';
import { DYNASTIES, DYNASTY_SUMMARIES } from '../data/dynasties';
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors';

interface DynastySelectorProps {
  /** 当前选中的朝代 ID */
  selected: DynastyId;
  /** 选择朝代回调 */
  onSelect: (id: DynastyId) => void;
  /** 布局模式：horizontal = 水平滚动，wrap = 自动换行 */
  layout?: 'horizontal' | 'wrap';
  /** 是否显示"自定义/架空"选项 */
  showCustom?: boolean;
  /** 自定义选项的显示文字 */
  customLabel?: string;
  /** 是否在选中项下方显示朝代简介 */
  showSummary?: boolean;
}

/**
 * 朝代选择器 — 复用组件，统一 Home/Project/Settings 页面的朝代选择 UI
 */
export const DynastySelector: React.FC<DynastySelectorProps> = React.memo(({
  selected,
  onSelect,
  layout = 'wrap',
  showCustom = true,
  customLabel = '自定义/架空',
  showSummary = false,
}) => {
  // useMemo 替代 useState+useEffect：同步计算，避免额外渲染周期
  const summary = useMemo(() => {
    if (!showSummary) return '';
    if (selected === 'custom') {
      return '自定义创作，无历史背景限制';
    }
    const name = DYNASTIES.find(d => d.id === selected)?.name || selected;
    return DYNASTY_SUMMARIES[name] || '';
  }, [selected, showSummary]);

  // 渲染朝代按钮列表（静态 JSX，无须 useMemo 包裹）
  const renderButtons = () => (
    <>
      {DYNASTIES.map(d => (
        <TouchableOpacity
          key={d.id}
          style={[
            styles.dynastyButton,
            selected === d.id && styles.dynastyButtonActive,
          ]}
          onPress={() => onSelect(d.id as DynastyId)}
        >
          <Text
            style={[
              styles.dynastyButtonText,
              selected === d.id && styles.dynastyButtonTextActive,
            ]}
          >
            {d.name}
          </Text>
        </TouchableOpacity>
      ))}
      {showCustom && (
        <TouchableOpacity
          style={[
            styles.dynastyButton,
            selected === 'custom' && styles.dynastyButtonActive,
          ]}
          onPress={() => onSelect('custom' as DynastyId)}
        >
          <Text
            style={[
              styles.dynastyButtonText,
              selected === 'custom' && styles.dynastyButtonTextActive,
            ]}
          >
            {customLabel}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );

  if (layout === 'horizontal') {
    return (
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalContent}
        >
          {renderButtons()}
        </ScrollView>
        {showSummary && summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {summary}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.wrapContent}>
        {renderButtons()}
      </View>
      {showSummary && summary ? (
        <Text style={styles.summary} numberOfLines={2}>
          {summary}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  horizontalContent: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  wrapContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dynastyButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
    // gap 由 wrapContent 提供，无需单独 marginRight
    marginBottom: Spacing.sm,
  },
  dynastyButtonActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  dynastyButtonText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  dynastyButtonTextActive: {
    color: Colors.textOnVermillion,
    fontWeight: '600',
  },
  summary: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.gold,
    lineHeight: 22,
    paddingHorizontal: Spacing.xs,
    letterSpacing: 0.5,
  },
});
