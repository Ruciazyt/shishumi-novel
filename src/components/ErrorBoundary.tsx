import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界组件。
 * 捕获子组件树中任何位置的 React 渲染错误，
 * 防止单个页面崩溃导致整个应用崩溃，并展示友好的错误提示。
 *
 * 使用方式：包裹在 App.tsx 中 AppContent 外层即可。
 * 参考 Phase 3.3 任务计划。
 */
export class ErrorBoundary extends Component<Props, State> {
  static displayName = 'ErrorBoundary';

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] caught error:', error, errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>页面发生错误</Text>
            <Text style={styles.message}>
              {this.state.error?.message
                ? `错误信息：${this.state.error.message}`
                : '渲染过程中发生未知错误，应用已尝试自动恢复。'}
            </Text>
            <Text style={styles.hint}>
              请尝试返回上一页或重启应用。
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              accessibilityLabel="重试"
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>重试</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 360,
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.vermillion,
    marginBottom: Spacing.md,
    letterSpacing: 2,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: Colors.vermillion,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.textOnVermillion,
    fontSize: FontSize.md,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
