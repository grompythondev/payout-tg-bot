// test-payout.js
const CustomManualTgBot = require('./index.js');

const config = {
  apiUrl: 'https://ddeb-86-30-162-24.ngrok-free.app',
  apiKey: 'your-test-key',
  apiSecret: 'your-test-secret',
  debug: '1'
};

const payout = new CustomManualTgBot(config);

// Mock database functions
const mockDb = {
  OrderPayoutTxs: {
    create: async (data) => {
      console.log('Creating transaction:', data);
      return { ...data, _id: 'mock_tx_id' };
    },
    find: async () => [{
      _id: 'mock_tx_id',
      transaction: 'mock_tx_123',
      order: { _id: 'mock_order_id' }
    }],
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
  await createPayoutOrder(100, '4111111111111111', 'TEST USER');
  
  // Test cron check
  await payout.initCron({
    db: mockDb,
    updateHistory: (data) => console.log('Status update:', data)
  }).fn();
}

runTest();