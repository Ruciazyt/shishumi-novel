import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha, DynastyColors, rgba } from '../constants/colors';

/**
 * Reusable dynasty badge component.
 * Centralizes the badge style used across HomeScreen, ProjectScreen,
 * EditorScreen, and ChapterList to avoid duplication and ensure consistency.
 *
 * @param variant - 'vermillion' (default, red badge) or 'dynasty' (uses DynastyColors).
 *                  Use 'dynasty' when displaying dynasty identity badges to leverage
 *                  the per-dynasty color system; use 'vermillion' for generic accent badges.
 */
export const DynastyBadge: React.FC<{
  name: string;
  subtext?: string;
  /** Font size: 'sm' (14px, for project info) or 'xs' (12px, for stats bar). Defaults to 'sm'. */
  size?: 'sm' | 'xs';
  /**
   * Badge color variant.
   * - 'vermillion': fixed vermillion red (default) — consistent accent for UI chrome.
   * - 'dynasty':    per-dynasty color from DynastyColors — visually distinguishes each era.
   *                 Falls back to vermillion if the dynasty name has no entry in DynastyColors.
   * Defaults to 'vermillion' for backwards compatibility.
   */
  variant?: 'vermillion' | 'dynasty';
}> = React.memo(({ name, subtext, size = 'sm', variant = 'vermillion' }) => {
  const isDynastyVariant = variant === 'dynasty';
  // dynasty variant: look up DynastyColors, fall back to vermillion; vermillion variant: always vermillion
  const dynColor = isDynastyVariant ? (DynastyColors[name as keyof typeof DynastyColors] ?? Colors.vermillion) : Colors.vermillion;

  // Precomputed alpha values for steppeGrass (元朝) eliminate runtime rgba() calls.
  // For other dynasty colors, fall back to runtime rgba() computation.
  const isSteppeGrass = dynColor === Colors.steppeGrass;
  const badgeBg = isDynastyVariant
    ? (isSteppeGrass ? ColorsAlpha.steppeGrassBadgeBg : rgba(dynColor, 0.12))
    : ColorsAlpha.vermillionBadgeBg;
  const badgeBorder = isDynastyVariant
    ? (isSteppeGrass ? ColorsAlpha.steppeGrassBadgeBorder : rgba(dynColor, 0.30))
    : ColorsAlpha.vermillionBadgeBorder;

  const textStyle = size === 'xs' ? styles.textXs : styles.textSm;
  const subtextStyle = size === 'xs' ? styles.subtextXs : styles.subtextSm;
  const accessibilityLabel = subtext ? `${name}，${subtext}` : name;

  return (
    <View
      style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[textStyle, { color: dynColor }]} numberOfLines={1}>{name}</Text>
      {subtext ? (
        <Text style={subtextStyle} numberOfLines={1}>
          {subtext}
        </Text>
      ) : null}
    </View>
  );
});

DynastyBadge.displayName = 'DynastyBadge';

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: 200,
    flexShrink: 1,
  },
  textSm: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  textXs: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
  // sm variant: xs font + light color + marginTop + letterSpacing
  subtextSm: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
    letterSpacing: 1,
  },
  // xs variant: tighter letterSpacing for compact stats bar rendering
  subtextXs: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
