// app.js
App({
  onLaunch() {
    // 生命周期函数--监听小程序初始化
  },
  onShow() {
    // 生命周期函数--监听小程序显示
  },
  onHide() {
    // 生命周期函数--监听小程序隐藏
  },
  globalData: {
    userInfo: null,
    // 全局状态存储
    editorData: {
      text: '',
      fontSize: 32,
      fontColor: '#ffffff',
      textAlign: 'center',
      lineHeight: 1.5,
      padding: 40,
      shadowEnabled: false,
      currentRatio: '3:4',
      bgStyle: 'gradient',
      bgIndex: 0,
      bgColor: '#667eea',
      bgImage: '',
      fontIndex: 0
    }
  }
});