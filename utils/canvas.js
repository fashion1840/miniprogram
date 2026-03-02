// miniprogram/utils/canvas.js
// Canvas 图片合成引擎

class TextToImage {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.dpr = 1;
  }

  /**
   * 初始化 Canvas
   * @param {string} canvasId - Canvas 元素 ID
   */
  async init(canvasId) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select(canvasId)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) {
            reject(new Error('Canvas not found'));
            return;
          }
          this.canvas = res[0].node;
          this.ctx = this.canvas.getContext('2d');
          const sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
          this.dpr = sysInfo.pixelRatio || 2;
          resolve(this);
        });
    });
  }

  /**
   * 检查 Canvas 是否就绪
   */
  isReady() {
    return !!(this.canvas && this.ctx);
  }

  /**
   * 设置 Canvas 尺寸
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  setSize(width, height) {
    if (!this.isReady()) return;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  /**
   * 绘制背景
   * @param {Object} options - 背景选项
   */
  async drawBackground(options) {
    if (!this.isReady()) return;
    const { bgStyle, bgIndex, bgColor, bgImage, gradients, textures, textureIndex, width, height } = options;
    const ctx = this.ctx;
    
    ctx.clearRect(0, 0, width, height);

    if (bgStyle === 'gradient') {
      const g = gradients[bgIndex] || gradients[0];
      // 根据 direction 计算渐变起点和终点
      let x1 = 0, y1 = 0, x2 = width, y2 = height;
      const direction = g.direction || '135deg';
      
      switch(direction) {
        case '0deg':    // 从上到下
          x1 = width / 2; y1 = 0; x2 = width / 2; y2 = height;
          break;
        case '90deg':   // 从左到右
          x1 = 0; y1 = height / 2; x2 = width; y2 = height / 2;
          break;
        case '180deg':  // 从下到上
          x1 = width / 2; y1 = height; x2 = width / 2; y2 = 0;
          break;
        case '270deg':  // 从右到左
          x1 = width; y1 = height / 2; x2 = 0; y2 = height / 2;
          break;
        case '45deg':   // 左下到右上
          x1 = 0; y1 = height; x2 = width; y2 = 0;
          break;
        case '135deg':  // 左上到右下（默认）
        default:
          x1 = 0; y1 = 0; x2 = width; y2 = height;
          break;
      }
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, g.color1);
      gradient.addColorStop(1, g.color2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      return Promise.resolve();
    } else if (bgStyle === 'solid') {
      ctx.fillStyle = bgColor || '#667eea';
      ctx.fillRect(0, 0, width, height);
      return Promise.resolve();
    } else if (bgStyle === 'texture' && textures) {
      // 绘制纹理背景
      const texture = textures[textureIndex] || textures[0];
      return this.drawTextureBackground(texture, width, height);
    } else if (bgStyle === 'custom' && bgImage) {
      return this.drawCustomBackground(bgImage, width, height);
    } else {
      ctx.fillStyle = '#667eea';
      ctx.fillRect(0, 0, width, height);
      return Promise.resolve();
    }
  }

  /**
   * 绘制文字
   * @param {Object} options - 文字选项
   */
  drawText(options) {
    if (!this.isReady()) return;
    const {
      text = '',
      fontSize = 32,
      fontColor = '#ffffff',
      fontFamily = 'sans-serif',
      textAlign = 'center',
      lineHeight = 1.5,
      padding = 40,
      shadowEnabled = false,
      width,
      height
    } = options;

    const ctx = this.ctx;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fontColor;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'top';

    if (shadowEnabled) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    const maxWidth = width - padding * 2;
    const lines = this.wrapText(text || '', maxWidth);
    const lineHeightPx = fontSize * lineHeight;

    let startX;
    switch (textAlign) {
      case 'left': startX = padding; break;
      case 'center': startX = width / 2; break;
      case 'right': startX = width - padding; break;
      default: startX = width / 2;
    }

    // 如果没有文字，显示提示文字（仅在预览时）
    const isEmpty = lines.length === 0 || (lines.length === 1 && lines[0] === '');
    if (isEmpty) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${fontSize * 0.8}px ${fontFamily}`;
      ctx.textAlign = 'center';
      const hintText = '请输入文字';
      const hintX = width / 2;
      const hintY = height / 2 - fontSize * 0.4;
      ctx.fillText(hintText, hintX, hintY);
      ctx.restore();
    } else {
      const textBlockHeight = lines.length * lineHeightPx;
      const startY = (height - textBlockHeight) / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, startX, startY + i * lineHeightPx);
      });
    }
  }

  /**
   * 文字自动换行（支持 \n）
   */
  wrapText(text, maxWidth) {
    const paragraphs = text.split('\n');
    const lines = [];

    paragraphs.forEach(paragraph => {
      let line = '';
      for (let i = 0; i < paragraph.length; i++) {
        const char = paragraph[i];
        const testLine = line + char;
        const metrics = this.ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && line.length > 0) {
          lines.push(line);
          line = char;
        } else {
          line = testLine;
        }
      }
      lines.push(line);
    });

    return lines;
  }

  /**
   * 绘制自定义背景图片
   * 小程序 Canvas 2D 真机加载本地图片的解决方案
   */
  drawCustomBackground(bgImage, width, height) {
    return new Promise((resolve) => {
      
      // 方案：使用 wx.getImageInfo 获取图片尺寸
      // 然后使用文件系统读取为 base64 加载
      wx.getImageInfo({
        src: bgImage,
        success: (imageInfo) => {
          
          // 计算图片绘制尺寸
          const imgRatio = imageInfo.width / imageInfo.height;
          const canvasRatio = width / height;
          let drawWidth, drawHeight, offsetX, offsetY;

          if (imgRatio > canvasRatio) {
            drawHeight = height;
            drawWidth = height * imgRatio;
            offsetX = (width - drawWidth) / 2;
            offsetY = 0;
          } else {
            drawWidth = width;
            drawHeight = width / imgRatio;
            offsetX = 0;
            offsetY = (height - drawHeight) / 2;
          }
          
          // 真机方案：读取文件为 base64 再加载
          const fs = wx.getFileSystemManager();
          fs.readFile({
            filePath: bgImage,
            encoding: 'base64',
            success: (fileRes) => {
              const base64Url = 'data:image/' + imageInfo.type + ';base64,' + fileRes.data;
              const img = this.canvas.createImage();
              
              img.onload = () => {
                this.ctx.save();
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
                this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                this.ctx.restore();
                resolve();
              };
              
              img.onerror = (err) => {
                this.ctx.fillStyle = '#666';
                this.ctx.fillRect(0, 0, width, height);
                resolve();
              };
              
              img.src = base64Url;
            },
            fail: (err) => {
              // 降级：尝试直接使用路径
              this.loadImageWithPath(bgImage, imageInfo, offsetX, offsetY, drawWidth, drawHeight, width, height, resolve);
            }
          });
        },
        fail: (err) => {
          this.ctx.fillStyle = '#666';
          this.ctx.fillRect(0, 0, width, height);
          resolve();
        }
      });
    });
  }

  /**
   * 使用路径加载图片（降级方案）
   */
  loadImageWithPath(path, imageInfo, offsetX, offsetY, drawWidth, drawHeight, width, height, resolve) {
    const img = this.canvas.createImage();
    
    img.onload = () => {
      this.ctx.save();
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      this.ctx.restore();
      resolve();
    };
    
    img.onerror = () => {
      this.ctx.fillStyle = '#666';
      this.ctx.fillRect(0, 0, width, height);
      resolve();
    };
    
    img.src = imageInfo.path || path;
  }

  /**
   * 绘制纹理背景
   * 使用 Canvas 绘制12种纹理图案
   */
  drawTextureBackground(texture, width, height) {
    return new Promise((resolve) => {
      const ctx = this.ctx;
      const pattern = texture.pattern;
      
      // 填充背景色
      ctx.fillStyle = texture.bgColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      
      switch(pattern) {
        case 'paper': // 纸张 - 细微噪点纹理
          for (let i = 0; i < 500; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.03})`;
            ctx.fillRect(x, y, 1, 1);
          }
          break;
          
        case 'grid': // 方格
          const gridSize = 25;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 0; x <= width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
          }
          for (let y = 0; y <= height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
          }
          ctx.stroke();
          break;
          
        case 'dots': // 圆点
          const dotSpacing = 30;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          for (let x = dotSpacing/2; x < width; x += dotSpacing) {
            for (let y = dotSpacing/2; y < height; y += dotSpacing) {
              ctx.beginPath();
              ctx.arc(x, y, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
          
        case 'horizontal': // 横线
          const hSpacing = 20;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let y = hSpacing; y <= height; y += hSpacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
          }
          ctx.stroke();
          break;
          
        case 'diagonal': // 斜线
          const diagSpacing = 20;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = -height; i < width + height; i += diagSpacing) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i + height, height);
          }
          ctx.stroke();
          break;
          
        case 'cross': // 十字
          const crossSpacing = 30;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.lineWidth = 1.5;
          const crossSize = 8;
          for (let x = crossSpacing/2; x < width; x += crossSpacing) {
            for (let y = crossSpacing/2; y < height; y += crossSpacing) {
              ctx.beginPath();
              ctx.moveTo(x - crossSize, y);
              ctx.lineTo(x + crossSize, y);
              ctx.moveTo(x, y - crossSize);
              ctx.lineTo(x, y + crossSize);
              ctx.stroke();
            }
          }
          break;
          
        case 'vertical': // 竖线
          const vSpacing = 20;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = vSpacing; x <= width; x += vSpacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
          }
          ctx.stroke();
          break;
          
        case 'checkerboard': // 棋盘
          const checkSize = 25;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
          for (let x = 0; x < width; x += checkSize) {
            for (let y = 0; y < height; y += checkSize) {
              if ((x/checkSize + y/checkSize) % 2 === 0) {
                ctx.fillRect(x, y, checkSize, checkSize);
              }
            }
          }
          break;
          
        case 'noise': // 噪点 - 密集噪点
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          for (let i = 0; i < 8000; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            ctx.fillRect(x, y, 1.5, 1.5);
          }
          break;
          
        case 'waves': // 波浪 - 波浪线
          const waveSpacing = 30;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.lineWidth = 1.5;
          for (let y = waveSpacing; y < height; y += waveSpacing) {
            ctx.beginPath();
            for (let x = 0; x <= width; x += 5) {
              const waveY = y + Math.sin(x * 0.05) * 5;
              if (x === 0) ctx.moveTo(x, waveY);
              else ctx.lineTo(x, waveY);
            }
            ctx.stroke();
          }
          break;
          
        case 'hexagon': // 六边 - 六边形蜂窝图案
          const hexRadius = 18;
          const hexW = hexRadius * Math.sqrt(3);
          const hexH = hexRadius * 2;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.lineWidth = 1;
          // 计算需要绘制的行列数，确保覆盖整个画布
          const cols = Math.ceil(width / hexW) + 1;
          const rows = Math.ceil(height / (hexH * 0.75)) + 1;
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const x = col * hexW + (row % 2) * (hexW / 2);
              const y = row * (hexH * 0.75);
              this.drawHexagon(ctx, x, y, hexRadius);
            }
          }
          break;
          
        case 'dotgrid': // 点阵 - 网格交叉点
          const dgSpacing = 25;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
          for (let x = 0; x <= width; x += dgSpacing) {
            for (let y = 0; y <= height; y += dgSpacing) {
              ctx.beginPath();
              ctx.arc(x, y, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
          
        default:
          break;
      }
      
      ctx.restore();
      resolve();
    });
  }

  /**
   * 绘制六边形
   */
  drawHexagon(ctx, x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  /**
   * 导出图片
   */
  async toTempFilePath() {
    if (!this.isReady()) return Promise.reject(new Error('Canvas not ready'));
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas: this.canvas,
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => reject(err)
      });
    });
  }
}

module.exports = TextToImage;