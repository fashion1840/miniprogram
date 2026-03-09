# ✨ 文字转图片

> 一款简洁优雅的微信小程序，将文字快速转换为精美图片，让分享更有格调。

<p align="center">
  <img src="https://img.shields.io/badge/微信小程序-3.3.0-07c160?logo=wechat&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" />
  <img src="https://img.shields.io/badge/状态-已上线-brightgreen" />
</p>

---

## 🎨 功能特性

| 功能 | 描述 |
|------|------|
| 📝 **文字编辑** | 支持多行文字输入，实时字数统计 |
| 🎨 **丰富背景** | 12 款渐变 + 12 种纯色 + 12 种纹理 + 自定义图片 |
| 📐 **多种比例** | 支持 3:4、1:1、4:3、9:16 四种画布比例 |
| ✏️ **字体排版** | 5 种字体、字号调节、行高控制、页边距调整 |
| 🎯 **文字样式** | 12 种颜色、左中右对齐、阴影效果 |
| 💾 **一键保存** | 高清图片一键保存到相册 |

---

## 📱 界面预览

```
┌─────────────────────────┐
│      顶部预览区          │  ← 实时预览效果
│    ┌─────────────┐      │
│    │             │      │
│    │   预览画布   │      │
│    │             │      │
│    └─────────────┘      │
├─────────────────────────┤
│      底部编辑面板        │  ← 丰富的编辑选项
│  ┌───────────────────┐  │
│  │ 📝 文字内容        │  │
│  │ 🎨 画布比例        │  │
│  │ 🖼️ 背景设置        │  │
│  │ ✏️ 文字排版        │  │
│  │ 🎨 字体颜色        │  │
│  └───────────────────┘  │
├─────────────────────────┤
│    [  保存图片  ]       │  ← 悬浮操作按钮
└─────────────────────────┘
```

---

## 🛠️ 技术栈

- **框架**: 微信小程序原生开发
- **Canvas**: 2D 绘图 API
- **样式**: WXSS + CSS3 动画
- **组件化**: 自定义 Slider 组件

---

## 📂 项目结构

```
miniprogram/
├── components/
│   └── slider/              # 自定义滑块组件
├── config/
│   └── backgrounds.js       # 背景配置（渐变/纯色/纹理）
├── pages/
│   └── editor/              # 编辑器页面（核心功能）
├── utils/
│   ├── canvas.js            # Canvas 绘制引擎
│   └── store.js             # 状态管理
├── app.js                   # 小程序入口
├── app.json                 # 全局配置
└── app.wxss                 # 全局样式
```

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/fashion1840/miniprogram.git
cd miniprogram
```

### 2. 导入微信开发者工具

1. 打开 **微信开发者工具**
2. 点击「导入项目」
3. 选择项目目录
4. 填入自己的 AppID（或选择测试号）
5. 点击「确定」即可预览

---

## ✨ 核心功能实现

### 1. Canvas 绘制引擎

核心绘制逻辑位于 [canvas.js](file:///e:/GithubProject/miniprogram/utils/canvas.js)，采用面向对象设计，封装了 `TextToImage` 类：

| 方法 | 功能 |
|------|------|
| `init(canvasId)` | 初始化 Canvas 节点与 2D 上下文 |
| `setSize(width, height)` | 设置画布实际像素尺寸（支持 DPR 适配） |
| `drawBackground(options)` | 绘制渐变/纯色/纹理/自定义背景 |
| `drawText(options)` | 绘制支持 Markdown/富文本的段落 |
| `parseMarkdown(text)` | 解析 Markdown 语法（**加粗**、*斜体*、==高亮==、__下划线__） |
| `wrapMarkdownLines()` | 智能换行算法，保持样式片段完整性 |

#### DPR 适配示例

```javascript
const sysInfo = wx.getWindowInfo();
this.dpr = sysInfo.pixelRatio || 2;
this.canvas.width = width * this.dpr;
this.canvas.height = height * this.dpr;
this.ctx.scale(this.dpr, this.dpr);
```

### 2. 背景系统

支持四种背景模式：

- **渐变背景** (12款): 从上到下、从左到右、对角线等 6 种方向
- **纯色背景** (12色): 涵盖黑白红橙黄绿蓝紫粉青等常用色
- **纹理背景** (12种): 纸张、方格、圆点、横线、斜线、十字、竖线、棋盘、噪点、波浪、六边、点阵
- **自定义图片**: 支持用户从相册选择图片作为背景

### 3. 富文本解析

编辑器产出的 HTML 经过解析后转为样式片段，绘制时保持原始样式：

```javascript
// 支持的标签
<strong>/<b>     → 加粗
<em>/<i>        → 斜体
<u>/<ins>       → 下划线
<mark>          → 高亮背景
```

### 4. 文本换行算法

采用逐字符测量宽度的换行策略，确保加粗/斜体等样式片段不被截断：

```javascript
// 伪代码示例
for (const char of text) {
  const testWidth = measureText(currentText + char);
  if (testWidth > maxWidth) {
    lines.push(currentLine);  // 当前行已达最大宽度
    currentLine = [newChar];  // 新开一行
  }
}
```

---

## 🖼️ 效果演示

### 渐变背景效果

| 渐变名称 | 配色方案 |
|----------|----------|
| 🌸 梦幻紫 | `#667eea` → `#764ba2` |
| 🌊 海洋蓝 | `#4facfe` → `#00f2fe` |
| 🌅 日落橙 | `#fa709a` → `#fee140` |
| 🌿 森林绿 | `#2af598` → `#009efd` |
| 🌌 深空蓝 | `#0c3483` → `#a2b6df` |
| 🔥 烈焰 | `#ff512f` → `#dd2476` |

