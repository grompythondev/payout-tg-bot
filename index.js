const axios = require('axios');
const Promise = require('bluebird');

class CustomManualTgBot {
  constructor(options) {
    this.config = {
      apiUrl: options.apiUrl,
      apiKey: options.apiKey,
      apiSecret: options.apiSecret,
      debug: options.debug
    };
  }

  async getFields(lang) {
    return [
      {
        _id: "card_number",
        name: i18n(lang, "en")._t(`payout/field/card_number`) || 'Card Number',
        placeholder: "1234 5678 9012 3456",
        regexp: "^(\\d{4}[ -]){3}\\d{4}$|^(\\d{16})$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/card_number`) || 'Card Number',
        required: true
      },
      {
        _id: "fullName",
        name: i18n(lang, "en")._t(`payout/field/name`) || 'Name Surname',
        placeholder: "NAME SURNAME",
        regexp: "^([A-z-'`]{2,50}[_, ])[A-z-'`]{2,50}$",
        regexp_error: i18n(lang, "en")._t(`payout/field/error/full_name`) || 'Incorrect "Name Surname"',
        required: true,
      }
    ];
  }

  async transfer(order) {
    const payload = {
      amount: order.outAmount,
      card_number: order.outValues.card_number,
      name: order.outValues.fullName,
      reference_id: `TX-${order.uid}-${Date.now()}`
    };

    const response = await axios.post(
      `${this.config.apiUrl}/transactions`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Api-Secret': this.config.apiSecret
        }
      }
    );

    return {
      ok: 2, // Mark as pending until confirmed by cron
      transaction: response.data.id,
      amount: order.outAmount,
      currency: order.outSymbol,
      to: payload.card_number
    };
  }

  initCron({ db, updateHistory }) {
    return {
      schedule: '*/5 * * * *', // Every 5 minutes
      fn: async () => {
        const pendingTx = await db.OrderPayoutTxs.find({
          active: true,
          payoutModule: 'CustomManualTgBot'
        }).populate('order');

        await Promise.map(pendingTx, async (tx) => {
          try {
            const response = await axios.get(
              `${this.config.apiUrl}/transactions/${tx.transaction}`,
              {
                headers: {
                  'Authorization': `Bearer ${this.config.apiKey}`,
                  'X-Api-Secret': this.config.apiSecret
                }
              }
            );

            const status = response.data.status;
            if (status === 'completed') {
              await updateHistory({
                orderId: tx.order._id,
                status: 'done',
                payoutStatus: 'completed'
              });
            } else if (status === 'failed') {
              await updateHistory({
                orderId: tx.order._id,
                status: 'errorPayout',
                payoutStatus: 'failed'
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