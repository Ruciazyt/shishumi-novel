import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Project } from '../types';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha } from '../constants/colors';
import { formatRelativeTime } from '../utils/time';
import { countChars } from '../utils/text';
import { getDynastyById } from '../data/dynasties';


interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onLongPress?: () => void;
}

/** 避免父组件重渲染导致所有卡片无谓重绘 */
export const ProjectCard: React.FC<ProjectCardProps> = React.memo(
  ({ project, onPress, onLongPress }) => {
    const relativeTime = useMemo(
      () => formatRelativeTime(project.updatedAt),
      [project.updatedAt]
    );
    const totalChars = useMemo(
      () => project.chapters.reduce((sum, ch) => sum + countChars(ch.content), 0),
      [project.chapters]
    );
    const dynastyName = useMemo(
      () => getDynastyById(project.dynasty)?.name || project.dynasty,
      [project.dynasty]
    );

    return (
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.75}
      >
        {/* 装饰边框 - 古籍装帧风格 */}
        <View style={styles.decorationBorder} />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {project.title}
            </Text>
            <View style={styles.dynastyBadge}>
              <Text style={styles.dynastyBadgeText}>{dynastyName}</Text>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {project.description || '暂无简介'}
          </Text>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📄</Text>
              <Text style={styles.metaText}>
                {project.chapters.length}章节
              </Text>
            </View>
            {totalChars > 0 && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>✍️</Text>
                <Text style={styles.metaText}>{totalChars.toLocaleString()}字</Text>
              </View>
            )}
            {relativeTime && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🕐</Text>
                <Text style={styles.metaText}>{relativeTime}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ColorsAlpha.goldBorder,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  decorationBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.vermillion,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.lg + 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
    letterSpacing: 1,
  },
  dynastyBadge: {
    backgroundColor: ColorsAlpha.vermillionBadgeBg,
    borderWidth: 1,
    borderColor: ColorsAlpha.vermillionBadgeBorder,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    flexShrink: 0,
  },
  dynastyBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.vermillion,
    fontWeight: '600',
    letterSpacing: 1,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaIcon: {
    fontSize: FontSize.xs,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
});
