#!/usr/bin/env node
/**
 * 自动构建 + 发版脚本
 * 1. bump versionCode（git commit count）
 * 2. expo prebuild（如需要）
 * 3. gradle assembleDebug
 * 4. 创建 GitHub Release 并上传 APK
 */

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const APP_JSON = path.join(__dirname, '../app.json');
const REPO_OWNER = 'Ruciazyt';
const REPO_NAME = 'shishumi-novel';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN 未设置，请创建 .env 文件：\n   echo "GITHUB_TOKEN=your_token" > .env');
  process.exit(1);
}
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

// ── 1. Bump versionCode ────────────────────────────────────────────────
const currentCode = appJson.expo.android?.versionCode ?? 0;
const newCode = parseInt(execSync('git rev-list --count HEAD', { cwd: __dirname + '/..' }).toString().trim(), 10);

if (newCode <= currentCode) {
  console.log(`⚠️  versionCode 无变化（当前=${currentCode}, git count=${newCode}），跳过 bump`);
} else {
  console.log(`📦 versionCode: ${currentCode} → ${newCode}`);
  appJson.expo.android = appJson.expo.android || {};
  appJson.expo.android.versionCode = newCode;
  fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2) + '\n');
}

// ── 2. Git commit versionCode change ───────────────────────────────────
try {
  execSync('git add app.json', { cwd: __dirname + '/..', stdio: 'ignore' });
  execSync(`git commit -m "chore: bump android versionCode to ${newCode}"`, { cwd: __dirname + '/..', stdio: 'ignore' });
  console.log('✅ 版本号变更已 commit');
} catch {
  console.log('⚠️  无 commit 或 git 不可用');
}

// ── 3. Push commit ─────────────────────────────────────────────────────
try {
  execSync('git push', { cwd: __dirname + '/..', stdio: 'inherit' });
  console.log('✅ 代码已 push');
} catch {
  console.log('⚠️  git push 失败，继续构建...');
}

// ── 4. Expo prebuild ───────────────────────────────────────────────────
const androidDir = path.join(__dirname, '../android');
const needsPrebuild = !fs.existsSync(androidDir) || !fs.existsSync(path.join(androidDir, 'app/build.gradle'));

if (needsPrebuild) {
  console.log('🔧 运行 expo prebuild...');
  execSync('npx expo prebuild --platform android --clean', { cwd: __dirname + '/..', stdio: 'inherit' });
} else {
  console.log('🔧 Android 原生项目已存在，跳过 prebuild');
}

// ── 5. Gradle build ────────────────────────────────────────────────────
console.log('📱 构建 APK...');
execSync('./gradlew assembleDebug', { cwd: androidDir, stdio: 'inherit' });

const apkPath = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
if (!fs.existsSync(apkPath)) {
  console.error('❌ APK 未找到');
  process.exit(1);
}
console.log(`✅ APK 生成成功: ${apkPath}`);

// ── 6. Create GitHub Release ───────────────────────────────────────────
async function createRelease() {
  const tagName = `v${newCode}`;
  const apkData = fs.readFileSync(apkPath);
  const apkFileName = path.basename(apkPath);

  // 检查 tag 是否已存在
  let releaseId = null;

  try {
    const tagData = await githubGet(`/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/tags/${tagName}`);
    // tag 已存在，尝试找对应的 release
    try {
      const releaseData = await githubGet(`/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tagName}`);
      releaseId = releaseData.id;
      console.log(`⚠️  Release ${tagName} 已存在，删除后重建...`);
      await githubDelete(`/repos/${REPO_OWNER}/${REPO_NAME}/releases/${releaseId}`);
    } catch {
      // tag 存在但 release 不存在，正常
    }
  } catch {
    // tag 不存在，正常
  }

  // 创建 release
  const releaseData = await githubPost(`/repos/${REPO_OWNER}/${REPO_NAME}/releases`, {
    tag_name: tagName,
    name: `Build ${newCode}`,
    body: `自动构建版本\n- APK: ${apkFileName}\n- versionCode: ${newCode}\n- 构建时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
    draft: false,
    prerelease: false,
  });
  releaseId = releaseData.id;
  console.log(`✅ Release ${tagName} 创建成功 (ID: ${releaseId})`);

  // 上传 APK asset
  console.log(`📤 上传 ${apkFileName}...`);
  await githubUploadAsset(releaseId, apkFileName, apkData, 'application/vnd.android.package-archive');
  console.log(`✅ APK 已上传为 Release Asset`);
}

// ── HTTP helpers ────────────────────────────────────────────────────────
function githubApiRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = path.startsWith('https');
    const mod = isHttps ? https : http;
    const url = new URL(path.startsWith('http') ? path : `https://api.github.com${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'shishumi-build-script',
        ...headers,
      },
    };

    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function githubGet(path) {
  const res = await githubApiRequest('GET', path);
  if (res.status >= 400) throw new Error(`GitHub API GET ${path} failed: ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

async function githubPost(path, body) {
  const res = await githubApiRequest('POST', path, body, { 'Content-Type': 'application/json' });
  if (res.status >= 400) throw new Error(`GitHub API POST ${path} failed: ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

async function githubDelete(path) {
  const res = await githubApiRequest('DELETE', path);
  if (res.status >= 400) throw new Error(`GitHub API DELETE ${path} failed: ${res.status}`);
}

async function githubUploadAsset(releaseId, filename, data, contentType) {
  // 先获取上传 URL
  const release = await githubGet(`/repos/${REPO_OWNER}/${REPO_NAME}/releases/${releaseId}`);
  const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(filename)}`);

  return new Promise((resolve, reject) => {
    const url = new URL(uploadUrl);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': contentType,
        'Content-Length': data.length,
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Upload failed: ${res.statusCode} ${body}`));
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

createRelease()
  .then(() => {
    console.log('\n🎉 全部完成！');
    console.log(`   APK: ${apkPath}`);
  })
  .catch(err => {
    console.error('\n❌ Release 创建失败:', err.message);
    process.exit(1);
  });
