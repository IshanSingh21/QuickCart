const crypto = require('crypto');

/**
 * Simulated Payment Provider
 *
 * Implements a local simulated payment gateway interface modeled after standard industry
 * gateways (Stripe, Adyen). Complies strictly with PCI-DSS: NEVER collects, stores,
 * or handles real card numbers or payment credentials.
 */
class SimulatedPaymentProvider {
  constructor(options = {}) {
    this.providerName = options.providerName || 'SIMULATED_GATEWAY';
    this.defaultCurrency = options.defaultCurrency || 'USD';
  }

  /**
   * Process a simulated charge outside of any database transaction.
   *
   * @param {Object} params
   * @param {string|number} params.amount - Transaction amount
   * @param {string} params.currency - 3-letter ISO currency code
   * @param {string} params.paymentIntentId - Unique payment intent reference
   * @param {string} params.idempotencyKey - Idempotency key for gateway dedup
   * @param {string} [params.paymentMethod='SIMULATED_CARD'] - Payment instrument type
   * @param {string} [params.simulateOutcome='SUCCESS'] - Desired simulation test outcome
   * @returns {Promise<Object>} Gateway response object
   */
  async processPayment({
    amount,
    currency = 'USD',
    paymentIntentId,
    idempotencyKey,
    paymentMethod = 'SIMULATED_CARD',
    simulateOutcome = 'SUCCESS'
  }) {
    // 1. Simulate gateway network/communication failure if requested
    if (simulateOutcome === 'GATEWAY_TIMEOUT') {
      const error = new Error('Simulated gateway network timeout during charge authorization');
      error.code = 'GATEWAY_TIMEOUT';
      error.isNetworkError = true;
      throw error;
    }

    // 2. Simulate card decline
    if (simulateOutcome === 'CARD_DECLINED') {
      return {
        success: false,
        status: 'FAILED',
        declineCode: 'card_declined',
        declineMessage: 'The payment was declined by the simulated card issuer.',
        provider: this.providerName,
        paymentIntentId,
        idempotencyKey,
        amount: String(amount),
        currency,
        paymentMethod,
        processedAt: new Date().toISOString()
      };
    }

    // 3. Simulate insufficient funds
    if (simulateOutcome === 'INSUFFICIENT_FUNDS') {
      return {
        success: false,
        status: 'FAILED',
        declineCode: 'insufficient_funds',
        declineMessage: 'The simulated account has insufficient funds to complete the purchase.',
        provider: this.providerName,
        paymentIntentId,
        idempotencyKey,
        amount: String(amount),
        currency,
        paymentMethod,
        processedAt: new Date().toISOString()
      };
    }

    // 4. Default: Successful authorization and capture
    const transactionId = `txn_sim_${crypto.randomUUID().replace(/-/g, '')}`;
    const authorizationCode = `AUTH_${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      success: true,
      status: 'SUCCEEDED',
      transactionId,
      authorizationCode,
      provider: this.providerName,
      paymentIntentId,
      idempotencyKey,
      amount: String(amount),
      currency,
      paymentMethod,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Process a simulated refund
   * @param {Object} params
   */
  async refundPayment({ paymentIntentId, amount, reason = 'requested_by_customer' }) {
    const refundId = `ref_sim_${crypto.randomUUID().replace(/-/g, '')}`;

    return {
      success: true,
      status: 'REFUNDED',
      refundId,
      paymentIntentId,
      amount: String(amount),
      reason,
      processedAt: new Date().toISOString()
    };
  }
}

module.exports = new SimulatedPaymentProvider();
