const id_key = __dirname.split('/').slice(-1)[0];
const config = require('../../../modules/config/payout.config.js')(id_key);
const crypto = require('node:crypto');
const axios = require('axios');
const i18n = require('../../../modules/i18n');
const qs = require("node:querystring");
const Promise = require("bluebird");

class BetPayMoney {
  constructor(conf) {
    this.allowIPs = [];
    this.id_key = id_key;
    if (conf && conf.apiUrl)
      this.apiUrl = conf.apiUrl;
    if (conf && conf.merchantId)
      this.merchantId = conf.merchantId;
    if (conf && conf.secretKey)
      this.secretKey = conf.secretKey;

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
      
    if(xml.indexOf('WIREUAH') === 0)
      return {currency: "UAH", methodType: 3};

    if (
      xml.indexOf('CARDKZT') === 0
      || xml.indexOf('HLKBKZT') === 0
      || xml.indexOf('BRBKZT') === 0
      || xml.indexOf('FRTBKZT') === 0
      || xml.indexOf('JSNBKZT') === 0
      || xml.indexOf('CCBKZT') === 0
      || xml.indexOf('ERSNBKZT') === 0
      || xml.indexOf('FFBKZT') === 0
      || xml.indexOf('KSPBKZT') === 0
    )
      return {currency: "KZT", methodType: 0};

    if (xml.indexOf('WISEUSD') === 0)
      return {currency: "USD", methodType: 1};
    if (xml.indexOf('REVBUSD') === 0)
      return {currency: "USD", methodType: 2};

    if (xml.indexOf('WISEEUR') === 0)
      return {currency: "EUR", methodType: 1};
    if (xml.indexOf('REVBEUR') === 0)
      return {currency: "EUR", methodType: 2};
    if (xml.indexOf('USDTTRC') === 0)
      return {currency: "USDT"};

    // if (xml.indexOf('SEPAEUR') === 0)
    //   return {currency: "EUR", methodType: 3};

    return null;
  }

  async getFields(lang, xml) {
    const {currency, methodType} = await this.getCurrencyByXML(xml);
    if (!currency) return null;
    if (currency === "USDT")
      return [{
        _id: 'account_crypto',
        name: i18n(lang, "en")._t(`payout/field/crypto_address`, {currency: "Tether TRC20"}) || 'Tron address',
        placeholder: 'TNaRA....',
        regexp: '^T[1-9A-HJ-NP-Za-km-z]{33}$',
        regexp_error: i18n(lang, "en")._t(`payout/field/error/crypto_address`, {currency: "Tether TRC20"}) || "Incorrect filled field",
        required: true,
      }];
    if (methodType === 0)
      return [{
        _id: "card_number",
        name: i18n(lang, "en")._t(`payout/field/card_number`) || 'Card Number',
        placeholder: "0000 0000 0000 0000",
        regexp: "^(\\d{4}[ -]){3}\\d{4}$|^(\\d{16})$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/card_number`) || 'Card Number',
        required: true,
      }];
    if (methodType === 1)
      return [{
        _id: "accountEmail",
        name: i18n(lang, "en")._t(`payout/field/wise_email`) || 'Wise account email',
        placeholder: "email@example.com",
        regexp: process.env.REGEXP_EMAIL,
        regexp_error: i18n(lang, "en")._t(`payout/field/error/card_number`) || 'Incorrect "Wise account email"',
        required: true,
      }, {
        _id: "bankAccount",
        name: i18n(lang, "en")._t(`payout/field/iban`) || 'IBAN',
        placeholder: "AA*******",
        regexp: "^[A-Z]{2}[A-Z0-9]{1,30}$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/iban`) || 'Incorrect IBAN',
        required: true,
      }, {
        _id: "fullName",
        name: i18n(lang, "en")._t(`payout/field/name`) || 'Name Surname',
        placeholder: "NAME SURNAME",
        regexp: "^([A-z-'`]{2,50}[_, ])[A-z-'`]{2,50}$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/full_name`) || 'Incorrect "Name Surname"',
        required: true,
      }];
    if (methodType === 2)
      return [{
        _id: "accountEmail",
        name: i18n(lang, "en")._t(`payout/field/wise_email`) || 'Revolut account email',
        placeholder: "email@example.com",
        regexp: process.env.REGEXP_EMAIL,
        regexp_error: i18n(lang, "en")._t(`payout/field/error/card_number`) || 'Incorrect "Wise account email"',
        required: true,
      }, {
        _id: "bankAccount",
        name: i18n(lang, "en")._t(`payout/field/iban`) || 'IBAN',
        placeholder: "AA*******",
        regexp: "^[A-Z]{2}[A-Z0-9]{1,30}$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/iban`) || 'Incorrect IBAN',
        required: true,
      }, {
        _id: "fullName",
        name: i18n(lang, "en")._t(`payout/field/name`) || 'Name Surname',
        placeholder: "NAME SURNAME",
        regexp: "^([A-z-'`]{2,50}[_, ])[A-z-'`]{2,50}$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/full_name`) || 'Incorrect "Name Surname"',
        required: true,
      }];
    if (methodType === 3)
      return [{
        _id: "bankAccount",
        name: i18n(lang, "en")._t(`payout/field/iban`) || 'IBAN',
        placeholder: "AA*******",
        regexp: "^[A-Z]{2}[A-Z0-9]{1,30}$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/iban`) || 'Incorrect IBAN',
        required: true,
      }, {
        _id: "fullName",
        name: i18n(lang, "en")._t(`payout/field/name`) || 'Name Surname',
        placeholder: "NAME SURNAME",
        regexp: "^([A-z-'`]{2,50}[_, ])[A-z-'`]{2,50}$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/full_name`) || 'Incorrect "Name Surname"',
        required: true,
      }, {
        _id: "taxId",
        name: i18n(lang, "en")._t(`payout/field/tax_id`) || 'Tax ID',
        placeholder: "1234567890",
        regexp: "^[0-9]{8,20}$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/tax_id`) || 'Incorrect Tax ID',
        required: true,
      }, {
        _id: "comment",
        name: i18n(lang, "en")._t(`payout/field/comment`) || 'Comment',
        placeholder: "Comment",
        regexp: "^.{0,255}$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/comment`) || 'Incorrect Comment',
        required: false,
      }];
    return null;
  }

