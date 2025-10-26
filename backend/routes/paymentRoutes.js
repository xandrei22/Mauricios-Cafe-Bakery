const express = require('express');
const router = express.Router();
const actualPaymentService = require('../services/actualPaymentService');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Generate GCash QR Code for order
router.post('/gcash/qr/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { tableNumber } = req.body;

        // Get order details
        const [orders] = await db.query(`
            SELECT * FROM orders WHERE order_id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const order = orders[0];

        // Check if order is already paid
        if (order.payment_status === 'paid') {
            return res.status(400).json({
                success: false,
                error: 'Order is already paid'
            });
        }

        // Generate GCash QR code
        const qrData = await actualPaymentService.generateGCashQR(
            orderId,
            order.total_price,
            tableNumber
        );

        // Update order with QR code and mark payment method
        await db.query(`
            UPDATE orders SET 
                qr_code = ?, 
                payment_method = 'gcash',
                payment_status = 'pending'
            WHERE order_id = ?
        `, [qrData.qrCode, orderId]);

        res.json({
            success: true,
            qrCode: qrData.qrCode,
            paymentUrl: qrData.paymentUrl,
            orderId: orderId,
            amount: order.total_price,
            reference: qrData.reference,
            paymentMethod: 'gcash'
        });

    } catch (error) {
        console.error('Error generating GCash QR code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate GCash QR code'
        });
    }
});

// Generate PayMaya QR Code for order
router.post('/paymaya/qr/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { tableNumber } = req.body;

        // Get order details
        const [orders] = await db.query(`
            SELECT * FROM orders WHERE order_id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const order = orders[0];

        // Check if order is already paid
        if (order.payment_status === 'paid') {
            return res.status(400).json({
                success: false,
                error: 'Order is already paid'
            });
        }

        // Generate PayMaya QR code
        const qrData = await actualPaymentService.generatePayMayaQR(
            orderId,
            order.total_price,
            tableNumber
        );

        // Update order with QR code and mark payment method
        await db.query(`
            UPDATE orders SET 
                qr_code = ?, 
                payment_method = 'paymaya',
                payment_status = 'pending'
            WHERE order_id = ?
        `, [qrData.qrCode, orderId]);

        res.json({
            success: true,
            qrCode: qrData.qrCode,
            paymentUrl: qrData.paymentUrl,
            orderId: orderId,
            amount: order.total_price,
            reference: qrData.reference,
            paymentMethod: 'paymaya'
        });

    } catch (error) {
        console.error('Error generating PayMaya QR code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PayMaya QR code'
        });
    }
});

// Process GCash payment (called when customer scans QR)
router.get('/gcash/process', async (req, res) => {
    try {
        const { orderId, amount, reference, tableNumber, timestamp } = req.query;

        // Verify payment data
        if (!orderId || !amount || !reference) {
            return res.status(400).json({
                success: false,
                error: 'Missing payment data'
            });
        }

        // Get order details
        const [orders] = await db.query(`
            SELECT * FROM orders WHERE order_id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const order = orders[0];

        // Check if order is already paid
        if (order.payment_status === 'paid') {
            return res.status(400).json({
                success: false,
                error: 'Order is already paid'
            });
        }

        // Verify amount is sufficient
        if (parseFloat(amount) < parseFloat(order.total_price)) {
            return res.status(400).json({
                success: false,
                error: 'Payment amount insufficient'
            });
        }

        // Process payment verification
        const transactionId = `GCASH-${uuidv4()}`;
        const paymentData = {
            orderId,
            amount,
            reference,
            transactionId,
            tableNumber
        };

        const result = await actualPaymentService.processPaymentVerification(paymentData, 'gcash');

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`order-${orderId}`).emit('payment-updated', {
                orderId,
                status: 'paid',
                method: 'gcash',
                amount: amount,
                timestamp: new Date()
            });
            io.to('staff-room').emit('payment-updated', {
                orderId,
                status: 'paid',
                method: 'gcash',
                amount: amount,
                timestamp: new Date()
            });
        }

        // Redirect to success page
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?orderId=${orderId}&method=gcash&amount=${amount}`);

    } catch (error) {
        console.error('Error processing GCash payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process payment'
        });
    }
});

