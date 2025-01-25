module.exports.type = 'payout';
module.exports.title = 'Custom Manual Tg Bot';
module.exports.name = 'Custom Manual Tg Bot';
module.exports.required_npm = [];
module.exports.allow_XML = [];

module.exports.default_config = {
  debug: '0',
  apiKey: '',
  apiSecret: '',
  apiUrl: 'https://api.example.com/v1/payouts'
};

module.exports.required_config = {
  debug: 1,
  apiKey: 1,
  apiSecret: 2, // hidden field
  apiUrl: 1
};