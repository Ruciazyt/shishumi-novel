import { Dynasty } from '../types';

export const DYNASTIES: Dynasty[] = [
  {
    id: 'tang',
    name: '唐朝',
    languageFeatures: '豪放浪漫，诗风盛行，词汇华丽典雅',
    clothingFeatures: '男子圆领袍服、蹀躞带，女子齐胸襦裙、高髻面靥',
    architectureFeatures: '斗拱雄健、飞檐翘角、规模宏大，盛行琉璃瓦',
    etiquetteFeatures: '尚武任侠，胡风盛行，礼仪开放',
  },
  {
    id: 'song',
    name: '宋朝',
    languageFeatures: '婉约细腻，词风鼎盛，语言精致内敛',
    clothingFeatures: '男子直裰、直身，女子窄袖长裙、珍珠面靥',
    architectureFeatures: '秀美精巧，园林兴盛，斗拱比例缩小',
    etiquetteFeatures: '文雅含蓄，重文轻武，礼仪繁复',
  },
  {
    id: 'yuan',
    name: '元朝',
    languageFeatures: '豪迈粗犷，戏曲兴盛，融合多民族语言',
    clothingFeatures: '男子质孙服、姑姑冠，女子罟罟袍、辫线袄子',
    architectureFeatures: '继承唐宋，融合蒙古风格，宫帐毡包',
    etiquetteFeatures: '等级分明，蒙古礼仪为主，萨满信仰',
  },
  {
    id: 'ming',
    name: '明朝',
    languageFeatures: '典雅端庄，小说繁荣，语言成熟规范',
    clothingFeatures: '男子补服、束发冠，女子比甲、凤冠霞帔',
    architectureFeatures: '砖木结构、飞檐斗拱，琉璃技术成熟',
    etiquetteFeatures: '礼仪森严，程朱理学主导，等级分明',
  },
  {
    id: 'qing',
    name: '清朝',
    languageFeatures: '白话小说鼎盛，书面语与口语分离',
    clothingFeatures: '男子长袍马褂、剃发留辫，女子旗装、花盆底鞋',
    architectureFeatures: '围合院落、四合院，官式建筑规制严格',
    etiquetteFeatures: '满汉分立，跪拜礼节，三跪九叩',
  },
];

export const getDynastyById = (id: string): Dynasty | undefined => {
  return DYNASTIES.find(d => d.id === id);
};

export const getDynastyByName = (name: string): Dynasty | undefined => {
  return DYNASTIES.find(d => d.name === name);
};

// 写作引导提示 - 与 DYNASTIES 数据分离，保持数据纯粹性
export const DYNASTY_WRITING_TIPS: Record<string, string> = {
  '唐朝': '盛唐气象，万国来朝。笔下可豪放浪漫，亦可华美典雅...',
  '宋朝': '婉约细腻，文雅含蓄。词风鼎盛，细节精致入微...',
  '元朝': '豪迈粗犷，融合多民族风情。戏曲兴盛，语言奔放...',
  '明朝': '典雅端庄，礼仪森严。小说繁荣，叙事宏阔...',
  '清朝': '白话鼎盛，满汉交融。世情小说，人物众生...',
};
