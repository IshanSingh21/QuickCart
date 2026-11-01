const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../../lib/prisma');
const simulatedPaymentProvider = require('./simulated-payment-provider');
const AppError = require('../../utils/app-error');

class PaymentService {
  /**
   * Formats a raw payment record for API responses.
   * Ensures monetary fields are serialized as exact 2-decimal strings.
   * @param {Object} payment
   */
  formatPayment(payment) {
    if (!payment) return null;

    return {
      id: payment.id,
      orderId: payment.orderId,
      paymentIntentId: payment.paymentIntentId,
      idempotencyKey: payment.idempotencyKey,
      provider: payment.provider,
      status: payment.status,
      amount: new Prisma.Decimal(payment.amount).toFixed(2),
      currency: payment.currency,
      gatewayResponse: payment.gatewayResponse,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    };
  }

  /**
   * Orchestrates payment authorization and settlement using the Two-Phase Decoupled Pattern.
   * Crucial Architectural Guarantee: External payment network calls are NEVER wrapped
   * in a database transaction to prevent connection starvation and distributed dual-write inconsistency.
   *
   * @param {string} userId - Authenticated user UUID
   * @param {string} orderId - Order UUID to charge
   * @param {Object} options - { paymentMethod, simulateOutcome, idempotencyKey, releaseInventoryOnFailure }
   * @param {string} [userRole='CUSTOMER'] - User role for authorization
   */
  async processPayment(
    userId,
    orderId,
    {
      paymentMethod = 'SIMULATED_CARD',
      simulateOutcome = 'SUCCESS',
      idempotencyKey = null,
      releaseInventoryOnFailure = false
    } = {},
    userRole = 'CUSTOMER'
  ) {
    // -------------------------------------------------------------
    // STEP 1: Idempotency Key Pre-Check
    // -------------------------------------------------------------
    if (idempotencyKey) {
      const existingPayment = await prisma.payment.findUnique({
        where: { idempotencyKey },
        include: { order: true }
      });

      if (existingPayment) {
        // Enforce ownership: reject if idempotency key belongs to another user
        if (existingPayment.order.userId !== userId && userRole !== 'ADMIN') {
          throw AppError.conflict(
            'Idempotency key already used for another user transaction'
          );
        }

        // Safe Replay: If already succeeded, return cached result without charging again
        if (existingPayment.status === 'SUCCEEDED') {
          return {
            payment: this.formatPayment(existingPayment),
            orderStatus: existingPayment.order.status,
            isIdempotentReplay: true
          };
        }

        // In-flight protection: if initiated within the last 60 seconds, prevent duplicate execution
        if (existingPayment.status === 'INITIATED') {
          throw AppError.conflict(
            'A payment request with this idempotency key is currently processing. Please wait.'
          );
        }

        // If previously failed, return the cached failure record
        if (existingPayment.status === 'FAILED') {
          return {
            payment: this.formatPayment(existingPayment),
            orderStatus: existingPayment.order.status,
            isIdempotentReplay: true
          };
        }
      }
    }

    // -------------------------------------------------------------
    // STEP 2: Order Validation & State Machine Verification
    // -------------------------------------------------------------
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      throw AppError.notFound('Order not found');
    }

    // IDOR Protection: Return 404 to prevent resource ID enumeration
    if (order.userId !== userId && userRole !== 'ADMIN') {
      throw AppError.notFound('Order not found');
    }

    // State Machine Transition Rules
    if (order.status === 'PAID') {
      throw AppError.badRequest('Order has already been paid', 'ORDER_ALREADY_PAID');
    }

    if (order.status === 'CANCELLED') {
      throw AppError.badRequest(
        'Cannot pay for a cancelled order. Inventory was already restocked.',
        'ORDER_CANCELLED'
      );
    }

    if (order.status === 'EXPIRED') {
      throw AppError.badRequest(
        'Cannot pay for an expired order. Inventory was already released.',
        'ORDER_EXPIRED'
      );
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw AppError.badRequest(
        `Cannot process payment for order in status: ${order.status}`
      );
    }

    // -------------------------------------------------------------
    // STEP 3: Phase 1 Local Preparation (Create Payment in INITIATED state)
    // -------------------------------------------------------------
    const paymentIntentId = `pi_sim_${crypto.randomUUID().replace(/-/g, '')}`;
    const effectiveIdempotencyKey =
      idempotencyKey || `idemp_${crypto.randomUUID().replace(/-/g, '')}`;

