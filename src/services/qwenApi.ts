// 通义千问 API 服务
import { QWEN_API_URL, QWEN_MODEL } from '../utils/constants';

interface QwenRequest {
  model: string;
  input: {
    prompt: string;
  };
}

interface QwenResponse {
  output: {
    text: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export type AIOperationType = 'polish' | 'history_detail' | 'era_query' | 'poetry' | 'quote';

// 通义千问 API 调用
export async function callQwenAPI(apiKey: string, prompt: string): Promise<string> {
  if (!apiKey) {
    throw new Error('请先在设置中配置通义千问 API Key');
  }

  const requestBody: QwenRequest = {
    model: QWEN_MODEL,
    input: { prompt },
  };

  const response = await fetch(QWEN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API 请求失败: ${response.status}`);
  }

  const data: QwenResponse = await response.json();
  return data.output?.text || '未获得有效回复';
}

// 构建提示词
export function buildPrompt(type: AIOperationType, content: string, era?: string): string {
  const prompts: Record<AIOperationType, string> = {
    polish: `你是一位历史小说写作专家，擅长创作具有深厚历史底蕴的小说作品。请对以下文本进行润色优化：

要求：
1. 保持原文的核心情节和人物关系
2. 增强文字的古风韵味，可适当融入文言表达
3. 丰富场景描写的细节（服饰、建筑、环境等）
4. 优化人物对话，使其更符合历史背景

原文：
${content}

请直接输出润色后的文本，不要添加额外说明。`,

    history_detail: `你是一位精通中国历史的学者。请为以下场景提供历史细节还原建议：

场景描述：${content}
时代背景：${era || '未指定'}

请从以下几个方面提供详细的历史细节描述：
1. 服饰装束
2. 建筑环境
3. 礼仪制度
4. 生活器物
5. 语言习惯

请用生动形象的语言描述，适合直接用于小说创作。`,

    era_query: `你是一位中国历史专家。请详细介绍 "${content}" 时期的历史背景和特征：

请涵盖以下方面：
1. 时代概述（时间跨度、政治格局）
2. 社会风貌
3. 重要制度
4. 文化特色
5. 常见器物
6. 礼仪风俗
7. 语言特点

请用通俗易懂的语言描述，适合用于历史小说创作参考。`,

    poetry: `你是一位古典文学专家。请根据以下场景推荐适合的古诗词：

场景描述：${content}
时代背景：${era || '通用'}

请从以下方面推荐：
1. 直接可引用的经典诗句（注明出处）
2. 描写类似场景或情感的诗词
3. 适合融入场景的经典诗句

请列出具体诗句和出处，适合直接用于小说引用。`,

    quote: `你是一位佛道文化专家。请根据以下场景推荐适合引用的佛家或道家经典语句：

场景描述：${content}

请推荐：
1. 佛家经典语句（如《金刚经》《心经》《法华经》等）
2. 道家经典语句（如《道德经》《庄子》等）
3. 说明引用方式和适合的场景

请注明具体出处，适合用于增添小说的文化深度。`,
  };

  return prompts[type] || prompts.polish;
}

// 文本润色
export async function polishText(apiKey: string, content: string, era?: string): Promise<string> {
  const prompt = buildPrompt('polish', content, era);
  return callQwenAPI(apiKey, prompt);
}

// 历史细节还原
export async function getHistoryDetail(apiKey: string, content: string, era?: string): Promise<string> {
  const prompt = buildPrompt('history_detail', content, era);
  return callQwenAPI(apiKey, prompt);
}

// 时代背景查询
export async function queryEra(apiKey: string, era: string): Promise<string> {
  const prompt = buildPrompt('era_query', era);
  return callQwenAPI(apiKey, prompt);
}

// 古诗词推荐
export async function recommendPoetry(apiKey: string, content: string, era?: string): Promise<string> {
  const prompt = buildPrompt('poetry', content, era);
  return callQwenAPI(apiKey, prompt);
}

// 经典引用推荐
export async function recommendQuote(apiKey: string, content: string): Promise<string> {
  const prompt = buildPrompt('quote', content);
  return callQwenAPI(apiKey, prompt);
}
