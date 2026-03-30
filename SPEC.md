# 史书墨 - 技术规格说明书

## 1. 项目概述
- **项目名称**：史书墨
- **项目类型**：Android移动应用
- **核心功能**：历史小说AI辅助创作工具，帮助作者还原历史细节、查阅资料、引用古诗词
- **目标用户**：历史小说创作者

## 2. 技术栈
- **框架**：React Native (Expo)
- **语言**：TypeScript
- **AI服务**：通义千问 API (qwen-turbo)
- **最低Android版本**：7.0 (API 24)
- **状态管理**：React Context + useReducer
- **本地存储**：AsyncStorage

## 3. 功能模块

### 3.1 项目管理
- 创建/编辑/删除小说项目
- 每个项目包含：书名、时代背景、简介
- 章节CRUD

### 3.2 AI辅助写作
- **润色功能**：优化文本表达
- **历史细节还原**：根据时代背景自动修改细节（服饰/建筑/礼仪等）
- **资料查询**：输入关键词，返回历史资料摘要

### 3.3 诗词推荐
- 根据场景内容推荐古诗词
- 支持诗词分类（唐诗/宋词/诗经等）
- 支持佛教/道家经典引用
- 一键将诗词插入文本

### 3.4 时代背景库
- 预设朝代列表（唐/宋/元/明/清等）
- 每个朝代的：语言特点、服饰特征、建筑风格、礼仪制度
- AI根据时代背景自动调整文本

## 4. UI设计

### 4.1 页面结构
- **首页**：项目列表
- **项目详情页**：章节列表
- **写作页**：富文本编辑 + AI工具栏
- **设置页**：API配置、主题设置

### 4.2 设计风格
- 简约中国风
- 主色调：墨色(#2C2C2C)、宣纸白(#F5F0E8)、朱砂红(#C73E3A)
- 字体：系统默认中文

## 5. API设计

### 5.1 通义千问调用
- 端点：https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
- 模型：qwen-turbo
- 预设Prompt模板（详见下节）

### 5.2 Prompt设计

#### 润色Prompt
```
你是一位历史小说作家，请将以下文本进行润色，使语言更加流畅优美，符合历史小说的风格：

{user_text}
```

#### 历史细节还原Prompt
```
时代背景：{dynasty}
请将以下文本中的现代表述或不准确的历史细节进行修改，使其符合{era}时期的真实面貌：

{user_text}
```

#### 诗词推荐Prompt
```
场景描述：{scene}
请推荐1-2首适合此场景的古诗词，包括诗词名称、作者、全文，并说明为何适合此场景。
```

#### 佛道经典引用Prompt
```
场景：{scene}
请推荐适合此场景的佛教或道家经典语句，并说明出处和含义。
```

## 6. 数据结构

### 6.1 项目(Project)
```typescript
interface Project {
  id: string;
  title: string;
  dynasty: string;
  description: string;
  chapters: Chapter[];
  createdAt: number;
  updatedAt: number;
}
```

### 6.2 章节(Chapter)
```typescript
interface Chapter {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
```

## 7. 验收标准
- [ ] APK可正常安装
- [ ] 项目CRUD功能正常
- [ ] 章节CRUD功能正常
- [ ] AI润色功能可用
- [ ] AI历史细节还原功能可用
- [ ] AI诗词推荐功能可用
- [ ] 时代背景切换有效影响AI输出
