// pages/editor/editor.js
const app = getApp();
const TextToImage = require('../../utils/canvas');
const { gradients, solidColors, textures, fontColors, fonts } = require('../../config/backgrounds');

const CANVAS_WIDTH = 900;
const REALTIME_RENDER_INTERVAL = 50;
const RECENT_SOLID_COLORS_KEY = 'recentSolidColors';
const MAX_RECENT_SOLID_COLORS = 8;

let canvasInstance = null;
let editorCtx = null;
let renderTimer = null;
let realtimeRenderTimer = null;
let lastRealtimeRenderAt = 0;
let showGuideTimer = null;
let canvasInitRetryCount = 0;
let isCanvasInitializing = false;
let renderVersion = 0;

function getHeightByRatio(ratio, width = 900) {
  switch(ratio) {
    case '3:4': return width * 4 / 3;  // 1200
    case '1:1': return width;            // 900
    case '4:3': return width * 3 / 4;   // 675
    case '9:16': return width * 16 / 9; // 1600
    default: return width * 4 / 3;
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
    text: '',
    richTextHtml: '',
    charCount: 0,
    
    ratios: [
      { label: '3:4', value: '3:4' },
      { label: '1:1', value: '1:1' },
      { label: '4:3', value: '4:3' },
      { label: '9:16', value: '9:16' }
    ],
    currentRatio: '3:4',
    ratioClass: 'ratio-3-4',
    
    bgStyle: 'gradient', // 实际应用的样式：gradient、solid、texture、custom
    activeTab: 'gradient',
    bgIndex: 0,
    bgColor: '#667eea',
    bgImage: '',
    
    gradients: gradients,
    
    solidColors: solidColors,
    recentSolidColors: [],
    customSolidColor: '',
    showCustomSolidPicker: false,
    pickerHue: 220,
    pickerSat: 0.57,
    pickerVal: 0.84,
    pickerBaseColor: '#0055FF',
    pickerCursorX: 57,
    pickerCursorY: 16,
    pickerR: 91,
    pickerG: 155,
    pickerB: 213,
    
    textures: textures,
    textureIndex: 0,
    
    fonts: fonts,
    fontIndex: 0,
    fontSize: 50,
    fontColor: '#ffffff',
    fontColors: fontColors,
    textAlign: 'center',
    lineHeight: 1.5,
    padding: 40,
    shadowEnabled: false,
    
    isGenerating: false,
    
    showEmptyGuide: false,
    
    // Markdown 支持
    enableMarkdown: true,
    
    enableFooter: false,
    footerAuthor: '',
    footerDate: '',
            footerPosition: 'center',
  },

  onLoad() {
    showGuideTimer = setTimeout(() => {
      this.setData({ showEmptyGuide: true });
      showGuideTimer = null;
    }, 500);
    const hasSavedState = this.restoreState();
    
    if (hasSavedState && app.globalData.editorData) {
      const editorData = app.globalData.editorData;
      const ratioClass = editorData.currentRatio ? 'ratio-' + editorData.currentRatio.replace(':', '-') : 'ratio-3-4';
      this.setData(Object.assign({}, editorData, {
        activeTab: editorData.activeTab || editorData.bgStyle || 'gradient',
        richTextHtml: editorData.richTextHtml || plainTextToEditorHtml(editorData.text || ''),
        charCount: editorData.text ? editorData.text.length : 0,
        ratioClass: ratioClass
      }));
    } else {
      this.setData({
        ratioClass: 'ratio-' + this.data.currentRatio.replace(':', '-')
      });
    }
    
    this.loadRecentSolidColors();
    this.syncPickerFromColor(this.data.bgColor || '#667EEA');
    if (this.data.bgStyle === 'solid' && this.data.bgColor) {
      this.addRecentSolidColor(this.data.bgColor);
      this.setData({ customSolidColor: this.data.bgColor });
    }

  },

  async onShow() {
    if (canvasInstance && canvasInstance.isReady()) {
      await this.doRender();
      return;
    }
    this.initCanvas();
  },

  onReady() {
    this.initCanvas();
  },

  onHide() {
    this.saveState();
  },

  onUnload() {
    this.saveState();
    this.clearRenderTimer();
    this.clearRealtimeRenderTimer();
    if (showGuideTimer) {
      clearTimeout(showGuideTimer);
      showGuideTimer = null;
    }
    lastRealtimeRenderAt = 0;
    renderVersion += 1;
    if (canvasInstance && typeof canvasInstance.clearCustomBackgroundCache === 'function') {
      canvasInstance.clearCustomBackgroundCache();
    }
    canvasInstance = null;
    editorCtx = null;
  },

  clearRenderTimer() {
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
  },

  clearRealtimeRenderTimer() {
    if (realtimeRenderTimer) {
      clearTimeout(realtimeRenderTimer);
      realtimeRenderTimer = null;
    }
  },

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

  async initCanvas() {
    if (isCanvasInitializing) return;
    isCanvasInitializing = true;
    try {
      if (!canvasInstance) {
        canvasInstance = new TextToImage();
      }
      await canvasInstance.init('#previewCanvas');

      const width = CANVAS_WIDTH;
      const ratio = this.data.currentRatio || '3:4';
      const height = getHeightByRatio(ratio, width);

      canvasInstance.setSize(width, height);
      await this.doRender();
      canvasInitRetryCount = 0;
    } catch (err) {
      console.error('initCanvas failed', err);
      if (canvasInitRetryCount < 3) {
        canvasInitRetryCount += 1;
        setTimeout(() => this.initCanvas(), 120 * (canvasInitRetryCount + 1));
        return;
      }
      wx.showToast({ title: '初始化失败，请重试', icon: 'none' });
    } finally {
      isCanvasInitializing = false;
    }
  },

  renderPreview() {
    this.clearRenderTimer();
    this.clearRealtimeRenderTimer();
    renderTimer = setTimeout(() => this.doRender(), 300);
  },

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

    if (currentVersion !== renderVersion) {
      return false;
    }

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

    if (d.enableFooter && (d.footerAuthor || d.footerDate)) {
      canvasInstance.drawFooter({
        author: d.footerAuthor,
        date: d.footerDate,
        position: d.footerPosition,
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
    
  // 浜嬩欢澶勭悊
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
            footerDate: '',
            footerPosition: 'center',
          };
          this.setData(defaultData, () => {
            if (editorCtx) {
              editorCtx.clear();
            }
            if (canvasInstance && typeof canvasInstance.clearCustomBackgroundCache === 'function') {
              canvasInstance.clearCustomBackgroundCache();
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

  clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  },

  rgbToHex(r, g, b) {
    const toHex = (n) => {
      const v = this.clampNumber(Math.round(n), 0, 255);
      const s = v.toString(16).toUpperCase();
      return s.length === 1 ? '0' + s : s;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  },

  hexToRgb(hex) {
    const normalized = this.normalizeSolidColor(hex);
    if (!normalized) return null;
    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16)
    };
  },

  rgbToHsv(r, g, b) {
    const rn = this.clampNumber(r, 0, 255) / 255;
    const gn = this.clampNumber(g, 0, 255) / 255;
    const bn = this.clampNumber(b, 0, 255) / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
      else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
      else h = 60 * ((rn - gn) / delta + 4);
    }
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : delta / max;
    const v = max;
    return { h, s, v };
  },

  hsvToRgb(h, s, v) {
    const hue = ((Number(h) % 360) + 360) % 360;
    const sat = this.clampNumber(s, 0, 1);
    const val = this.clampNumber(v, 0, 1);
    const c = val * sat;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = val - c;

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
    if (hue < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (hue < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (hue < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (hue < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (hue < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  },

  syncPickerFromColor(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) return;
    const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
    const baseRgb = this.hsvToRgb(hsv.h, 1, 1);
    this.setData({
      pickerHue: Math.round(hsv.h),
      pickerSat: hsv.s,
      pickerVal: hsv.v,
      pickerBaseColor: this.rgbToHex(baseRgb.r, baseRgb.g, baseRgb.b),
      pickerCursorX: Math.round(hsv.s * 100),
      pickerCursorY: Math.round((1 - hsv.v) * 100),
      pickerR: rgb.r,
      pickerG: rgb.g,
      pickerB: rgb.b
    });
  },

  onHueChanging(e) {
    this.onHueChange(e);
  },

  onHueChange(e) {
    const hue = this.clampNumber(e.detail.value, 0, 360);
    const baseRgb = this.hsvToRgb(hue, 1, 1);
    const rgb = this.hsvToRgb(hue, this.data.pickerSat, this.data.pickerVal);
    const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
    this.setData({
      pickerHue: Math.round(hue),
      pickerBaseColor: this.rgbToHex(baseRgb.r, baseRgb.g, baseRgb.b),
      pickerR: rgb.r,
      pickerG: rgb.g,
      pickerB: rgb.b,
      customSolidColor: hex
    });
  },

  onSVTouchStart(e) {
    this.updateSVByTouch(e);
  },

  onSVTouchMove(e) {
    this.updateSVByTouch(e);
  },

  updateSVByTouch(e) {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!touch) return;
    const query = wx.createSelectorQuery();
    query.select('#solidSVPanel').boundingClientRect((rect) => {
      if (!rect) return;
      const x = this.clampNumber((touch.clientX - rect.left) / rect.width, 0, 1);
      const y = this.clampNumber((touch.clientY - rect.top) / rect.height, 0, 1);
      const sat = x;
      const val = 1 - y;
      const rgb = this.hsvToRgb(this.data.pickerHue, sat, val);
      const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
      this.setData({
        pickerSat: sat,
        pickerVal: val,
        pickerCursorX: Math.round(sat * 100),
        pickerCursorY: Math.round(y * 100),
        pickerR: rgb.r,
        pickerG: rgb.g,
        pickerB: rgb.b,
        customSolidColor: hex
      });
    }).exec();
  },

  onRgbInput(e) {
    const channel = e.currentTarget.dataset.channel;
    const value = this.clampNumber(e.detail.value, 0, 255);
    const next = {
      r: this.data.pickerR,
      g: this.data.pickerG,
      b: this.data.pickerB
    };
    next[channel] = Math.round(value);
    const hsv = this.rgbToHsv(next.r, next.g, next.b);
    const baseRgb = this.hsvToRgb(hsv.h, 1, 1);
    const hex = this.rgbToHex(next.r, next.g, next.b);
    this.setData({
      pickerHue: Math.round(hsv.h),
      pickerSat: hsv.s,
      pickerVal: hsv.v,
      pickerBaseColor: this.rgbToHex(baseRgb.r, baseRgb.g, baseRgb.b),
      pickerCursorX: Math.round(hsv.s * 100),
      pickerCursorY: Math.round((1 - hsv.v) * 100),
      pickerR: next.r,
      pickerG: next.g,
      pickerB: next.b,
      customSolidColor: hex
    });
  },

  onSolidColorChange(e) {
    this.applySolidColor(e.currentTarget.dataset.color);
  },

  onCustomSolidColorInput(e) {
    this.setData({ customSolidColor: e.detail.value });
  },


  onCustomPickerToggle(e) {
    this.setData({ showCustomSolidPicker: !!e.detail.value });
    this.saveState();
  },
  onApplyCustomSolidColor() {
    const ok = this.applySolidColor(this.data.customSolidColor);
    if (!ok) {
      wx.showToast({ title: '颜色格式无效', icon: 'none' });
    }
  },

  normalizeSolidColor(color = '') {
    const raw = String(color || '').trim().toUpperCase();
    const normalized = raw.startsWith('#') ? raw : '#' + raw;
    if (/^#[0-9A-F]{3}$/.test(normalized)) {
      const c = normalized.slice(1);
      return '#' + c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    if (/^#[0-9A-F]{6}$/.test(normalized)) {
      return normalized;
    }
    return '';
  },

  loadRecentSolidColors() {
    try {
      const list = wx.getStorageSync(RECENT_SOLID_COLORS_KEY);
      if (!Array.isArray(list)) {
        this.setData({ recentSolidColors: [] });
        return;
      }
      const normalized = list
        .map(color => this.normalizeSolidColor(color))
        .filter(Boolean)
        .filter((color, idx, arr) => arr.indexOf(color) === idx)
        .slice(0, MAX_RECENT_SOLID_COLORS);
      this.setData({ recentSolidColors: normalized });
    } catch (e) {
      this.setData({ recentSolidColors: [] });
    }
  },

  addRecentSolidColor(color) {
    const normalized = this.normalizeSolidColor(color);
    if (!normalized) return;
    const current = this.data.recentSolidColors || [];
    const next = [normalized];
    current.forEach((item) => {
      if (item !== normalized && next.length < MAX_RECENT_SOLID_COLORS) {
        next.push(item);
      }
    });
    this.setData({ recentSolidColors: next });
    try {
      wx.setStorageSync(RECENT_SOLID_COLORS_KEY, next);
    } catch (e) {}
  },

  applySolidColor(color) {
    const normalized = this.normalizeSolidColor(color);
    if (!normalized) return false;
    const current = this.data.recentSolidColors || [];
    const nextRecent = [normalized];
    current.forEach((item) => {
      if (item !== normalized && nextRecent.length < MAX_RECENT_SOLID_COLORS) {
        nextRecent.push(item);
      }
    });
    this.setData({
      bgColor: normalized,
      bgStyle: 'solid',
      customSolidColor: normalized,
      recentSolidColors: nextRecent
    });
    this.syncPickerFromColor(normalized);
    try {
      wx.setStorageSync(RECENT_SOLID_COLORS_KEY, nextRecent);
    } catch (e) {}
    this.renderPreview();
    return true;
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
        wx.showLoading({ title: '处理中...' });

        const preloadPromise = (canvasInstance && canvasInstance.isReady() && typeof canvasInstance.preloadCustomBackground === 'function')
          ? canvasInstance.preloadCustomBackground(tempFilePath)
          : Promise.resolve(true);

        preloadPromise
          .then((ok) => {
            if (!ok) {
              wx.showToast({ title: '操作失败', icon: 'none' });
              return;
            }
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
                  wx.showToast({ title: '操作失败', icon: 'none' });
                })
                .finally(() => {
                  wx.hideLoading();
                });
            });
          })
          .catch(() => {
            wx.showToast({ title: '操作失败', icon: 'none' });
          })
          .finally(() => {
            wx.hideLoading();
          });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '操作失败', icon: 'none' });
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

  onFooterDateInput(e) {
    this.setData({ footerDate: e.detail.value });
    this.renderPreview();
    this.saveState();
  },
  onFooterPositionChange(e) {
    const position = e.currentTarget.dataset.position;
    if (!position || ['left', 'center', 'right'].indexOf(position) === -1) return;
    this.setData({ footerPosition: position });
    this.renderPreview();
    this.saveState();
  },

  saveState() {
    const keys = ['text', 'richTextHtml', 'currentRatio', 'bgStyle', 'activeTab', 'bgIndex', 'bgColor', 'bgImage',
                  'textureIndex', 'fontIndex', 'fontSize', 'fontColor', 'textAlign', 'lineHeight', 'padding', 'shadowEnabled',
                  'enableMarkdown', 'enableFooter', 'footerAuthor', 'footerDate', 'footerPosition', 'showCustomSolidPicker'];
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
        app.globalData.editorData = Object.assign({}, app.globalData.editorData || {}, savedData);
        return true;
      }
    } catch (e) {
    }
    return false;
  },

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
    
    this.generateAndSave();
  },
  
  async generateAndSave() {
    if (!canvasInstance) {
      this.setData({ isGenerating: false });
      return;
    }
    
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

  // ...
});












