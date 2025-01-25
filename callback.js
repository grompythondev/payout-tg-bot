const id_key = __dirname.split('/').slice(-1)[0];
const config = require('../../../modules/config/payout.config.js')(id_key);
const crypto = require('node:crypto');
const db = require('../../../db');
const updateHistory = require('../../../modules/updateHistory.js');
const axios = require('axios');
const Promise = require("bluebird");
const qs = require("node:querystring");

class PayoutFn {
  constructor() {
    this.id_key = id_key;
    this.allowIPs = [];
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
    if (!API_url || !API_merchantId || !API_secretKey) {
      return Promise.reject({message: 'Config for BetPayMoney payout is not installed', code: 6000011})
    }
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
      data: data.post,
    };
    return new Promise((s, e) => {
      axios(optReq)
        .then(res => res.data)
        .then(body => {
          if (!body) {
            console.error('{Payout} -> BetPayMoney -> error body empty', body);
            return e({
              message: 'Error Payout -> BetPayMoney - response is empty' + body,
              code: 6000004091
            });
          }
          if (body && body.Message) {
            console.error('{Payout} -> BetPayMoney -> error api', body);
            return e({
              message: 'Error Payout -> BetPayMoney - ' + body.Message,
              code: 6000004092
            });
          }

          return s(body);
        })
        .catch(err => {
          console.error('{Payout} -> BetPayMoney -> error response', err.response && err.response.data ? err.response.data : err.response, err.response && err.response.status ? err.response.status : 500, err);
          e({
            message: "error api BetPayMoney",
            error: err.response && err.response.data ? err.response.data : err.response,
            statusCode: err.response && err.response.status ? err.response.status : 500,
            code: 5000342,
            body: err.response && err.response.data ? err.response.data : err.response,
            API: optReq.method + ':' + optReq.url
          });
        });
    });
  }
}

const payoutAPI = new PayoutFn();
module.exports = {
  /** @url /payout_call/betpay_money/final/ */
  final: async (req, res, param) => {
    res.set('Content-Type', 'text/plain');
    if (req.METHOD !== 'POST') {
      res.writeHead(401);
      res.end("Error method is not allowed only post.");
      return;
    }
    // if (payoutAPI.allowIPs.indexOf(req.IP_ADDRESS) === -1) {
    //   res.writeHead(401);
    //   res.end("Error ip is not allowed.");
    //   return;
    // }
    if (!param || !param.post) {
      res.writeHead(200);
      res.end("We don't need callback for this type.");
      return;
    }

    const ipnData = param.post;
    if (!ipnData) {
      console.error("[PayoutCallback]-> betpay_money: param post.attributes:\n\t", ipnData);
      res.writeHead(500);
      res.end("Invalid callback param post is not defined");
      return;
    }


    if (!ipnData.OrderId) {
      console.error("[PayoutCallback]-> betpay_money: id not valid", ipnData);
      res.writeHead(200);
      res.end("invalid OrderId");
      return;
    }

    if ((["Completed", "Failed", "Canceled"]).indexOf(ipnData.Status) === -1) {
      res.writeHead(200);
      res.end("wait");
      return
    }

    const payoutTxs = await db.OrderPayoutTxs
      .findOne({
        transaction: String(ipnData.OrderId),
        active: true,
        payoutModule: id_key,
      })
      .populate({path: "order", select: "_id uid status"})
      .select({_id: 1, transaction: 1, order: 1})
      .lean();

    if (!payoutTxs) {
      console.error("[PayoutCallback]-> betpay_money: tx not found", ipnData);
      res.writeHead(200);
      res.end("We don't need callback for this tx.");
      return;
    }
    const orderPayout = payoutTxs.order;
    if (orderPayout.status !== 'inProgressPayout') {
      await db.OrderPayoutTxs.updateOne({_id: payoutTxs._id}, {$set: {active: false}});
      console.error('{PayoutCallback} -> betpay_money -> callback final.Order found but status is not inProgressPayout. PAY_TX_ID:', payoutTxs._id);
      res.writeHead(200);
      res.end("Already processed.")
      return null;
    }
    const transfer = await payoutAPI.api_query("GET:/api/PayOut/Get", {get: {externalId: String(orderPayout.uid)}});
    if (!transfer) {
      return null;
    }
    if ((["New", "InProgress", "Paid"]).indexOf(transfer.status) !== -1) {
      return null;
    }


    if (transfer.status === "Completed") {
      await updateHistory({
        orderId: orderPayout._id,
        oldStatus: orderPayout.status,
        status: 'done',
        payoutStatus: 'done',
        comment: 'Success payout: (' + transfer.id + ') Amount: ' + transfer.amount + ''
      }).catch(err => {
        console.error("{PayoutCallback} -> betpay_money -> callback final. Error update status order:", err);
        return null;
      });
      await db.OrderPayoutTxs.updateOne({_id: payoutTxs._id}, {$set: {active: false}});
    } else if (transfer.status === "Canceled" || transfer.status === "Failed") {
      await updateHistory({
        orderId: orderPayout._id,
        oldStatus: orderPayout.status,
        status: 'errorPayout',
        payoutStatus: 'error',
        comment: 'Error payout, check BetPayMoney account for details. Status: ' + (transfer.status || "")
      }).catch(err => {
        console.error("{PayoutCallback} -> betpay_money: -> callback final. Error update status order:", err);
        return null;
      });
      await db.OrderPayoutTxs.updateOne({_id: payoutTxs._id}, {$set: {active: false}});
    }
    res.writeHead(200);
    res.end("Accepted.")
  }
}
