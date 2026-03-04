// pages/editor/editor.js
const app = getApp();
const TextToImage = require('../../utils/canvas');
const { gradients, solidColors, textures, fontColors, fonts } = require('../../config/backgrounds');

// Canvas 默认尺寸常量
const CANVAS_WIDTH = 900;
const REALTIME_RENDER_INTERVAL = 50;

let canvasInstance = null;
let editorCtx = null;
let renderTimer = null;
let realtimeRenderTimer = null;
let lastRealtimeRenderAt = 0;
let showGuideTimer = null;
let renderVersion = 0;

// 根据比例计算高度（用于保存，宽度 900）
function getHeightByRatio(ratio, width = 900) {
  switch(ratio) {
    case '3:4': return width * 4 / 3;  // 1200
    case '1:1': return width;            // 900
    case '4:3': return width * 3 / 4;   // 675
    case '9:16': return width * 16 / 9; // 1600
    default: return width * 4 / 3;      // 默认 3:4
  }
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextToEditorHtml(text = '') {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');
}

function normalizeEditorPlainText(text = '') {
  return String(text || '').replace(/\r/g, '');
}

Page({
  data: {
    // 文字
    text: '',
    richTextHtml: '',
    charCount: 0,
    
    // 图片比例
    ratios: [
      { label: '3:4', value: '3:4' },
      { label: '1:1', value: '1:1' },
      { label: '4:3', value: '4:3' },
      { label: '9:16', value: '9:16' }
    ],
    currentRatio: '3:4',
    ratioClass: 'ratio-3-4',
    
    // 背景样式
    bgStyle: 'gradient', // 实际应用的样式：gradient, solid, custom
    activeTab: 'gradient', // 当前选中的标签卡
    bgIndex: 0,
    bgColor: '#667eea',
    bgImage: '',
    
    // 渐变背景（从配置文件引入）
    gradients: gradients,
    
    // 纯色背景（从配置文件引入）
    solidColors: solidColors,
    
    // 纹理背景（从配置文件引入）
    textures: textures,
    textureIndex: 0,
    
    // 字体（从配置文件引入）
    fonts: fonts,
    fontIndex: 0,
    fontSize: 50,
    fontColor: '#ffffff',
    fontColors: fontColors,
    textAlign: 'center',
    lineHeight: 1.5,
    padding: 40,
    shadowEnabled: false,
    
    // 生成状态
    isGenerating: false,
    
    // 空状态引导显示
    showEmptyGuide: false,
    
    // Markdown 支持
    enableMarkdown: true,
    
    // 页脚信息
    enableFooter: false,
    footerAuthor: '',
    footerDate: ''
  },

  onLoad() {
    // 延迟显示空状态引导，避免初始闪烁
    showGuideTimer = setTimeout(() => {
      this.setData({ showEmptyGuide: true });
      showGuideTimer = null;
    }, 500);
    // 统一从本地存储恢复状态
    const hasSavedState = this.restoreState();
    
    // 如果有保存的状态，应用它
    if (hasSavedState && app.globalData.editorData) {
      const editorData = app.globalData.editorData;
      const ratioClass = editorData.currentRatio ? 'ratio-' + editorData.currentRatio.replace(':', '-') : 'ratio-3-4';
      this.setData({
        ...editorData,
        activeTab: editorData.activeTab || editorData.bgStyle || 'gradient',
        richTextHtml: editorData.richTextHtml || plainTextToEditorHtml(editorData.text || ''),
        charCount: editorData.text ? editorData.text.length : 0,
        ratioClass
      });
    } else {
      // 使用默认状态
      this.setData({
        ratioClass: 'ratio-' + this.data.currentRatio.replace(':', '-')
      });
    }
    
    this.initCanvas();
  },

  async onShow() {
    // 页面显示时重新渲染 Canvas（处理从预览页返回的情况）
    if (canvasInstance && canvasInstance.isReady()) {
      await this.doRender();
    }
  },

  onHide() {
    this.saveState();
  },

  onUnload() {
    this.saveState();
    // 清理定时器和 Canvas 实例，防止内存泄漏
    this.clearRenderTimer();
    this.clearRealtimeRenderTimer();
    if (showGuideTimer) {
      clearTimeout(showGuideTimer);
      showGuideTimer = null;
    }
    lastRealtimeRenderAt = 0;
    renderVersion += 1;
    canvasInstance = null;
    editorCtx = null;
  },

  // 清理渲染定时器
  clearRenderTimer() {
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
  },

  // 清理实时渲染定时器
  clearRealtimeRenderTimer() {
    if (realtimeRenderTimer) {
      clearTimeout(realtimeRenderTimer);
      realtimeRenderTimer = null;
    }
  },

  // 滑块拖动实时预览（节流）
  scheduleRealtimeRender() {
    const now = Date.now();
    const elapsed = now - lastRealtimeRenderAt;

    if (elapsed >= REALTIME_RENDER_INTERVAL && !realtimeRenderTimer) {
      lastRealtimeRenderAt = now;
      this.doRender();
      return;
    }

    if (realtimeRenderTimer) {
      return;
    }

    const wait = Math.max(REALTIME_RENDER_INTERVAL - elapsed, 0);
    realtimeRenderTimer = setTimeout(() => {
      realtimeRenderTimer = null;
      lastRealtimeRenderAt = Date.now();
      this.doRender();
    }, wait);
  },

  // 初始化 Canvas
  async initCanvas() {
    try {
      if (!canvasInstance) {
        canvasInstance = new TextToImage();
      }
      // 每次初始化都要调用 init，因为页面重新加载后 Canvas 节点会变化
      await canvasInstance.init('#previewCanvas');
    
    // 根据当前比例计算预览分辨率
    const width = CANVAS_WIDTH;
    const ratio = this.data.currentRatio || '3:4';
    const height = getHeightByRatio(ratio, width);
    
      canvasInstance.setSize(width, height);
      await this.doRender();
    } catch (err) {
      wx.showToast({ title: '初始化失败，请重试', icon: 'none' });
    }
  },

  // 渲染预览（带防抖）
  renderPreview() {
    this.clearRenderTimer();
    this.clearRealtimeRenderTimer();
    renderTimer = setTimeout(() => this.doRender(), 300);
  },

  // 执行渲染
  async doRender() {
    if (!canvasInstance || !canvasInstance.isReady()) {
      return false;
    }

    const currentVersion = ++renderVersion;
    const width = CANVAS_WIDTH;
    const ratio = this.data.currentRatio || '3:4';
    const height = getHeightByRatio(ratio, width);
    const d = this.data;
    const safeFont = d.fonts[d.fontIndex] || d.fonts[0] || { value: 'sans-serif' };

    // 绘制背景（异步）
    await canvasInstance.drawBackground({
      bgStyle: d.bgStyle,
      bgIndex: d.bgIndex,
      bgColor: d.bgColor,
      bgImage: d.bgImage,
      gradients: d.gradients,
      textures: d.textures,
      textureIndex: d.textureIndex,
      width,
      height
    });

    // 如果有更新的渲染任务启动，则终止当前任务，避免旧画面覆盖新画面
    if (currentVersion !== renderVersion) {
      return false;
    }

    // 绘制文字
    canvasInstance.drawText({
      text: d.text,
      richTextHtml: d.richTextHtml,
      fontSize: d.fontSize,
      fontColor: d.fontColor,
      fontFamily: safeFont.value,
      textAlign: d.textAlign,
      lineHeight: d.lineHeight,
      padding: d.padding,
      shadowEnabled: d.shadowEnabled,
      width,
      height,
      enableMarkdown: d.enableMarkdown,
      highlightColor: '#ffe66d'
    });

    if (currentVersion !== renderVersion) {
      return false;
    }

    // 绘制页脚
    if (d.enableFooter && (d.footerAuthor || d.footerDate)) {
      canvasInstance.drawFooter({
        author: d.footerAuthor,
        date: d.footerDate,
        fontSize: 24,
        fontColor: d.fontColor,
        fontFamily: safeFont.value,
        width,
        height,
        padding: d.padding
      });
    }

    return true;
  },
    
  // 事件处理
  onEditorReady() {
    const query = wx.createSelectorQuery();
    query.select('#mainEditor').context((res) => {
      if (!res || !res.context) return;
      editorCtx = res.context;
      const html = this.data.richTextHtml || plainTextToEditorHtml(this.data.text || '');
      if (html) {
        editorCtx.setContents({
          html,
          success: () => {
            this.syncEditorContents({ render: false, save: false });
          }
        });
      }
    }).exec();
  },

  onEditorInput(e) {
    const html = (e.detail && e.detail.html) || '';
    const plain = normalizeEditorPlainText((e.detail && e.detail.text) || '');
    this.setData({
      text: plain,
      richTextHtml: html,
      charCount: plain.length
    });
    this.renderPreview();
  },

  syncEditorContents({ render = true, save = true } = {}) {
    if (!editorCtx) return;
    editorCtx.getContents({
      success: (res) => {
        const html = (res && res.html) || '';
        const text = normalizeEditorPlainText((res && res.text) || '');
        this.setData({
          text,
          richTextHtml: html,
          charCount: text.length
        }, () => {
          if (render) this.renderPreview();
          if (save) this.saveState();
        });
      }
    });
  },

  applyEditorFormat(name, value = true) {
    if (!editorCtx) {
      wx.showToast({ title: '编辑器未就绪', icon: 'none' });
      return;
    }
    editorCtx.format(name, value);
    setTimeout(() => this.syncEditorContents({ render: true, save: true }), 0);
  },

  // Markdown 工具栏 - 选区加粗
  insertBold() {
    this.applyEditorFormat('bold', true);
  },

  // Markdown 工具栏 - 选区斜体
  insertItalic() {
    this.applyEditorFormat('italic', true);
  },

  // Markdown 工具栏 - 选区下划线
  insertUnderline() {
    this.applyEditorFormat('underline', true);
  },

  // Markdown 工具栏 - 选区高亮
  insertHighlight() {
    this.applyEditorFormat('backgroundColor', '#ffe66d');
  },

  // Markdown 工具栏 - 插入链接
  insertLink() {
    wx.showToast({ title: '暂不支持链接格式', icon: 'none' });
  },

  // 加载示例文案
  loadDemoText() {
    const demoTexts = [
      '生活明朗，万物可爱',
      '保持热爱，奔赴山海',
      '凡是过往，皆为序章',
      '心有猛虎，细嗅蔷薇',
      '星光不问赶路人，时光不负有心人'
    ];
    const randomText = demoTexts[Math.floor(Math.random() * demoTexts.length)];
    const richTextHtml = plainTextToEditorHtml(randomText);
    this.setData({ 
      text: randomText,
      richTextHtml,
      charCount: randomText.length,
      showEmptyGuide: false 
    }, () => {
      if (editorCtx) {
        editorCtx.setContents({ html: richTextHtml });
      }
      this.renderPreview();
      this.saveState();
    });
  },

  onClearText() {
    this.setData({ text: '', richTextHtml: '', charCount: 0 }, () => {
      if (editorCtx) {
        editorCtx.clear();
      }
      this.renderPreview();
      this.saveState();
    });
  },

  // 一键重置所有样式
  onResetAll() {
    wx.showModal({
      title: '恢复默认',
      content: '确定要重置所有设置吗？',
      confirmColor: '#4facfe',
      success: (res) => {
        if (res.confirm) {
          const defaultData = {
            text: '',
            richTextHtml: '',
            charCount: 0,
            currentRatio: '3:4',
            ratioClass: 'ratio-3-4',
            bgStyle: 'gradient',
            activeTab: 'gradient',
            bgIndex: 0,
            bgColor: '#667eea',
            bgImage: '',
            textureIndex: 0,
            fontIndex: 0,
            fontSize: 50,
            fontColor: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.5,
            padding: 40,
            shadowEnabled: false,
            enableMarkdown: true,
            enableFooter: false,
            footerAuthor: '',
            footerDate: ''
          };
          this.setData(defaultData, () => {
            if (editorCtx) {
              editorCtx.clear();
            }
            this.initCanvas();
            this.saveState();
            wx.showToast({ title: '已重置', icon: 'success' });
          });
        }
      }
    });
  },

  onRatioChange(e) {
    const ratio = e.currentTarget.dataset.ratio;
    const ratioClass = 'ratio-' + ratio.replace(':', '-');
    this.setData({ currentRatio: ratio, ratioClass });
    // 重新初始化 Canvas
    this.initCanvas();
  },

  onBgStyleChange(e) {
    const style = e.currentTarget.dataset.style;
    
    // 如果切换到自定义图片且有已上传的图片，自动恢复
    if (style === 'custom' && this.data.bgImage) {
      this.setData({ 
        activeTab: style,
        bgStyle: 'custom'
      });
      this.renderPreview();
    } else {
      // 其他选项卡（渐变、纯色、纹理）仅切换选项卡，不自动应用样式
      this.setData({ activeTab: style });
    }
  },

  onBgSelect(e) {
    this.setData({ 
      bgIndex: e.currentTarget.dataset.index,
      bgStyle: 'gradient' // 真正应用渐变样式
    });
    this.renderPreview();
  },

  onSolidColorChange(e) {
    this.setData({ 
      bgColor: e.currentTarget.dataset.color,
      bgStyle: 'solid' // 真正应用纯色样式
    });
    this.renderPreview();
  },

  onTextureSelect(e) {
    this.setData({ 
      textureIndex: e.currentTarget.dataset.index,
      bgStyle: 'texture' // 真正应用纹理样式
    });
    this.renderPreview();
  },

  onUploadBackground() {
    // 使用 wx.chooseMedia 选择图片
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '正在处理图片...' });

        // 验证图片路径是否有效
        wx.getImageInfo({
          src: tempFilePath,
          success: () => {
            this.setData({
              bgImage: tempFilePath,
              bgStyle: 'custom',
              activeTab: 'custom'
            }, () => {
              this.saveState();
              this.doRender()
                .then((rendered) => {
                  if (!rendered) {
                    this.renderPreview();
                  }
                })
                .catch(() => {
                  wx.showToast({ title: '图片渲染失败', icon: 'none' });
                })
                .finally(() => {
                  wx.hideLoading();
                });
            });
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '图片加载失败', icon: 'none' });
          }
        });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '选择图片失败', icon: 'none' });
        }
      }
    });
  },

  onFontChange(e) {
    const idx = Number(e.detail.value);
    const maxIndex = this.data.fonts.length - 1;
    const fontIndex = Number.isFinite(idx) ? Math.max(0, Math.min(idx, maxIndex)) : 0;
    this.setData({ fontIndex });
    this.renderPreview();
  },

  onTextAlignChange(e) {
    this.setData({ textAlign: e.currentTarget.dataset.align });
    this.renderPreview();
  },

  // 字号 - 拖动时实时预览
  onFontSizeChanging(e) {
    this.setData({ fontSize: e.detail.value });
    this.scheduleRealtimeRender();
  },
  onFontSizeChange(e) {
    this.setData({ fontSize: e.detail.value });
    this.scheduleRealtimeRender();
    this.saveState();
  },

  // 行高 - 拖动时实时预览
  onLineHeightChanging(e) {
    this.setData({ lineHeight: e.detail.value });
    this.scheduleRealtimeRender();
  },
  onLineHeightChange(e) {
    this.setData({ lineHeight: e.detail.value });
    this.scheduleRealtimeRender();
    this.saveState();
  },

  // 页边距 - 拖动时实时预览
  onPaddingChanging(e) {
    this.setData({ padding: e.detail.value });
    this.scheduleRealtimeRender();
  },
  onPaddingChange(e) {
    this.setData({ padding: e.detail.value });
    this.scheduleRealtimeRender();
    this.saveState();
  },

  onShadowToggle(e) {
    this.setData({ shadowEnabled: e.detail.value });
    this.renderPreview();
  },

  onFontColorChange(e) {
    this.setData({ fontColor: e.currentTarget.dataset.color });
    this.renderPreview();
  },

  // Markdown 开关
  onMarkdownToggle(e) {
    this.setData({ enableMarkdown: e.detail.value });
    this.renderPreview();
    this.saveState();
  },

  // 页脚开关
  onFooterToggle(e) {
    const enableFooter = e.detail.value;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.setData({ 
      enableFooter,
      footerDate: dateStr
    });
    this.renderPreview();
    this.saveState();
  },

  // 页脚作者输入
  onFooterAuthorInput(e) {
    this.setData({ footerAuthor: e.detail.value });
    this.renderPreview();
    this.saveState();
  },

  // 页脚日期输入
  onFooterDateInput(e) {
    this.setData({ footerDate: e.detail.value });
    this.renderPreview();
    this.saveState();
  },

  // 保存状态
  saveState() {
    const keys = ['text', 'richTextHtml', 'currentRatio', 'bgStyle', 'activeTab', 'bgIndex', 'bgColor', 'bgImage',
                  'textureIndex', 'fontIndex', 'fontSize', 'fontColor', 'textAlign', 'lineHeight', 'padding', 'shadowEnabled',
                  'enableMarkdown', 'enableFooter', 'footerAuthor', 'footerDate'];
    const editorData = {};
    keys.forEach(key => editorData[key] = this.data[key]);
    app.globalData.editorData = editorData;
    
    // 同时保存到本地存储，防止小程序被直接关闭导致数据丢失
    try {
      wx.setStorageSync('editorData', editorData);
    } catch (e) {
    }
  },

  // 从本地存储恢复状态
  restoreState() {
    try {
      const savedData = wx.getStorageSync('editorData');
      if (savedData) {
        // 合并到 globalData
        app.globalData.editorData = { ...app.globalData.editorData, ...savedData };
        return true;
      }
    } catch (e) {
    }
    return false;
  },

  // 下载图片 - 直接下载当前预览
  onDownload() {
    if (this.data.isGenerating) {
      return;
    }
    if (!this.data.text.trim()) {
      wx.showToast({ title: '请输入文字', icon: 'none' });
      return;
    }

    this.setData({ isGenerating: true });
    this.saveState();
    
    // 直接在当前页面生成并下载
    this.generateAndSave();
  },
  
  // 生成并保存
  async generateAndSave() {
    if (!canvasInstance) {
      this.setData({ isGenerating: false });
      return;
    }
    
    // 确保渲染完成（包括异步背景图）
    await this.doRender();
    
    try {
      const tempFilePath = await canvasInstance.toTempFilePath();
      
      wx.saveImageToPhotosAlbum({
        filePath: tempFilePath,
        success: () => {
          wx.showToast({ title: '保存成功', icon: 'success' });
          this.setData({ isGenerating: false });
        },
        fail: (err) => {
          if (err.errMsg && (err.errMsg.includes('auth deny') || err.errMsg.includes('deny'))) {
            wx.showModal({
              title: '提示',
              content: '需要授权保存到相册',
              confirmText: '去授权',
              success: (res) => {
                if (res.confirm) wx.openSetting();
              }
            });
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
          this.setData({ isGenerating: false });
        }
      });
    } catch (err) {
      wx.showToast({ title: '导出失败', icon: 'none' });
      this.setData({ isGenerating: false });
    }
  },

  // 移除不再需要的 doRenderWithContext
  // ...
});