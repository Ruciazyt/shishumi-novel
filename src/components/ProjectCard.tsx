import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Project } from '../types';
import { Colors } from '../constants/colors';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onLongPress?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onPress, onLongPress }) => {
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
      <Text style={styles.chapters}>
        {project.chapters.length}章节
      </Text>
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
  chapters: {
    fontSize: 12,
    color: Colors.textLight,
  },
});
