// ── 静态开发者日志 ──
export interface HighlightItem {
  text: string;          // 主条目文字（不含序号）
  subItems?: string[];   // 可选子条目列表
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: HighlightItem[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.0-alpha',
    date: '2026-08-14',
    title: '功能迭代与移动端适配',
    highlights: [
      {
        text: '修复超长文本导致的大面积占用问题，现在超长文本有三种显示方式：',
        subItems: [
          '可编辑文本：文本高度锁定，可上下滚动；',
          '已编辑文本：文本默认省略折叠，点击展开，再次点击收起；',
          '已编辑、存在其他相同文本：省略。',
        ],
      },
      { text: '"新手教程"代码逻辑重写，现在"新手教程"在完成步骤前后会自动跳转，教程引导更沉浸。' },
      { text: '"任务管理"、"项目管理"、"番茄钟"、"随手清单"页面新增"归档"模块，页面更简洁。' },
      { text: '"任务管理"、"项目管理"页面新增"排序"功能，管理更高效。' },
      {
        text: '"扭蛋机"页面优化：',
        subItems: [
          '新增"打卡任务"功能；',
          '新增"代币任务"模块，整合所有代币任务，分区更清晰；',
          '新增"代币记录"模块，代币流水透明。',
        ],
      },
      { text: '新增"设置"页面，包含"系统开关"、"开发者日志"、"用户反馈"三个新功能。' },
      { text: '新增竖版移动端UI，所有页面重写。现在当网页比例被识别为移动端时，自动切换为竖版移动端UI，解决了在手机等移动设备上访问网站可能显示混乱的问题。' },
      { text: '优化了一系列UI，视觉效果更协调。' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-08',
    title: '首个公开试运行版本',
    highlights: [
      { text: '首个公开试运行版本。' },
    ],
  },
];
