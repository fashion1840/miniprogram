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
    onChange(e) {
      const value = e.detail.value;
      this.setData({ value });
      this.triggerEvent('change', { value });
    }
  }
});