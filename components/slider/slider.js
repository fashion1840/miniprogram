// components/slider/slider.js
Component({
  properties: {
    min: {
      type: Number,
      value: 0
    },
    max: {
      type: Number,
      value: 100
    },
    step: {
      type: Number,
      value: 1
    },
    value: {
      type: Number,
      value: 50
    },
    showValue: {
      type: Boolean,
      value: true
    },
    label: {
      type: String,
      value: ''
    },
    unit: {
      type: String,
      value: ''
    }
  },

  data: {},

  methods: {
    // 格式化数值，解决浮点数精度问题
    formatValue(value) {
      const step = this.properties.step;
      // 如果 step 是小数，根据 step 的小数位数格式化
      if (step < 1) {
        const decimalPlaces = step.toString().split('.')[1]?.length || 1;
        return parseFloat(value.toFixed(decimalPlaces));
      }
      return Math.round(value);
    },
    // 拖动过程中实时触发（实时预览）
    onChanging(e) {
      const value = this.formatValue(e.detail.value);
      this.setData({ value });
      this.triggerEvent('changing', { value });
    },
    // 拖动结束后触发（确定值）
    onChange(e) {
      const value = this.formatValue(e.detail.value);
      this.setData({ value });
      this.triggerEvent('change', { value });
    }
  }
});