    let initiatedPayment;
    try {
      initiatedPayment = await prisma.payment.create({
        data: {
          orderId,
          paymentIntentId,
          idempotencyKey: effectiveIdempotencyKey,
          provider: 'SIMULATED_GATEWAY',
          status: 'INITIATED',
          amount: order.totalAmount,
          currency: order.currency
        }
      });
    } catch (err) {
      // Handle race condition on duplicate concurrent idempotency key insertion
      if (
        err.code === 'P2002' &&
        err.meta &&
        err.meta.target &&
        err.meta.target.includes('idempotencyKey')
      ) {
        throw AppError.conflict(
          'A payment request with this idempotency key is already in progress'
        );
      }
      throw err;
    }

    // -------------------------------------------------------------
    // STEP 4: Phase 2 External Simulated Gateway Call (OUTSIDE DB TRANSACTION)
    // Zero database locks or open transactions held during this call!
    // -------------------------------------------------------------
    let gatewayResult;
    try {
      gatewayResult = await simulatedPaymentProvider.processPayment({
        amount: new Prisma.Decimal(order.totalAmount).toFixed(2),
        currency: order.currency,
        paymentIntentId,
        idempotencyKey: effectiveIdempotencyKey,
        paymentMethod,
        simulateOutcome
      });
    } catch (gatewayErr) {
      // Gateway communication failure or timeout
      await prisma.payment.update({
        where: { id: initiatedPayment.id },
        data: {
          status: 'FAILED',
          gatewayResponse: {
            error: gatewayErr.code || 'GATEWAY_ERROR',
            message: gatewayErr.message
          }
        }
      });

      throw AppError.internal(
        `Payment provider communication failure: ${gatewayErr.message}`,
        {
          paymentId: initiatedPayment.id,
          paymentIntentId,
          errorCode: gatewayErr.code
        }
      );
    }

    // -------------------------------------------------------------
    // STEP 5: Phase 3 Local Settlement & State Transition (ACID DB TRANSACTION)
    // -------------------------------------------------------------
    if (gatewayResult.success && gatewayResult.status === 'SUCCEEDED') {
      const settledPayment = await prisma.$transaction(async (tx) => {
        // 1. Mark payment as SUCCEEDED
        const paymentRecord = await tx.payment.update({
          where: { id: initiatedPayment.id },
          data: {
            status: 'SUCCEEDED',
            gatewayResponse: gatewayResult
          }
        });

        // 2. Mark order as PAID
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID'
          }
        });

        return paymentRecord;
      });

      return {
        payment: this.formatPayment(settledPayment),
        orderStatus: 'PAID',
        isIdempotentReplay: false
      };
    }

    // Handle Payment Decline / Failure
    const failedPayment = await prisma.$transaction(async (tx) => {
      // 1. Mark payment as FAILED with decline details
      const paymentRecord = await tx.payment.update({
        where: { id: initiatedPayment.id },
        data: {
          status: 'FAILED',
          gatewayResponse: gatewayResult
        }
      });

      // 2. If client specified terminal failure, cancel order and release inventory
      if (releaseInventoryOnFailure) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' }
        });

        for (const item of order.items) {
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              version: { increment: 1 }
            }
          });

          await tx.inventory.create({
            data: {
              productId: item.productId,
              orderId: order.id,
              changeType: 'CANCELLATION_RESTOCK',
              quantityDelta: item.quantity,
              remainingStock: updatedProduct.stock,
              reason: `Payment failed decline (${gatewayResult.declineCode}) - inventory restocked`
            }
          });
        }
      }

      return paymentRecord;
    });

    throw AppError.paymentRequired(
      `Payment failed: ${gatewayResult.declineMessage || 'Card declined'}`,
      {
        declineCode: gatewayResult.declineCode,
        paymentId: failedPayment.id,
        orderId,
        orderStatus: releaseInventoryOnFailure ? 'CANCELLED' : 'PENDING_PAYMENT'
      }
    );
  }

  /**
   * Retrieves all payment attempts for a given order.
   * @param {string} userId - Authenticated user UUID
   * @param {string} orderId - Order UUID
   * @param {string} userRole - User role
   */
  async getOrderPayments(userId, orderId, userRole = 'CUSTOMER') {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.userId !== userId && userRole !== 'ADMIN') {
      throw AppError.notFound('Order not found');
    }

    const payments = await prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });

    return payments.map((p) => this.formatPayment(p));
  }

  /**
   * Retrieves single payment record by ID.
   * @param {string} userId - Authenticated user UUID
   * @param {string} paymentId - Payment UUID
   * @param {string} userRole - User role
   */
  async getPaymentById(userId, paymentId, userRole = 'CUSTOMER') {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });

    if (!payment) {
      throw AppError.notFound('Payment record not found');
    }

    if (payment.order.userId !== userId && userRole !== 'ADMIN') {
      throw AppError.notFound('Payment record not found');
    }

    return this.formatPayment(payment);
  }
}

module.exports = new PaymentService();
