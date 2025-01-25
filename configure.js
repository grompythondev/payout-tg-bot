module.exports.type = 'payout';
module.exports.title = 'Tg Payout';
module.exports.name = 'Tg Payout';
module.exports.required_npm = [];

module.exports.allow_XML = [
  "CARDUAH",
];

module.exports.default_config = {
  apiUrl: '',
  merchantId: '',
  secretKey: '',
};
module.exports.required_config = {
  apiUrl: 1,
  merchantId: 1,
  secretKey: 2,
};
