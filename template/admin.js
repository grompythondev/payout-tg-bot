const fs = require("fs");

module.exports = {
  template: fs.readFileSync(__dirname + '/admin.html', {encoding: 'utf8'}),
  props: {
    schema: {type: "String"},
    domain: {type: "String"},
    server_path: {type: "String"},
    publicIpV4: {type: "String"},
    payoutKey: {type: "String"},
    config: {type: "Object"}
  },
  data() {
    return {
      loadStatus: true,
      apiUrl: '',
      merchantId: '',
      secretKey: '',
    }
  },

  created() {
    this.apiUrl = this.config.apiUrl;
    this.merchantId = this.config.merchantId;
  },
  mounted() {},
  methods: {
    saveConfig(key, value) {
      this.$rest.api('admin/merchant-and-payout/set-config-payout', {
        payoutKey: this.payoutKey,
        key,
        value
      })
        .then(res => {
          if (res.success)
            return alert('Success');
          alert('Error');
        })
        .catch(err => {
          console.error('admin/merchant-and-payout/set-config-payout', err);
          alert('Error');
        })
    },
  }
};