  encryptParams(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
  }


  async api_query(method_name, data) {
    if (!data) {
      data = {get: {}, post: {}};
    }
    if (!data.get) {
      data.get = {};
    }
    if (!data.post) {
      data.post = {};
    }
    let method = method_name.split(':');
    let typeMethod = 'POST';
    if (method.length === 2) {
      typeMethod = method[0];
      method = method[1];
    } else {
      method = method[0];
    }
    let API_url = this.apiUrl || await config.get('apiUrl');
    let API_merchantId = this.merchantId || await config.get('merchantId');
    let API_secretKey = this.secretKey || await config.get('secretKey');
    if (!API_url || !API_merchantId || !API_secretKey)
      return Promise.reject({message: 'Config for BetPayMoney payout is not installed', code: 6000011});
    const TimestampHeader = Date.now();
    const optReq = {
      url: API_url + method + "?" + qs.stringify(data.get),
      method: typeMethod,
      headers: {
        "Content-Type": "application/json",
        "MerchantId": API_merchantId,
        "Timestamp": TimestampHeader,
        "Signature": this.encryptParams(`${API_merchantId}${TimestampHeader}`, API_secretKey),
      },
      data: data.post
    };
    // console.log('{Payout} -> BetPayMoney -> debug request:', optReq);

    return axios(optReq)
      .then(res => res.data)
      .then(body => {
        if (!body) {
          console.error('{Payout} -> BetPayMoney -> error body empty', body);
          return Promise.reject({
            message: 'Error Payout -> BetPayMoney - response is empty' + body,
            code: 6000004091
          });
        }
        if (body && body.Message) {
          console.error('{Payout} -> BetPayMoney -> error api', body);
          return Promise.reject({
            message: 'Error Payout -> BetPayMoney - ' + body.Message,
            code: 6000004092
          });
        }
        return body;
      })
      .catch(err => {
        console.error('{Payout} -> BetPayMoney -> error response', err.response && err.response.data ? err.response.data : err.response, err.response && err.response.status ? err.response.status : 500, err);
        return Promise.reject({
          message: "error api BetPayMoney",
          error: err.response && err.response.data ? err.response.data : err.response,
          statusCode: err.response && err.response.status ? err.response.status : 500,
          code: 5000342,
          body: err.response && err.response.data ? err.response.data : err.response,
          API: optReq.method + ':' + optReq.url
        });
      });
  }

