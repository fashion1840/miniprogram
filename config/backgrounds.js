// miniprogram/config/backgrounds.js
// 背景配置（渐变、纯色、图片）

// 渐变背景配置
const gradients = [
  { id: 0, direction: '135deg', color1: '#667eea', color2: '#764ba2' },
  { id: 1, direction: '135deg', color1: '#4facfe', color2: '#00f2fe' },
  { id: 2, direction: '135deg', color1: '#fa709a', color2: '#fee140' },
  { id: 3, direction: '135deg', color1: '#2af598', color2: '#009efd' },
  { id: 4, direction: '135deg', color1: '#0c3483', color2: '#a2b6df' },
  { id: 5, direction: '135deg', color1: '#ff512f', color2: '#dd2476' },
  { id: 6, direction: '135deg', color1: '#134e5e', color2: '#71b280' },
  { id: 7, direction: '135deg', color1: '#fc5c7d', color2: '#6a82fb' },
  { id: 8, direction: '135deg', color1: '#f093fb', color2: '#f5576c' },
  { id: 9, direction: '135deg', color1: '#4facfe', color2: '#43e97b' },
  { id: 10, direction: '135deg', color1: '#fa709a', color2: '#f6d365' },
  { id: 11, direction: '135deg', color1: '#30cfd0', color2: '#330867' }
];

// 纯色背景配置
const solidColors = ['#ffffff', '#000000', '#1a1a2e', '#16213e', '#0f3460', '#667eea', '#764ba2', '#f093fb', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];

// 纹理背景配置（12种纹理样式）
const textures = [
  { id: 0, name: '纸张', bgColor: '#faf8f5', pattern: 'paper' },
  { id: 1, name: '方格', bgColor: '#ffffff', pattern: 'grid' },
  { id: 2, name: '圆点', bgColor: '#f5f5f5', pattern: 'dots' },
  { id: 3, name: '横线', bgColor: '#ffffff', pattern: 'horizontal' },
  { id: 4, name: '斜线', bgColor: '#ffffff', pattern: 'diagonal' },
  { id: 5, name: '十字', bgColor: '#f8f8f8', pattern: 'cross' },
  { id: 6, name: '竖线', bgColor: '#ffffff', pattern: 'vertical' },
  { id: 7, name: '棋盘', bgColor: '#f0f0f0', pattern: 'checkerboard' },
  { id: 8, name: '噪点', bgColor: '#f5f5f5', pattern: 'noise' },
  { id: 9, name: '波浪', bgColor: '#fafafa', pattern: 'waves' },
  { id: 10, name: '六边', bgColor: '#f0f0f0', pattern: 'hexagon' },
  { id: 11, name: '点阵', bgColor: '#ffffff', pattern: 'dotgrid' }
];

// 字体颜色配置
const fontColors = ['#ffffff', '#000000', '#ff4d4f', '#fa8c16', '#fadb14', '#52c41a', '#1890ff', '#722ed1', '#eb2f96', '#13c2c2', '#faad14', '#5cdbd3'];

// 字体配置（5个系统字体）
const fonts = [
  { name: '系统默认', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { name: '无衬线体', value: 'sans-serif' },
  { name: '衬线体', value: 'serif' },
  { name: '等宽字体', value: 'monospace' },
  { name: '苹方', value: 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif' }
];

// 预设背景图配置
const backgrounds = [
    {
      id: 0,
      name: '渐变紫',
      thumb: '/assets/backgrounds/bg1-thumb.jpg',
      full: '/assets/backgrounds/bg1.jpg',
      colors: ['#667eea', '#764ba2']
    },
    {
      id: 1,
      name: '渐变蓝',
      thumb: '/assets/backgrounds/bg2-thumb.jpg',
      full: '/assets/backgrounds/bg2.jpg',
      colors: ['#4facfe', '#00f2fe']
    },
    {
      id: 2,
      name: '渐变橙',
      thumb: '/assets/backgrounds/bg3-thumb.jpg',
      full: '/assets/backgrounds/bg3.jpg',
      colors: ['#fa709a', '#fee140']
    },
    {
      id: 3,
      name: '渐变青',
      thumb: '/assets/backgrounds/bg4-thumb.jpg',
      full: '/assets/backgrounds/bg4.jpg',
      colors: ['#2af598', '#009efd']
    },
    {
      id: 4,
      name: '深空蓝',
      thumb: '/assets/backgrounds/bg5-thumb.jpg',
      full: '/assets/backgrounds/bg5.jpg',
      colors: ['#0c3483', '#a2b6df']
    },
    {
      id: 5,
      name: '日落',
      thumb: '/assets/backgrounds/bg6-thumb.jpg',
      full: '/assets/backgrounds/bg6.jpg',
      colors: ['#ff512f', '#dd2476']
    },
    {
      id: 6,
      name: '森林',
      thumb: '/assets/backgrounds/bg7-thumb.jpg',
      full: '/assets/backgrounds/bg7.jpg',
      colors: ['#134e5e', '#71b280']
    },
    {
      id: 7,
      name: '简约白',
      thumb: '/assets/backgrounds/bg8-thumb.jpg',
      full: '/assets/backgrounds/bg8.jpg',
      colors: ['#ffffff', '#f5f5f5']
    }
  ];

module.exports = {
  backgrounds,
  gradients,
  solidColors,
  textures,
  fontColors,
  fonts
};
