const axios = require('axios');
const Promise = require('bluebird');
const id_key = __dirname.split('/').slice(-1)[0];
// Production config pulling
// const config = require('../../../modules/config/payout.config.js')(id_key);
// Local tests config pulling
const config = {apiUrl: 'https://api.example.com/v1/payouts', apiKey: 'your-test-key', apiSecret: 'your-test-secret'};

class CustomManualTgBot {
  constructor(conf) {
    this.id_key = id_key;
    if (conf && conf.apiUrl)
      this.apiUrl = conf.apiUrl;
    if (conf && conf.apiKey)
      this.apiKey = conf.apiKey;
    if (conf && conf.apiSecret)
      this.apiSecret = conf.apiSecret;

  }

  async getCurrencyByXML(xml) {
    if (!xml) return null;
    xml = String(xml).toUpperCase();
    if (
      xml.indexOf('CARDUAH') === 0
      || xml.indexOf('P24UAH') === 0
      || xml.indexOf('RFBUAH') === 0
      || xml.indexOf('OSDBUAH') === 0
      || xml.indexOf('USBUAH') === 0
      || xml.indexOf('PMBBUAH') === 0
      || xml.indexOf('MONOBUAH') === 0
      || xml.indexOf('ACUAH') === 0
      || xml.indexOf('SNBUAH') === 0
      || xml.indexOf('OTPBUAH') === 0
      || xml.indexOf('ABUAH') === 0
      || xml.indexOf('IZIBUAH') === 0
      || xml.indexOf('NEOBUAH') === 0
    )
      return {currency: "UAH", methodType: 0};
    return null;
  }

  async getFields(lang) {
    const {currency, methodType} = await this.getCurrencyByXML(xml);
    if (methodType !== 0) return null;

    if (methodType === 0)
      return [{
        _id: "card_number",
        name: i18n(lang, "en")._t(`payout/field/card_number`) || 'Card Number',
        placeholder: "0000 0000 0000 0000",
        regexp: "^(\\d{4}[ -]){3}\\d{4}$|^(\\d{16})$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/card_number`) || 'Card Number',
        required: true,
      }];
  }

  async transfer(order) {
    const {currency, methodType} = await this.getCurrencyByXML(order.outXML);
    
    const payload = {
      amount: +Number(order.outAmount).toFixed(2),
      card_number: String(order.outValues.card_number).replace(new RegExp(" ", "gi"), "").replace(new RegExp("-", "gi"), ""),
      external_order_id: String(order.uid),
      currency: currency,
      currency_xml_code: order.outXML,
    };

    let API_url = this.apiUrl || await config.get('apiUrl');
    let API_apiKey = this.apiKey || await config.get('apiKey');
    let API_apiSecret = this.apiSecret || await config.get('apiSecret');

    const response = await axios.post(
      `${API_url}/transaction/`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${API_apiKey}`,
          'X-Api-Secret': API_apiSecret
        }
      }
    );

    return {
      ok: 2, // Mark as pending until confirmed by cron
      transaction: response.data.uuid,
      currency: order.outXML,
      amount: order.outAmount,
      to: payload.card_number
    };
  }

  initCron({ db, updateHistory }) {
    return {
      schedule: '*/15 * * * * *', // Every 15 seconds
      fn: async () => {
        const pendingTx = await db.OrderPayoutTxs.find({
          active: true,
          payoutModule: id_key,
        }).populate('order');

        let API_url = this.apiUrl || await config.get('apiUrl');
        let API_apiKey = this.apiKey || await config.get('apiKey');
        let API_apiSecret = this.apiSecret || await config.get('apiSecret');

        await Promise.map(pendingTx, async (tx) => {
          try {
            const response = await axios.get(
              `${API_url}/transaction/${tx.transaction}`,
              {
                headers: {
                  'Authorization': `Bearer ${API_apiKey}`,
                  'X-Api-Secret': API_apiSecret
                }
              }
            );

            const status = response.data.status;
            if (status === 'completed') {
              await updateHistory({
                orderId: tx.order._id,
                status: 'done',
                payoutStatus: 'completed',
                orderNote: String(response.data.uuid),
                comment: 'Success payout: (' + String(response.data.uuid) + ') Amount: ' + String(response.data.amount) + (response.data.uuid ? ', TxId:' + String(response.data.uuid) : ".")
              });
            } else if (status === 'failed') {
              await updateHistory({
                orderId: tx.order._id,
                status: 'errorPayout',
                payoutStatus: 'failed',
                orderNote: String(response.data.uuid),
                comment: 'Success payout: (' + String(response.data.uuid) + ') Amount: ' + String(response.data.amount) + (response.data.uuid ? ', TxId:' + String(response.data.uuid) : ".")
              });
            }
          } catch (error) {
            console.error(`Error checking TX ${tx.transaction}:`, error);
          }
        });
      }
    };
  }
}

module.exports = CustomManualTgBot;