  initCron({db, updateHistory}) {
    return {
      callWhenInit: true,
      schedule: '47 * * * * *',
      fn: async () => {
        const waitTxs = await db.OrderPayoutTxs
          .countDocuments({
            active: true,
            payoutModule: id_key,
            createdAt: {
              $lt: (Date.now() - 1000 * 60 * 10),// check tx which wait more then 1min
              $gt: (Date.now() - 1000 * 60 * 60 * 24 * 3) //skip tx oldest 3day
            }
          })
        if (waitTxs <= 0) return;

        const payoutTxs = await db.OrderPayoutTxs
          .find({
            active: true,
            payoutModule: id_key,
            createdAt: {
              $lt: (Date.now() - 1000 * 60 * 10),// check tx which wait more then 10min
              $gt: (Date.now() - 1000 * 60 * 60 * 24 * 3) //skip tx oldest 3day
            }
          })
          .populate({path: "order", select: "_id uid status"})
          .select({_id: 1, transaction: 1, order: 1})
          .lean();
        await Promise.mapSeries(payoutTxs, async (tx) => {
          const orderPayout = tx.order;
          const transfer = await this.api_query("GET:/api/PayOut/Get", {get: {externalId: String(orderPayout.uid)}});
          if (!transfer) {
            return null;
          }
          if ((["Completed", "Failed", "Canceled"]).indexOf(transfer.status) === -1) {
            return null;
          }

          if (!orderPayout) {
            await db.OrderPayoutTxs.updateOne({_id: tx._id}, {$set: {active: false}});
            return null;
          }
          if (orderPayout.status !== 'inProgressPayout') {
            await db.OrderPayoutTxs.updateOne({_id: tx._id}, {$set: {active: false}});
            console.error('Order found but status is not inProgressPayout. PAY_TX_ID:', tx._id);
            return null;
          }

          if (transfer.status === "Failed" || transfer.status === "Canceled") {
            await updateHistory({
              orderId: orderPayout._id,
              oldStatus: orderPayout.status,
              status: 'errorPayout',
              payoutStatus: 'error',
              comment: 'Error payout, check BetPayMoney account for details. Status: ' + (transfer.status || "")
            }).catch(err => {
              console.error("Error update status order (cron->BetPayMoney): ", err);
              return null;
            });
            await db.OrderPayoutTxs.updateOne({_id: tx._id}, {$set: {active: false}});
            return 2;
          }
          if (transfer.status === "Completed") {
            await updateHistory({
              orderId: orderPayout._id,
              oldStatus: orderPayout.status,
              status: 'done',
              payoutStatus: 'done',
              comment: 'Success payout: (' + transfer.id + ') Amount: ' + transfer.amount + ''
            }).catch(err => {
              console.error("Error update status order (cron->BetPayMoney): ", err);
              return null;
            });
            await db.OrderPayoutTxs.updateOne({_id: tx._id}, {$set: {active: false}});
          }
          return 1;
        });

        return "ok";
      }
    }
  }


  /**
   * @param order {object} - order
   * @param order.uid {number} - order uid
   * @param order.outAmount {number} - order outAmount
   * @param order.outXML {string} - order xml currency out
   * @param order.outSymbol {string} - order symbol currency out
   * @param order.outValues {object} - order values param
   * @returns {Promise<*>}
   */
  transfer(order) {
    return (async () => {
      if (!order.uid)
        return Promise.reject('Error uid order.');
      if (!order.outXML)
        return Promise.reject('Error xml order.');
      if (!order.outAmount || isNaN(order.outAmount))
        return Promise.reject('Error outAmount order.');


      const {currency, methodType} = await this.getCurrencyByXML(order.outXML);
      if (!currency) return Promise.reject('Error currency order.');
      // const balance = await this.api_query("GET:/api/Merchant/Balance").then(r => Number(r.balance));
      // if (new BigNumber(order.outAmount).gt(balance))
      //   return Promise.reject('Error available_balance is low for transfer. ' + balance + " < " + Number(order.outAmount));

      if (currency === "USDT" && order.outValues.account_crypto) {
        const paymentData = {
          orderExternalId: String(order.uid),
          amount: +Number(order.outAmount).toFixed(4),
          address: String(order.outValues.account_crypto).replace(new RegExp(" ", "gi"), "").replace(new RegExp("-", "gi"), "")
        }

        const transaction = await this.api_query('POST:/api/PayOut/Crypto/Create', {post: paymentData});

        if (!transaction.id)
          return Promise.reject('Error api transfer (id)');

        return {
          ok: 2,
          transaction: transaction.id,
          amount: order.outAmount,
          currency: order.outSymbol.toUpperCase(),
          to: paymentData.address
        };
      }


      const paymentData = {
        externalId: String(order.uid),
        amount: +Number(order.outAmount).toFixed(2),
        currency: String(currency),
        methodType: Number(methodType),
      };
      if (order.outValues.card_number)
        paymentData.cardNumber = String(order.outValues.card_number).replace(new RegExp(" ", "gi"), "").replace(new RegExp("-", "gi"), "");
      if (order.outValues.accountEmail)
        paymentData.accountEmail = String(order.outValues.accountEmail).replace(new RegExp(" ", "gi"), "");
      if (order.outValues.bankAccount)
        paymentData.bankAccount = String(order.outValues.bankAccount).replace(new RegExp(" ", "gi"), "").replace(new RegExp("-", "gi"), "");
      if (order.outValues.fullName)
        paymentData.fullName = String(order.outValues.fullName).replace(new RegExp(" ", "gi"), "");
      if (order.outValues.taxId)
        paymentData.taxId = String(order.outValues.taxId).replace(new RegExp(" ", "gi"), "");
      if (order.outValues.comment)
        paymentData.comment = String(order.outValues.comment).replace(new RegExp(" ", "gi"), "");

      const transaction = await this.api_query('POST:/api/PayOut/Create', {post: paymentData});

      if (!transaction.id)
        return Promise.reject('Error api transfer (id)');

      return {
        ok: 2,
        transaction: transaction.id,
        amount: order.outAmount,
        currency: order.outSymbol.toUpperCase(),
        to: paymentData.cardNumber
      };

    })();
  }
}

module.exports = BetPayMoney;
