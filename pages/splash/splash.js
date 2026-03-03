// pages/splash/splash.js
Page({
  data: {
    fadeIn: false
  },

  onLoad() {
    setTimeout(() => {
      this.setData({ fadeIn: true });
    }, 100);

    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/editor/editor'
      });
    }, 2500);
  }
});