// 古诗词分类数据与经典引用
// 注：当前版本通过 AI prompts 动态生成诗词推荐，
// 以下接口和本地诗词库保留供未来扩展使用。

export interface Poetry {
  title: string;
  author: string;
  content: string[];
  translation?: string;
  interpretation?: string;
}

export interface ClassicQuote {
  text: string;
  source: string;
  meaning?: string;
}
