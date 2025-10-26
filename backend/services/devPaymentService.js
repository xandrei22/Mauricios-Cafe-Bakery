const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class DevPaymentService {
    constructor() {
        this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        this.apiUrl = process.env.API_URL || 'http://localhost:5001';
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }

    // Generate simulated GCash QR Code for payment
    async generateGCashQR(orderId, amount, tableNumber = null) {
        try {
            const reference = `GCASH-DEV-${orderId}-${Date.now()}`;

            // Create simulated payment data
            const paymentData = {
                orderId: orderId,
                amount: parseFloat(amount).toFixed(2),
                currency: 'PHP',
                reference: reference,
                description: `Coffee Shop Order #${orderId} (DEV MODE)`,
                tableNumber: tableNumber,
                customerName: 'Coffee Shop Customer',
                timestamp: new Date().toISOString()
            };

            // Generate simulated QR code data
            const qrData = JSON.stringify({
                type: 'gcash_payment',
                ...paymentData,
                devMode: true,
                paymentUrl: `gcash://pay?amount=${amount}&reference=${reference}&dev=true`
            });

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
                gcashPaymentId: `gcash_dev_${uuidv4()}`,
                devMode: true
            };
        } catch (error) {
            console.error('Error generating GCash QR code:', error);
            throw error;
        }
    }

    // Generate simulated PayMaya QR Code for payment
    async generatePayMayaQR(orderId, amount, tableNumber = null) {
        try {
            const reference = `PAYMAYA-DEV-${orderId}-${Date.now()}`;

            // Create simulated payment data
            const paymentData = {
                orderId: orderId,
                amount: parseFloat(amount).toFixed(2),
                currency: 'PHP',
                reference: reference,
                description: `Coffee Shop Order #${orderId} (DEV MODE)`,
                tableNumber: tableNumber,
                customerName: 'Coffee Shop Customer',
                timestamp: new Date().toISOString()
            };

            // Generate simulated QR code data
            const qrData = JSON.stringify({
                type: 'paymaya_payment',
                ...paymentData,
                devMode: true,
                paymentUrl: `paymaya://pay?amount=${amount}&reference=${reference}&dev=true`
            });

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
                paymayaPaymentId: `paymaya_dev_${uuidv4()}`,
                devMode: true
            };
        } catch (error) {
            console.error('Error generating PayMaya QR code:', error);
            throw error;
        }
    }

    // Simulate payment processing (for development)
    async simulatePayment(orderId, method, amount) {
        try {
            // Simulate payment processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));

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
                const transactionId = `${method.toUpperCase()}-DEV-${uuidv4()}`;
                await connection.query(`
                    INSERT INTO payment_transactions 
                    (order_id, payment_method, amount, transaction_id, reference, status, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'completed', NOW())
                `, [orderId, method, amount, transactionId, `${method.toUpperCase()}-DEV-${orderId}`]);

                await connection.commit();

                // Deduct ingredients after successful payment (outside transaction to avoid rollback)
                try {
                    const ingredientDeductionService = require('./ingredientDeductionService');
                    const items = JSON.parse(order.items || '[]');

                    const itemsForDeduction = items.map(item => ({
                        menuItemId: item.menu_item_id || item.id,
                        quantity: item.quantity || 1,
                        customizations: item.customizations || null,
                        name: item.name
                    }));

                    // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment completion
                } catch (deductionError) {
                    console.error(`Failed to deduct ingredients for order ${orderId} after dev payment completion:`, deductionError);
                    // Don't fail the payment if ingredient deduction fails
                    // The order is still paid, but inventory won't be updated
                }

                return {
                    success: true,
                    orderId,
                    amount,
                    method,
                    transactionId,
                    devMode: true,
                    timestamp: new Date()
                };
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error simulating payment:', error);
            throw error;
        }
    }

    // Process cash payment (staff verification required)
    async processCashPayment(orderId, amount, staffId, notes = '') {
        try {
            const db = require('../config/db');
            const connection = await db.getConnection();

            await connection.beginTransaction();

            try {
                // Verify order exists and is not paid
                const [orders] = await connection.query(`
                    SELECT * FROM orders WHERE order_id = ? AND payment_status = 'pending'
                `, [orderId]);

                if (orders.length === 0) {
                    throw new Error('Order not found or already paid');
                }

                const order = orders[0];

                // Verify amount is sufficient (cash payments can be more than total for change)
                if (parseFloat(amount) < parseFloat(order.total_price)) {
                    throw new Error('Payment amount insufficient');
                }

                // Update order payment status
                await connection.query(`
                    UPDATE orders 
                    SET payment_status = 'paid', 
                        payment_method = 'cash',
                        completed_time = NOW()
                    WHERE order_id = ?
                `, [orderId]);

                // Log cash payment transaction
                const transactionId = `CASH-DEV-${uuidv4()}`;
                await connection.query(`
                    INSERT INTO payment_transactions 
                    (order_id, payment_method, amount, transaction_id, reference, status, created_at, staff_id, notes) 
                    VALUES (?, 'cash', ?, ?, ?, 'completed', NOW(), ?, ?)
                `, [orderId, amount, transactionId, `CASH-DEV-${orderId}`, staffId, notes]);

                // Log staff activity
                await connection.query(`
                    INSERT INTO staff_activities 
                    (staff_id, action, order_id, details, created_at) 
                    VALUES (?, 'cash_payment_verified', ?, ?, NOW())
                `, [staffId, orderId, `Cash payment verified for order ${orderId} (DEV MODE)`]);

                await connection.commit();

                // Deduct ingredients after successful cash payment (outside transaction to avoid rollback)
                try {
                    const ingredientDeductionService = require('./ingredientDeductionService');
                    const items = JSON.parse(order.items || '[]');

                    const itemsForDeduction = items.map(item => ({
                        menuItemId: item.menu_item_id || item.id,
                        quantity: item.quantity || 1,
                        customizations: item.customizations || null,
                        name: item.name
                    }));

                    // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment completion
                } catch (deductionError) {
                    console.error(`Failed to deduct ingredients for order ${orderId} after cash payment completion:`, deductionError);
                    // Don't fail the payment if ingredient deduction fails
                    // The order is still paid, but inventory won't be updated
                }

                return {
                    success: true,
                    orderId,
                    amount,
                    method: 'cash',
                    transactionId,
                    staffId,
                    devMode: true,
                    timestamp: new Date()
                };
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error processing cash payment:', error);
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

    // Simulate payment callback (for testing)
    async simulatePaymentCallback(orderId, method, amount) {
        try {
            const result = await this.simulatePayment(orderId, method, amount);

            // Emit real-time update
            const io = require('socket.io');
            if (io) {
                io.to(`order-${orderId}`).emit('payment-updated', {
                    orderId: result.orderId,
                    status: 'paid',
                    method: result.method,
                    amount: result.amount,
                    devMode: true,
                    timestamp: new Date()
                });
                io.to('staff-room').emit('payment-updated', {
                    orderId: result.orderId,
                    status: 'paid',
                    method: result.method,
                    amount: result.amount,
                    devMode: true,
                    timestamp: new Date()
                });
            }

            return result;
        } catch (error) {
            console.error('Error simulating payment callback:', error);
            throw error;
        }
    }
}

module.exports = new DevPaymentService();