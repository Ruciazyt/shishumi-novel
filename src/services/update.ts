import { Linking, Alert, Platform } from 'react-native';

const REPO_OWNER = 'Ruciazyt';
const REPO_NAME = 'shishumi-novel';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

export interface ReleaseInfo {
  tagName: string;
  version: string;
  downloadUrl: string | null;
  htmlUrl: string;
  publishedAt: string;
  body: string;
}

export const getAppVersion = (): string => {
  // 从 app.json 的 version 字段读取
  // 这个值需要在构建时注入，暂时用硬编码
  return '0.1.0';
};

export const compareVersions = (v1: string, v2: string): number => {
  // 简单的版本比较，v2 更新返回 1，相等返回 0，v1 更新返回 -1
  // 处理格式如: v20260401-063605 或 0.1.0
  const normalize = (v: string) => {
    // 移除前导 v
    let normalized = v.startsWith('v') ? v.slice(1) : v;
    // 如果是日期格式如 20260401-063605，转为可比较的数字
    if (/^\d{8}-\d{6}$/.test(normalized)) {
      // 格式: YYYYMMDD-HHMMSS
      return normalized.replace(/-/g, '').replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1$2$3$4$5.$6');
    }
    // 标准语义化版本
    return normalized.replace(/\./g, '');
  };

  const n1 = normalize(v1);
  const n2 = normalize(v2);

  if (n2 > n1) return 1;
  if (n2 < n1) return -1;
  return 0;
};

export const checkForUpdate = async (): Promise<ReleaseInfo | null> => {
  try {
    const response = await fetch(LATEST_RELEASE_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      console.error('[update] Failed to fetch release info:', response.status);
      return null;
    }

    const data = await response.json();

    const tagName: string = data.tag_name || '';
    const htmlUrl: string = data.html_url || '';
    const publishedAt: string = data.published_at || '';
    const body: string = data.body || '';

    // 查找 APK 资源
    let downloadUrl: string | null = null;
    if (data.assets && Array.isArray(data.assets)) {
      const apkAsset = data.assets.find((asset: { name: string }) =>
        asset.name.endsWith('.apk')
      );
      if (apkAsset) {
        downloadUrl = apkAsset.browser_download_url;
      }
    }

    // 从 tag 提取版本号
    const version = tagName.startsWith('v') ? tagName.slice(1) : tagName;

    return {
      tagName,
      version,
      downloadUrl,
      htmlUrl,
      publishedAt,
      body,
    };
  } catch (error) {
    console.error('[update] Error checking for update:', error);
    return null;
  }
};

export const showUpdateDialog = (release: ReleaseInfo, onUpdate: () => void, onLater: () => void) => {
  const message = `发现新版本: ${release.version}\n\n更新时间: ${new Date(release.publishedAt).toLocaleDateString('zh-CN')}`;

  Alert.alert(
    '发现新版本',
    message,
    [
      {
        text: '稍后',
        style: 'cancel',
        onPress: onLater,
      },
      {
        text: '下载更新',
        onPress: onUpdate,
      },
    ],
    { cancelable: false }
  );
};

export const downloadAndInstall = async (url: string): Promise<void> => {
  try {
    // 直接打开下载链接，用户会下载 APK
    // 在 Android 上，这会调用浏览器下载
    // 安装需要用户手动确认（因为不是从 Play Store）
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('错误', '无法打开下载链接');
    }
  } catch (error) {
    console.error('[update] Error opening download URL:', error);
    Alert.alert('错误', '下载失败，请稍后重试');
  }
};

export const openReleasePage = async (url: string): Promise<void> => {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  } catch (error) {
    console.error('[update] Error opening release page:', error);
  }
};
