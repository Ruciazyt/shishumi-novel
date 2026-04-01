import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/colors';

export const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>史书墨</Text>
        <Text style={styles.subtitle}>历史小说创作</Text>
        <ActivityIndicator
          size="large"
          color={Colors.vermillion}
          style={styles.spinner}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.vermillion,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
    letterSpacing: 2,
  },
  spinner: {
    marginTop: Spacing.xxl,
  },
});
