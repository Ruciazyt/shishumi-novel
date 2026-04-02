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
}> = ({ name, subtext, size = 'sm' }) => {
  const textStyle = size === 'xs' ? styles.textXs : styles.textSm;
  return (
    <View style={styles.badge}>
      <Text style={textStyle}>{name}</Text>
      {subtext ? <Text style={styles.subtext} numberOfLines={1}>{subtext}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: ColorsAlpha.vermillionBadgeBg,
    borderWidth: 1,
    borderColor: ColorsAlpha.vermillionBadgeBorder,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
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
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 1,
  },
});
