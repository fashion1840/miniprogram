// pages/editor/editor.js
const app = getApp();
const TextToImage = require('../../utils/canvas');
const { gradients, solidColors, textures, fontColors, fonts } = require('../../config/backgrounds');

// Canvas 默认尺寸常量
const CANVAS_WIDTH = 900;

let canvasInstance = null;
let renderTimer = null;

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

Page({
  data: {
    // 文字
    text: '',
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
    showEmptyGuide: false
  },

  onLoad() {
    // 延迟显示空状态引导，避免初始闪烁
    setTimeout(() => {
      this.setData({ showEmptyGuide: true });
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
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
    canvasInstance = null;
  },

  // 清理渲染定时器
  clearRenderTimer() {
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
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
    renderTimer = setTimeout(() => this.doRender(), 300);
  },

  // 执行渲染
  async doRender() {
    if (!canvasInstance || !canvasInstance.isReady()) {
      return;
    }
    
    const width = CANVAS_WIDTH;
    const ratio = this.data.currentRatio || '3:4';
    const height = getHeightByRatio(ratio, width);
    const d = this.data;
    
    // 绘制背景
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
    
    // 绘制文字
    canvasInstance.drawText({
      text: d.text,
      fontSize: d.fontSize,
      fontColor: d.fontColor,
      fontFamily: d.fonts[d.fontIndex].value,
      textAlign: d.textAlign,
      lineHeight: d.lineHeight,
      padding: d.padding,
      shadowEnabled: d.shadowEnabled,
      width,
      height
    });
  },
    
  // 事件处理
  onTextInput(e) {
    const text = e.detail.value;
    this.setData({ text, charCount: text.length });
    this.renderPreview();
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
    this.setData({ 
      text: randomText, 
      charCount: randomText.length,
      showEmptyGuide: false 
    });
    this.renderPreview();
    this.saveState();
  },

  onClearText() {
    this.setData({ text: '', charCount: 0 });
    this.renderPreview();
    this.saveState();
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
            shadowEnabled: false
          };
          this.setData(defaultData);
          this.initCanvas();
          this.saveState();
          wx.showToast({ title: '已重置', icon: 'success' });
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
    const that = this;
    // 使用 wx.chooseMedia 选择图片
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '正在处理图片...' });
        
        // 验证图片路径是否有效
        wx.getImageInfo({
          src: tempFilePath,
          success: (imageInfo) => {
            that.setData({
              bgImage: tempFilePath,
              bgStyle: 'custom',
              activeTab: 'custom'
            }, () => {
              that.saveState();
              setTimeout(() => {
                that.doRender().then(() => {
                  wx.hideLoading();
                }).catch(err => {
                  wx.hideLoading();
                  wx.showToast({ title: '图片渲染失败', icon: 'none' });
                });
              }, 100);
            });
          },
          fail: (err) => {
            wx.hideLoading();
            wx.showToast({ title: '图片加载失败', icon: 'none' });
          }
        });
      },
      fail: function(err) {
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '选择图片失败', icon: 'none' });
        }
      }
    });
  },

  onFontChange(e) {
    this.setData({ fontIndex: e.detail.value });
    this.renderPreview();
  },

  onTextAlignChange(e) {
    this.setData({ textAlign: e.currentTarget.dataset.align });
    this.renderPreview();
  },

  // 字号 - 拖动时实时预览
  onFontSizeChanging(e) {
    this.setData({ fontSize: e.detail.value });
    this.doRender();
  },
  onFontSizeChange(e) {
    this.setData({ fontSize: e.detail.value });
    this.saveState();
  },

  // 行高 - 拖动时实时预览
  onLineHeightChanging(e) {
    this.setData({ lineHeight: e.detail.value });
    this.doRender();
  },
  onLineHeightChange(e) {
    this.setData({ lineHeight: e.detail.value });
    this.saveState();
  },

  // 页边距 - 拖动时实时预览
  onPaddingChanging(e) {
    this.setData({ padding: e.detail.value });
    this.doRender();
  },
  onPaddingChange(e) {
    this.setData({ padding: e.detail.value });
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

  // 保存状态
  saveState() {
    const keys = ['text', 'currentRatio', 'bgStyle', 'activeTab', 'bgIndex', 'bgColor', 'bgImage',
                  'textureIndex', 'fontIndex', 'fontSize', 'fontColor', 'textAlign', 'lineHeight', 'padding', 'shadowEnabled'];
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