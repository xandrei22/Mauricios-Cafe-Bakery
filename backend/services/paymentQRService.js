const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class PaymentQRService {
    constructor() {
        this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        this.apiUrl = process.env.API_URL || 'http://localhost:5001';

        // Payment provider configurations
        this.gcashConfig = {
            merchantId: process.env.GCASH_MERCHANT_ID || 'your_gcash_merchant_id',
            apiKey: process.env.GCASH_API_KEY || 'your_gcash_api_key',
            webhookSecret: process.env.GCASH_WEBHOOK_SECRET || 'your_gcash_webhook_secret'
        };

        this.paymayaConfig = {
            merchantId: process.env.PAYMAYA_MERCHANT_ID || 'your_paymaya_merchant_id',
            apiKey: process.env.PAYMAYA_API_KEY || 'your_paymaya_api_key',
            webhookSecret: process.env.PAYMAYA_WEBHOOK_SECRET || 'your_paymaya_webhook_secret'
        };
    }

    // Generate GCash QR Code
    async generateGCashQR(orderId, amount, tableNumber = null) {
        try {
            const paymentData = {
                orderId: orderId,
                amount: parseFloat(amount).toFixed(2),
                method: 'gcash',
                tableNumber: tableNumber,
                timestamp: new Date().toISOString(),
                qrId: uuidv4(),
                merchantId: this.gcashConfig.merchantId,
                reference: `GCASH-${orderId}-${Date.now()}`
            };

            // Create GCash payment URL with actual payment data
            const gcashPaymentUrl = this.createGCashPaymentUrl(paymentData);

            // Generate QR code
            const qrCodeDataURL = await QRCode.toDataURL(gcashPaymentUrl, {
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
                url: gcashPaymentUrl,
                data: paymentData,
                type: 'gcash_payment',
                orderId: orderId,
                tableNumber: tableNumber,
                amount: amount,
                reference: paymentData.reference
            };
        } catch (error) {
            console.error('Error generating GCash QR code:', error);
            throw error;
        }
    }

    // Generate PayMaya QR Code
    async generatePayMayaQR(orderId, amount, tableNumber = null) {
        try {
            const paymentData = {
                orderId: orderId,
                amount: parseFloat(amount).toFixed(2),
                method: 'paymaya',
                tableNumber: tableNumber,
                timestamp: new Date().toISOString(),
                qrId: uuidv4(),
                merchantId: this.paymayaConfig.merchantId,
                reference: `PAYMAYA-${orderId}-${Date.now()}`
            };

            // Create PayMaya payment URL with actual payment data
            const paymayaPaymentUrl = this.createPayMayaPaymentUrl(paymentData);

            // Generate QR code
            const qrCodeDataURL = await QRCode.toDataURL(paymayaPaymentUrl, {
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
                url: paymayaPaymentUrl,
                data: paymentData,
                type: 'paymaya_payment',
                orderId: orderId,
                tableNumber: tableNumber,
                amount: amount,
                reference: paymentData.reference
            };
        } catch (error) {
            console.error('Error generating PayMaya QR code:', error);
            throw error;
        }
    }

    // Create GCash payment URL (simulated - replace with actual GCash API)
    createGCashPaymentUrl(paymentData) {
        // For development/testing, create a simulated GCash payment URL
        // In production, this would use the actual GCash API
        const paymentUrl = `${this.apiUrl}/payment/gcash/process?` +
            `orderId=${paymentData.orderId}&` +
            `amount=${paymentData.amount}&` +
            `reference=${paymentData.reference}&` +
            `tableNumber=${paymentData.tableNumber || ''}&` +
            `timestamp=${encodeURIComponent(paymentData.timestamp)}`;

        return paymentUrl;
    }

    // Create PayMaya payment URL (simulated - replace with actual PayMaya API)
    createPayMayaPaymentUrl(paymentData) {
        // For development/testing, create a simulated PayMaya payment URL
        // In production, this would use the actual PayMaya API
        const paymentUrl = `${this.apiUrl}/payment/paymaya/process?` +
            `orderId=${paymentData.orderId}&` +
            `amount=${paymentData.amount}&` +
            `reference=${paymentData.reference}&` +
            `tableNumber=${paymentData.tableNumber || ''}&` +
            `timestamp=${encodeURIComponent(paymentData.timestamp)}`;

        return paymentUrl;
    }

    // Verify payment signature (for webhook security)
    verifyPaymentSignature(payload, signature, method) {
        try {
            const secret = method === 'gcash' ?
                this.gcashConfig.webhookSecret :
                this.paymayaConfig.webhookSecret;

            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature, 'hex'),
                Buffer.from(expectedSignature, 'hex')
            );
        } catch (error) {
            console.error('Error verifying payment signature:', error);
            return false;
        }
    }

    // Process payment verification
    async processPaymentVerification(paymentData, method) {
        try {
            const { orderId, amount, reference, transactionId } = paymentData;

            // Verify payment amount matches order
            const order = await this.getOrderDetails(orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            if (parseFloat(amount) < parseFloat(order.total_price)) {
                throw new Error('Payment amount insufficient');
            }

            // Update order payment status
            await this.updateOrderPaymentStatus(orderId, method, reference, transactionId);

            // Emit real-time update
            this.emitPaymentUpdate(orderId, method, amount);

            return {
                success: true,
                orderId,
                amount,
                method,
                reference,
                transactionId
            };
        } catch (error) {
            console.error('Error processing payment verification:', error);
            throw error;
        }
    }

    // Get order details from database
    async getOrderDetails(orderId) {
        try {
            const db = require('../config/db');
            const [orders] = await db.query(`
                SELECT * FROM orders WHERE order_id = ?
            `, [orderId]);

            return orders.length > 0 ? orders[0] : null;
        } catch (error) {
            console.error('Error getting order details:', error);
            return null;
        }
    }

    // Update order payment status
    async updateOrderPaymentStatus(orderId, method, reference, transactionId) {
        try {
            const db = require('../config/db');
            const connection = await db.getConnection();

            await connection.beginTransaction();

            try {
                // Update order payment status
                await connection.query(`
                    UPDATE orders 
                    SET payment_status = 'paid', 
                        payment_method = ?,
                        completed_time = NOW()
                    WHERE order_id = ?
                `, [method, orderId]);

                // Log payment transaction
                await connection.query(`
                    INSERT INTO payment_transactions 
                    (order_id, payment_method, amount, transaction_id, reference, status, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'completed', NOW())
                `, [orderId, method, 0, transactionId, reference]);

                await connection.commit();

                // Deduct ingredients after successful payment (outside transaction to avoid rollback)
                try {
                    const ingredientDeductionService = require('./ingredientDeductionService');

                    // Get order details for ingredient deduction
                    const [orderResult] = await connection.query(`
                        SELECT * FROM orders WHERE order_id = ?
                    `, [orderId]);

                    if (orderResult.length > 0) {
                        const order = orderResult[0];
                        const items = JSON.parse(order.items || '[]');

                        const itemsForDeduction = items.map(item => ({
                            menuItemId: item.menu_item_id || item.id,
                            quantity: item.quantity || 1,
                            customizations: item.customizations || null,
                            name: item.name
                        }));

                        // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment completion
                    }
                } catch (deductionError) {
                    console.error(`Failed to deduct ingredients for order ${orderId} after QR payment completion:`, deductionError);
                    // Don't fail the payment if ingredient deduction fails
                    // The order is still paid, but inventory won't be updated
                }
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error updating order payment status:', error);
            throw error;
        }
    }

    // Emit real-time payment update
    emitPaymentUpdate(orderId, method, amount) {
        try {
            // This would be called from the webhook handler
            // The actual Socket.IO emission would happen in the route handler
            console.log(`Payment update emitted: ${orderId} - ${method} - ${amount}`);
        } catch (error) {
            console.error('Error emitting payment update:', error);
        }
    }

    // Generate payment status QR for customer tracking
    async generatePaymentStatusQR(orderId, tableNumber = null) {
        try {
            const statusUrl = tableNumber ?
                `${this.baseUrl}/payment-status/${orderId}?table=${tableNumber}` :
                `${this.baseUrl}/payment-status/${orderId}`;

            const qrCodeDataURL = await QRCode.toDataURL(statusUrl, {
                errorCorrectionLevel: 'M',
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
                type: 'payment_status',
                orderId: orderId,
                tableNumber: tableNumber
            };
        } catch (error) {
            console.error('Error generating payment status QR code:', error);
            throw error;
        }
    }

    // Parse payment QR data
    parsePaymentQRData(qrData) {
        try {
            const url = new URL(qrData);
            const params = new URLSearchParams(url.search);

            return {
                orderId: params.get('orderId'),
                amount: params.get('amount'),
                reference: params.get('reference'),
                tableNumber: params.get('tableNumber'),
                timestamp: params.get('timestamp'),
                method: url.pathname.includes('gcash') ? 'gcash' : 'paymaya'
            };
        } catch (error) {
            console.error('Error parsing payment QR data:', error);
            return null;
        }
    }
}

module.exports = new PaymentQRService();