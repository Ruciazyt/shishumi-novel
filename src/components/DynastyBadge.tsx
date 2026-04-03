import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha } from '../constants/colors';

/**
 * Reusable dynasty badge component.
 * Centralizes the vermillion badge style used across HomeScreen, ProjectScreen,
 * EditorScreen, and ChapterList to avoid duplication and ensure consistency.
 */
export const DynastyBadge: React.FC<{
  name: string;
  subtext?: string;
  /** Font size: 'sm' (14px, for project info) or 'xs' (12px, for stats bar). Defaults to 'sm'. */
  size?: 'sm' | 'xs';
}> = React.memo(({ name, subtext, size = 'sm' }) => {
  const textStyle = size === 'xs' ? styles.textXs : styles.textSm;
  return (
    <View style={styles.badge}>
      <Text style={textStyle}>{name}</Text>
      {subtext ? <Text style={[styles.subtext, size === 'xs' && styles.subtextXs]} numberOfLines={1}>{subtext}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    backgroundColor: ColorsAlpha.vermillionBadgeBg,
    borderWidth: 1,
    borderColor: ColorsAlpha.vermillionBadgeBorder,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: 200,
    flexShrink: 1,
  },
  textSm: {
    fontSize: FontSize.sm,
    color: Colors.vermillion,
    fontWeight: '600',
  },
  textXs: {
    fontSize: FontSize.xs,
    color: Colors.vermillion,
    fontWeight: '600',
    letterSpacing: 1,
  },
  subtext: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  subtextXs: {
    fontSize: FontSize.xs, // consistent with design system (was hardcoded 10px)
    letterSpacing: 0.5,
  },
});
