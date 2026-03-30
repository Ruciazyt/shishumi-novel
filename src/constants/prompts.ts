export const PROMPTS = {
  polish: (text: string) => `你是一位历史小说作家，请将以下文本进行润色，使语言更加流畅优美，符合历史小说的风格：

${text}`,

  historical: (text: string, dynasty: string) => `时代背景：${dynasty}
请将以下文本中的现代表述或不准确的历史细节进行修改，使其符合${dynasty}时期的真实面貌：

${text}`,

  poetry: (scene: string) => `场景描述：${scene}
请推荐1-2首适合此场景的古诗词，包括诗词名称、作者、全文，并说明为何适合此场景。`,

  buddhist: (scene: string) => `场景：${scene}
请推荐适合此场景的佛教或道家经典语句，并说明出处和含义。`,

  taoist: (scene: string) => `场景：${scene}
请推荐适合此场景的道家经典语句，并说明出处和含义。`,
};

export const API_CONFIG = {
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  model: 'qwen-turbo',
};