// Process PayMaya payment (called when customer scans QR)
router.get('/paymaya/process', async (req, res) => {
    try {
        const { orderId, amount, reference, tableNumber, timestamp } = req.query;

        // Verify payment data
        if (!orderId || !amount || !reference) {
            return res.status(400).json({
                success: false,
                error: 'Missing payment data'
            });
        }

        // Get order details
        const [orders] = await db.query(`
            SELECT * FROM orders WHERE order_id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const order = orders[0];

        // Check if order is already paid
        if (order.payment_status === 'paid') {
            return res.status(400).json({
                success: false,
                error: 'Order is already paid'
            });
        }

        // Verify amount is sufficient
        if (parseFloat(amount) < parseFloat(order.total_price)) {
            return res.status(400).json({
                success: false,
                error: 'Payment amount insufficient'
            });
        }

        // Process payment verification
        const transactionId = `PAYMAYA-${uuidv4()}`;
        const paymentData = {
            orderId,
            amount,
            reference,
            transactionId,
            tableNumber
        };

        const result = await actualPaymentService.processPaymentVerification(paymentData, 'paymaya');

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`order-${orderId}`).emit('payment-updated', {
                orderId,
                status: 'paid',
                method: 'paymaya',
                amount: amount,
                timestamp: new Date()
            });
            io.to('staff-room').emit('payment-updated', {
                orderId,
                status: 'paid',
                method: 'paymaya',
                amount: amount,
                timestamp: new Date()
            });
        }

        // Redirect to success page
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?orderId=${orderId}&method=paymaya&amount=${amount}`);

    } catch (error) {
        console.error('Error processing PayMaya payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process payment'
        });
    }
});

// GCash webhook (for production - receives payment confirmations from GCash)
router.post('/gcash/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-gcash-signature'];
        const payload = req.body;

        // Verify webhook signature
        if (!actualPaymentService.verifyPaymentSignature(payload, signature, 'gcash')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature'
            });
        }

        // Process webhook data
        const { orderId, amount, reference, transactionId, status } = payload;

        if (status === 'success') {
            const paymentData = {
                orderId,
                amount,
                reference,
                transactionId
            };

            await actualPaymentService.processPaymentVerification(paymentData, 'gcash');

            // Emit real-time update
            const io = req.app.get('io');
            if (io) {
                io.to(`order-${orderId}`).emit('payment-updated', {
                    orderId,
                    status: 'paid',
                    method: 'gcash',
                    amount: amount,
                    timestamp: new Date()
                });
                io.to('staff-room').emit('payment-updated', {
                    orderId,
                    status: 'paid',
                    method: 'gcash',
                    amount: amount,
                    timestamp: new Date()
                });
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error processing GCash webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process webhook'
        });
    }
});

// PayMaya webhook (for production - receives payment confirmations from PayMaya)
router.post('/paymaya/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-paymaya-signature'];
        const payload = req.body;

        // Verify webhook signature
        if (!actualPaymentService.verifyPaymentSignature(payload, signature, 'paymaya')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature'
            });
        }

        // Process webhook data
        const { orderId, amount, reference, transactionId, status } = payload;

        if (status === 'success') {
            const paymentData = {
                orderId,
                amount,
                reference,
                transactionId
            };

            await actualPaymentService.processPaymentVerification(paymentData, 'paymaya');

            // Emit real-time update
            const io = req.app.get('io');
            if (io) {
                io.to(`order-${orderId}`).emit('payment-updated', {
                    orderId,
                    status: 'paid',
                    method: 'paymaya',
                    amount: amount,
                    timestamp: new Date()
                });
                io.to('staff-room').emit('payment-updated', {
                    orderId,
                    status: 'paid',
                    method: 'paymaya',
                    amount: amount,
                    timestamp: new Date()
                });
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error processing PayMaya webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process webhook'
        });
    }
});

// Get payment status
router.get('/status/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        const [orders] = await db.query(`
            SELECT order_id, payment_status, payment_method, total_price, created_at, completed_time
            FROM orders WHERE order_id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const order = orders[0];

        res.json({
            success: true,
            orderId: order.order_id,
            paymentStatus: order.payment_status,
            paymentMethod: order.payment_method,
            amount: order.total_price,
            createdAt: order.created_at,
            completedAt: order.completed_time
        });

    } catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get payment status'
        });
    }
});

// Generate payment status QR for customer tracking
router.post('/status-qr/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { tableNumber } = req.body;

        const qrData = await actualPaymentService.generatePaymentStatusQR(orderId, tableNumber);

        res.json({
            success: true,
            qrCode: qrData.qrCode,
            url: qrData.url,
            orderId: orderId
        });

    } catch (error) {
        console.error('Error generating payment status QR:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate payment status QR'
        });
    }
});

module.exports = router;