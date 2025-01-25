const CustomManualTgBot = require('./index.js');

const config = {
  apiUrl: 'https://ddeb-86-30-162-24.ngrok-free.app',
  apiKey: 'your-test-key',
  apiSecret: 'your-test-secret',
  debug: '1'
};

let CREATED_TRANSACTION = null;

const payout = new CustomManualTgBot(config);

// Mock database functions with proper query chaining
const mockDb = {
    OrderPayoutTxs: {
      create: async (data) => {
        console.log('Creating transaction:', data);
        return { ...data, _id: 'mock_tx_id' };
      },
      find: function() {
        const query = {
          populate: function() {
            return this; // Allow method chaining
          },
          exec: async () => [{
            _id: 'mock_tx_id',
            transaction: CREATED_TRANSACTION,
            order: { _id: 'mock_order_id' }
          }],
          // Make the query thenable to support await
          then: function(resolve, reject) {
            return this.exec().then(resolve, reject);
          }
        };
        return query;
      },
      updateOne: async () => {}
    }
  };

// Simulate order creation
async function createPayoutOrder(amount, cardNumber) {
  const mockOrder = {
    uid: Date.now(),
    outAmount: amount,
    outXML: 'CARDUAH',
    outValues: {
      card_number: cardNumber,
    },
    _id: 'mock_order_id'
  };

  try {
    // Execute transfer
    const result = await payout.transfer(mockOrder);
    console.log('Transfer result:', result);

    // Create transaction record
    await mockDb.OrderPayoutTxs.create({
      transaction: result.transaction,
      order: mockOrder._id,
      payoutModule: 'CustomManualTgBot',
      active: true
    });

    return result;
  } catch (error) {
    console.error('Transfer failed:', error);
  }
}

// Test scenario
async function runTest() {
  // Test with valid card
  response = await createPayoutOrder(100, '4111111111111111', 'TEST USER');
  console.log('Order response:', response);
  // Test cron check
  CREATED_TRANSACTION = response.transaction;
  
  await payout.initCron({
    db: mockDb,
    updateHistory: (data) => console.log('Status update:', data)
  }).fn();

  await new Promise(r => setTimeout(r, 20000));

  await payout.initCron({
    db: mockDb,
    updateHistory: (data) => console.log('Status update:', data)
  }).fn();
}

runTest();