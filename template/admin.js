const fs = require("fs");

module.exports = {
  template: fs.readFileSync(__dirname + '/admin.html', 'utf8'),
  props: {
    payoutKey: {type: "String"},
    config: {type: "Object"}
  },
  data() {
    return {
      apiUrl: '',
      apiKey: '',
      apiSecret: '',
      debug: '0'
    }
  },
  created() {
    this.apiUrl = this.config.apiUrl || '';
    this.apiKey = this.config.apiKey || '';
    this.debug = this.config.debug || '0';
  },
  methods: {
    saveConfig(key, value) {
      this.$rest.api('admin/merchant-and-payout/set-config-payout', {
        payoutKey: this.payoutKey,
        key,
        value
      }).then(res => {
        alert(res.success ? 'Saved!' : 'Error saving');
      });
    }
  }
};