### 纹理背景效果

纹理背景通过 Canvas Pattern 或手动绘制实现，支持：纸张质感、方格笔记、圆点网格、斜线装饰、波浪纹理等。

### Markdown 渲染效果

输入以下文本：
```
这是一段**加粗**文字，
这是*斜体*，这是==高亮==，
这是__下划线__。
```

---

## ⚙️ 配置说明

### 背景配置

修改 [config/backgrounds.js](file:///e:/GithubProject/miniprogram/config/backgrounds.js) 可自定义背景选项：

```javascript
// 渐变背景配置
const gradients = [
  { id: 0, direction: '135deg', color1: '#667eea', color2: '#764ba2' },
  // 添加更多渐变...
];

// 纯色背景配置
const solidColors = ['#ffffff', '#000000', '#ff4d4f', ...];

// 纹理背景配置
const textures = [
  { id: 0, name: '纸张', bgColor: '#faf8f5', pattern: 'paper' },
  // 添加更多纹理...
];
```

#### 渐变方向

| direction 值 | 效果 |
|--------------|------|
| `0deg` | 从上到下 |
| `90deg` | 从左到右 |
| `180deg` | 从下到上 |
| `270deg` | 从右到左 |
| `45deg` | 左下到右上 |
| `135deg` | 左上到右下（默认） |

### 字体配置

```javascript
const fonts = [
  { name: '系统默认', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { name: '无衬线体', value: 'sans-serif' },
  { name: '衬线体', value: 'serif' },
  { name: '等宽字体', value: 'monospace' },
  { name: '苹方', value: 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif' }
];
```

### 字体颜色配置

```javascript
const fontColors = [
  '#ffffff', '#000000', '#ff4d4f', '#fa8c16', '#fadb14',
  '#52c41a', '#1890ff', '#722ed1', '#eb2f96', '#13c2c2',
  '#faad14', '#5cdbd3'
];
```

### 画布比例配置

支持的画布比例：

| 比例 | 尺寸示例 (px) | 适用场景 |
|------|---------------|----------|
| 3:4 | 540 × 720 | 朋友圈分享 |
| 1:1 | 600 × 600 | 社交头像 |
| 4:3 | 600 × 450 | 微博/博客 |
| 9:16 | 405 × 720 | 短视频封面 |

---

## 📋 常见问题

### Q: 为什么图片保存到相册失败？

A: 需要在 `app.json` 中配置权限：
```json
{
  "permission": {
    "scope.writePhotosAlbum": {
      "desc": "用于保存图片到相册"
    }
  }
}
```

### Q: 如何添加更多背景图？

A: 将图片放入 `assets/backgrounds/` 目录，并在 `config/backgrounds.js` 的 `backgrounds` 数组中添加配置。

### Q: 文字显示不完整怎么办？

A: 调整「页边距」或「字号」参数，确保文字在画布范围内。

---

## 📄 License

MIT License - feel free to use this project for any purpose.

---

## 🙏 致谢

- 微信小程序官方文档
- Canvas 2D API
