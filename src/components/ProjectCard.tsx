import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Project } from '../types';
import { Colors } from '../constants/colors';
import { formatRelativeTime } from '../utils/time';

const countChars = (text: string): number => text.replace(/\s/g, '').length;

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onLongPress?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onPress, onLongPress }) => {
  const relativeTime = formatRelativeTime(project.updatedAt);
  const totalChars = project.chapters.reduce((sum, ch) => sum + countChars(ch.content), 0);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Text style={styles.title} numberOfLines={1}>
        {project.title}
      </Text>
      <Text style={styles.dynasty}>{project.dynasty}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {project.description || '暂无简介'}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.chapters}>
          {project.chapters.length}章节
        </Text>
        {totalChars > 0 && (
          <Text style={styles.wordCount}> · {totalChars.toLocaleString()}字</Text>
        )}
        {relativeTime ? (
          <Text style={styles.updated}> · {relativeTime}更新</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dynasty: {
    fontSize: 14,
    color: Colors.vermillion,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapters: {
    fontSize: 12,
    color: Colors.textLight,
  },
  wordCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  updated: {
    fontSize: 12,
    color: Colors.textLight,
  },
});
