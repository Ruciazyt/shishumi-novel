import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Colors, FontSize, Spacing, ColorsAlpha, BorderRadius } from '../constants/colors';

export const LoadingScreen: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.title}>史书墨</Text>
        <Text style={styles.subtitle}>历史小说创作</Text>
        <View style={styles.decorationLine} />
        <ActivityIndicator
          size="large"
          color={Colors.vermillion}
          style={styles.spinner}
        />
      </Animated.View>
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
  decorationLine: {
    width: 48,
    height: 2,
    backgroundColor: ColorsAlpha.vermillionBadgeBorder,
    borderRadius: BorderRadius.round,
    marginTop: Spacing.lg,
  },
  spinner: {
    marginTop: Spacing.xxl,
  },
});
