const provider = require('../../src/modules/payments/simulated-payment-provider');

describe('Simulated Payment Provider', () => {
  it('should generate a successful charge response by default', async () => {
    const result = await provider.processPayment({
      amount: '99.98',
      currency: 'USD',
      paymentIntentId: 'pi_test_123',
      idempotencyKey: 'idemp_test_123',
      paymentMethod: 'SIMULATED_CARD',
      simulateOutcome: 'SUCCESS'
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCEEDED');
    expect(result.transactionId).toMatch(/^txn_sim_/);
    expect(result.authorizationCode).toMatch(/^AUTH_\d{6}$/);
    expect(result.provider).toBe('SIMULATED_GATEWAY');
  });

  it('should handle simulated card declines gracefully', async () => {
    const result = await provider.processPayment({
      amount: '50.00',
      currency: 'USD',
      paymentIntentId: 'pi_test_declined',
      idempotencyKey: 'idemp_test_declined',
      simulateOutcome: 'CARD_DECLINED'
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.declineCode).toBe('card_declined');
    expect(result.declineMessage).toMatch(/declined by the simulated card issuer/);
  });

  it('should handle simulated insufficient funds gracefully', async () => {
    const result = await provider.processPayment({
      amount: '500.00',
      currency: 'USD',
      paymentIntentId: 'pi_test_insufficient',
      idempotencyKey: 'idemp_test_insufficient',
      simulateOutcome: 'INSUFFICIENT_FUNDS'
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.declineCode).toBe('insufficient_funds');
    expect(result.declineMessage).toMatch(/insufficient funds/);
  });

  it('should throw network timeout error when simulated outcome is GATEWAY_TIMEOUT', async () => {
    await expect(
      provider.processPayment({
        amount: '20.00',
        currency: 'USD',
        paymentIntentId: 'pi_test_timeout',
        idempotencyKey: 'idemp_test_timeout',
        simulateOutcome: 'GATEWAY_TIMEOUT'
      })
    ).rejects.toThrow(/Simulated gateway network timeout/);
  });

  it('should simulate refund successfully', async () => {
    const result = await provider.refundPayment({
      paymentIntentId: 'pi_test_refund',
      amount: '99.98',
      reason: 'customer_request'
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('REFUNDED');
    expect(result.refundId).toMatch(/^ref_sim_/);
    expect(result.amount).toBe('99.98');
  });
});
