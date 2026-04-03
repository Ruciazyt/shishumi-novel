#!/usr/bin/env node
/**
 * 自动版本号构建脚本
 * - versionCode 使用 git commit 计数（每次构建自动+1）
 * - 构建完成后自动 commit 版本号变更
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_JSON = path.join(__dirname, '../app.json');

// 1. 读取当前 versionCode
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
const currentCode = appJson.expo.android?.versionCode ?? 0;

// 2. 用 git commit 计数作为 versionCode（单调递增）
const newCode = parseInt(execSync('git rev-list --count HEAD', { cwd: __dirname + '/..' }).toString().trim(), 10);

if (newCode <= currentCode) {
  console.log(`⚠️  versionCode 无变化（当前=${currentCode}, git count=${newCode}），跳过 bump`);
} else {
  console.log(`📦 versionCode: ${currentCode} → ${newCode}`);
  appJson.expo.android = appJson.expo.android || {};
  appJson.expo.android.versionCode = newCode;
  fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2) + '\n');
}

// 3. 检查是否需要 prebuild
const androidDir = path.join(__dirname, '../android');
const needsPrebuild = !fs.existsSync(androidDir) || !fs.existsSync(path.join(androidDir, 'app/build.gradle'));

if (needsPrebuild) {
  console.log('🔧 运行 expo prebuild...');
  execSync('npx expo prebuild --platform android --clean', { cwd: __dirname + '/..', stdio: 'inherit' });
} else {
  console.log('🔧 Android 原生项目已存在，跳过 prebuild');
}

// 4. 打包 APK（debug）
console.log('📱 构建 APK...');
execSync('./gradlew assembleDebug', { cwd: androidDir, stdio: 'inherit' });

const apkPath = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
if (fs.existsSync(apkPath)) {
  console.log(`✅ APK 生成成功: ${apkPath}`);
  console.log(`   versionCode: ${newCode}`);
} else {
  console.error('❌ APK 未找到');
  process.exit(1);
}

// 5. 自动 commit 版本号变更
try {
  execSync('git add app.json', { cwd: __dirname + '/..' });
  execSync(`git commit -m "chore: bump android versionCode to ${newCode}"`, { cwd: __dirname + '/..', stdio: 'ignore' });
  console.log('✅ 版本号变更已 commit');
} catch {
  console.log('⚠️  无需 commit 或 git 不可用');
}
