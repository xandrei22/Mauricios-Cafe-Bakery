const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const axios = require('axios');

class ActualPaymentService {
    constructor() {
        this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        this.apiUrl = process.env.API_URL || 'http://localhost:5001';

        // GCash API Configuration
        this.gcashConfig = {
            merchantId: process.env.GCASH_MERCHANT_ID,
            apiKey: process.env.GCASH_API_KEY,
            secretKey: process.env.GCASH_SECRET_KEY,
            webhookSecret: process.env.GCASH_WEBHOOK_SECRET,
            apiUrl: process.env.GCASH_API_URL || 'https://api.gcash.com',
            isProduction: process.env.NODE_ENV === 'production'
        };

        // PayMaya API Configuration
        this.paymayaConfig = {
            merchantId: process.env.PAYMAYA_MERCHANT_ID,
            apiKey: process.env.PAYMAYA_API_KEY,
            secretKey: process.env.PAYMAYA_SECRET_KEY,
            webhookSecret: process.env.PAYMAYA_WEBHOOK_SECRET,
            apiUrl: process.env.PAYMAYA_API_URL || 'https://api.paymaya.com',
            isProduction: process.env.NODE_ENV === 'production'
        };
    }

    // Generate actual GCash QR Code for payment
    async generateGCashQR(orderId, amount, tableNumber = null) {
        try {
            const reference = `GCASH-${orderId}-${Date.now()}`;

            // Create payment request to GCash API
            const paymentData = {
                merchantId: this.gcashConfig.merchantId,
                amount: parseFloat(amount).toFixed(2),
                currency: 'PHP',
                reference: reference,
                description: `Coffee Shop Order #${orderId}`,
                callbackUrl: `${this.apiUrl}/api/payment/gcash/callback`,
                returnUrl: `${this.baseUrl}/payment-success?orderId=${orderId}&method=gcash&amount=${amount}`,
                metadata: {
                    orderId: orderId,
                    tableNumber: tableNumber,
                    customerName: 'Coffee Shop Customer'
                }
            };

            // Generate signature for GCash API
            const signature = this.generateGCashSignature(paymentData);

            // Call GCash API to create payment
            const gcashResponse = await axios.post(
                `${this.gcashConfig.apiUrl}/v1/payments/qr`,
                paymentData, {
                    headers: {
                        'Authorization': `Bearer ${this.gcashConfig.apiKey}`,
                        'X-Signature': signature,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (gcashResponse.data.success) {
                const qrData = gcashResponse.data.qrCode;

                // Generate QR code image
                const qrCodeDataURL = await QRCode.toDataURL(qrData, {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    quality: 0.92,
                    margin: 1,
                    color: {
                        dark: '#006F42', // GCash green
                        light: '#FFFFFF'
                    }
                });

                return {
                    qrCode: qrCodeDataURL,
                    paymentUrl: qrData,
                    data: paymentData,
                    type: 'gcash_payment',
                    orderId: orderId,
                    tableNumber: tableNumber,
                    amount: amount,
                    reference: reference,
                    gcashPaymentId: gcashResponse.data.paymentId
                };
            } else {
                throw new Error('Failed to generate GCash QR code');
            }
        } catch (error) {
            console.error('Error generating GCash QR code:', error);
            throw error;
        }
    }

    // Generate actual PayMaya QR Code for payment
    async generatePayMayaQR(orderId, amount, tableNumber = null) {
        try {
            const reference = `PAYMAYA-${orderId}-${Date.now()}`;

            // Create payment request to PayMaya API
            const paymentData = {
                merchantId: this.paymayaConfig.merchantId,
                amount: parseFloat(amount).toFixed(2),
                currency: 'PHP',
                reference: reference,
                description: `Coffee Shop Order #${orderId}`,
                callbackUrl: `${this.apiUrl}/api/payment/paymaya/callback`,
                returnUrl: `${this.baseUrl}/payment-success?orderId=${orderId}&method=paymaya&amount=${amount}`,
                metadata: {
                    orderId: orderId,
                    tableNumber: tableNumber,
                    customerName: 'Coffee Shop Customer'
                }
            };

            // Generate signature for PayMaya API
            const signature = this.generatePayMayaSignature(paymentData);

            // Call PayMaya API to create payment
            const paymayaResponse = await axios.post(
                `${this.paymayaConfig.apiUrl}/v1/payments/qr`,
                paymentData, {
                    headers: {
                        'Authorization': `Bearer ${this.paymayaConfig.apiKey}`,
                        'X-Signature': signature,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (paymayaResponse.data.success) {
                const qrData = paymayaResponse.data.qrCode;

                // Generate QR code image
                const qrCodeDataURL = await QRCode.toDataURL(qrData, {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    quality: 0.92,
                    margin: 1,
                    color: {
                        dark: '#00A3E0', // PayMaya blue
                        light: '#FFFFFF'
                    }
                });

                return {
                    qrCode: qrCodeDataURL,
                    paymentUrl: qrData,
                    data: paymentData,
                    type: 'paymaya_payment',
                    orderId: orderId,
                    tableNumber: tableNumber,
                    amount: amount,
                    reference: reference,
                    paymayaPaymentId: paymayaResponse.data.paymentId
                };
            } else {
                throw new Error('Failed to generate PayMaya QR code');
            }
        } catch (error) {
            console.error('Error generating PayMaya QR code:', error);
            throw error;
        }
    }

    // Generate GCash API signature
    generateGCashSignature(data) {
        const payload = JSON.stringify(data);
        return crypto
            .createHmac('sha256', this.gcashConfig.secretKey)
            .update(payload)
            .digest('hex');
    }

    // Generate PayMaya API signature
    generatePayMayaSignature(data) {
        const payload = JSON.stringify(data);
        return crypto
            .createHmac('sha256', this.paymayaConfig.secretKey)
            .update(payload)
            .digest('hex');
    }

    // Verify GCash webhook signature
    verifyGCashWebhook(payload, signature) {
        const expectedSignature = crypto
            .createHmac('sha256', this.gcashConfig.webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    // Verify PayMaya webhook signature
    verifyPayMayaWebhook(payload, signature) {
        const expectedSignature = crypto
            .createHmac('sha256', this.paymayaConfig.webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    // Process cash payment (staff verification required)
    async processCashPayment(orderId, amount, staffId, notes = '') {
        try {
            const db = require('../config/db');
            const connection = await db.getConnection();

            // Ping to ensure socket is alive (reduces ECONNRESET on idle connections)
            try { await connection.ping(); } catch (_) {}

            await connection.beginTransaction();

            try {
                // Verify order exists and is not paid
                const [orders] = await connection.execute('SELECT * FROM orders WHERE order_id = ? AND payment_status = "pending"', [orderId]);

                if (orders.length === 0) {
                    throw new Error('Order not found or already paid');
                }

                const order = orders[0];

                // Verify amount is sufficient (cash payments can be more than total for change)
                if (parseFloat(amount) < parseFloat(order.total_price)) {
                    throw new Error('Payment amount insufficient');
                }

                // Coerce staff id (can be null if not numeric)
                const staffIdNum = Number(staffId);

                // Update order payment status atomically
                await connection.execute(
                    `UPDATE orders SET payment_status = ?, payment_method = ?, status = ? WHERE order_id = ?`, ['paid', 'cash', 'pending', orderId]
                );

                // Log cash payment transaction
                const transactionId = `CASH-${uuidv4()}`;
                await connection.execute(
                    `INSERT INTO payment_transactions (order_id, payment_method, amount, transaction_id, reference, status, created_at, staff_id, notes) VALUES (?, ?, ?, ?, ?, 'completed', NOW(), ?, ?)`, [orderId, 'cash', amount, transactionId, `CASH-${orderId}`, isNaN(staffIdNum) ? null : staffIdNum, notes]
                );

                // Log staff activity
                await connection.execute(
                    `INSERT INTO staff_activities (staff_id, action, order_id, details, created_at) VALUES (?, 'cash_payment_verified', ?, ?, NOW())`, [isNaN(staffIdNum) ? null : staffIdNum, orderId, `Cash payment verified for order ${orderId}`]
                );

                await connection.commit();

                return {
                    success: true,
                    orderId,
                    amount,
                    method: 'cash',
                    transactionId,
                    staffId,
                    timestamp: new Date()
                };
            } catch (error) {
                try {
                    await connection.rollback();
                } catch (rbErr) {
                    console.error('Rollback failed (cash payment):', rbErr);
                }
                throw error;
            } finally {
                try {
                    connection.release();
                } catch (relErr) {
                    console.error('Connection release failed (cash payment):', relErr);
                }
            }
        } catch (error) {
            console.error('Error processing cash payment:', error);
            throw error;
        }
    }

    // Check payment status from payment provider
    async checkPaymentStatus(paymentId, method) {
        try {
            let response;

            if (method === 'gcash') {
                response = await axios.get(
                    `${this.gcashConfig.apiUrl}/v1/payments/${paymentId}`, {
                        headers: {
                            'Authorization': `Bearer ${this.gcashConfig.apiKey}`
                        }
                    }
                );
            } else if (method === 'paymaya') {
                response = await axios.get(
                    `${this.paymayaConfig.apiUrl}/v1/payments/${paymentId}`, {
                        headers: {
                            'Authorization': `Bearer ${this.paymayaConfig.apiKey}`
                        }
                    }
                );
            }

            return response.data;
        } catch (error) {
            console.error(`Error checking ${method} payment status:`, error);
            throw error;
        }
    }

    // Process payment callback from payment provider
    async processPaymentCallback(paymentData, method) {
        try {
            const { orderId, amount, reference, paymentId, status } = paymentData;

            if (status === 'success' || status === 'completed') {
                const db = require('../config/db');
                const connection = await db.getConnection();

                await connection.beginTransaction();

                try {
                    // Get order details for ingredient deduction
                    const [orderResult] = await connection.query(`
                        SELECT * FROM orders WHERE order_id = ?
                    `, [orderId]);

                    if (orderResult.length === 0) {
                        throw new Error('Order not found');
                    }

                    const order = orderResult[0];

                    // Update order payment status
                    await connection.query(`
                        UPDATE orders 
                        SET payment_status = 'paid', 
                            payment_method = ?,
                            status = 'pending'
                        WHERE order_id = ?
                    `, [method, orderId]);

                    // Log payment transaction
                    await connection.query(`
                        INSERT INTO payment_transactions 
                        (order_id, payment_method, amount, transaction_id, reference, status, created_at) 
                        VALUES (?, ?, ?, ?, ?, 'completed', NOW())
                    `, [orderId, method, amount, paymentId, reference]);

                    await connection.commit();

                    // Deduct ingredients after successful payment (outside transaction to avoid rollback)
                    try {
                        const ingredientDeductionService = require('./ingredientDeductionService');
                        const items = JSON.parse(order.items || '[]');

                        console.log('Raw order items for debugging:', items);

                        const itemsForDeduction = items.map(item => ({
                            menuItemId: item.id || item.menu_item_id || item.menuItemId,
                            quantity: item.quantity || 1,
                            customizations: item.customizations || null,
                            name: item.name || item.menu_item_name || 'Unknown Item'
                        }));

                        console.log('Processed items for deduction:', itemsForDeduction);

                        // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment completion
                    } catch (deductionError) {
                        console.error(`Failed to deduct ingredients for order ${orderId} after payment completion:`, deductionError);
                        // Don't fail the payment if ingredient deduction fails
                        // The order is still paid, but inventory won't be updated
                    }

                    return {
                        success: true,
                        orderId,
                        amount,
                        method,
                        reference,
                        paymentId
                    };
                } catch (error) {
                    await connection.rollback();
                    throw error;
                } finally {
                    connection.release();
                }
            } else {
                throw new Error(`Payment failed with status: ${status}`);
            }
        } catch (error) {
            console.error('Error processing payment callback:', error);
            throw error;
        }
    }

    // Get payment transaction history
    async getPaymentHistory(orderId) {
        try {
            const db = require('../config/db');
            const [transactions] = await db.query(`
                SELECT * FROM payment_transactions 
                WHERE order_id = ? 
                ORDER BY created_at DESC
            `, [orderId]);

            return transactions;
        } catch (error) {
            console.error('Error getting payment history:', error);
            throw error;
        }
    }

    // Process payment verification
    async processPaymentVerification(paymentData, method) {
        try {
            const { orderId, amount, reference, transactionId } = paymentData;
            const db = require('../config/db');
            const connection = await db.getConnection();

            await connection.beginTransaction();

            try {
                // Get order details for ingredient deduction
                const [orderResult] = await connection.query(`
                    SELECT * FROM orders WHERE order_id = ?
                `, [orderId]);

                if (orderResult.length === 0) {
                    throw new Error('Order not found');
                }

                const order = orderResult[0];

                // Update order payment status
                await connection.query(`
                    UPDATE orders 
                    SET payment_status = 'paid', 
                        payment_method = ?,
                        status = 'pending'
                    WHERE order_id = ?
                `, [method, orderId]);

                // Log payment transaction
                await connection.query(`
                    INSERT INTO payment_transactions 
                    (order_id, payment_method, amount, transaction_id, reference, status, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'completed', NOW())
                `, [orderId, method, amount, transactionId, reference]);

                await connection.commit();

                // Deduct ingredients after successful payment verification (outside transaction to avoid rollback)
                try {
                    const ingredientDeductionService = require('./ingredientDeductionService');
                    const items = JSON.parse(order.items || '[]');

                    console.log('Raw order items for debugging:', items);

                    const itemsForDeduction = items.map(item => ({
                        menuItemId: item.menu_item_id || item.id || item.menuItemId,
                        quantity: item.quantity || 1,
                        customizations: item.customizations || null,
                        name: item.name || item.menu_item_name || 'Unknown Item'
                    }));

                    // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment verification
                } catch (deductionError) {
                    console.error(`Failed to deduct ingredients for order ${orderId} after payment verification:`, deductionError);
                    // Don't fail the payment if ingredient deduction fails
                    // The order is still paid, but inventory won't be updated
                }

                return {
                    success: true,
                    orderId,
                    amount,
                    method,
                    reference,
                    transactionId
                };
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error processing payment verification:', error);
            throw error;
        }
    }

    // Verify payment signature for webhooks
    verifyPaymentSignature(payload, signature, method) {
        try {
            let secret;
            if (method === 'gcash') {
                secret = this.gcashConfig.webhookSecret;
            } else if (method === 'paymaya') {
                secret = this.paymayaConfig.webhookSecret;
            } else {
                return false;
            }

            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            return signature === expectedSignature;
        } catch (error) {
            console.error('Error verifying payment signature:', error);
            return false;
        }
    }

    // Generate payment status QR for customer tracking
    async generatePaymentStatusQR(orderId, tableNumber = null) {
        try {
            const db = require('../config/db');
            const [orders] = await db.query(`
                SELECT * FROM orders WHERE order_id = ?
            `, [orderId]);

            if (orders.length === 0) {
                throw new Error('Order not found');
            }

            const order = orders[0];
            const statusData = {
                orderId: orderId,
                status: order.status,
                paymentStatus: order.payment_status,
                amount: order.total_price,
                tableNumber: tableNumber,
                timestamp: new Date().toISOString()
            };

            const statusUrl = `${this.baseUrl}/order-status?data=${encodeURIComponent(JSON.stringify(statusData))}`;
            const qrCodeDataURL = await QRCode.toDataURL(statusUrl, {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return {
                qrCode: qrCodeDataURL,
                url: statusUrl,
                data: statusData
            };
        } catch (error) {
            console.error('Error generating payment status QR:', error);
            throw error;
        }
    }
}

module.exports = new ActualPaymentService();