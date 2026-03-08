// miniprogram/utils/store.js
// 全局状态管理

const app = getApp();

const defaultState = {
  // 文字内容
  text: '',
  // 文字样式
  fontSize: 32,
  fontColor: '#ffffff',
  textAlign: 'center',
  lineHeight: 1.5,
  padding: 40,
  // 特效
  shadowEnabled: false,
  // 背景
  bgStyle: 'gradient',
  bgIndex: 0,
  bgColor: '#667eea',
  bgImage: '',
  currentRatio: '3:4',
  fontIndex: 0
};

class Store {
  constructor() {
    this.listeners = [];
  }

  // 获取当前状态
  getState() {
    return app.globalData.editorData || { ...defaultState };
  }

  // 更新状态
  setState(newState) {
    app.globalData.editorData = {
      ...this.getState(),
      ...newState
    };
    this.notify();
  }

  // 重置状态
  resetState() {
    app.globalData.editorData = { ...defaultState };
    this.notify();
  }

  // 订阅状态变化
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // 通知订阅者
  notify() {
    this.listeners.forEach(listener => {
      listener(this.getState());
    });
  }
}

const store = new Store();

module.exports = {
  store,
  defaultState
};
