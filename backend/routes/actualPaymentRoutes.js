const express = require('express');
const router = express.Router();
const actualPaymentService = require('../services/actualPaymentService');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Generate actual GCash QR Code for order
router.post('/gcash/qr/:orderId', async(req, res) => {
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

        // Generate actual GCash QR code
        const qrData = await actualPaymentService.generateGCashQR(
            orderId,
            order.total_price,
            tableNumber
        );

        // Update order with QR code
        await db.query(`
            UPDATE orders SET qr_code = ? WHERE order_id = ?
        `, [qrData.qrCode, orderId]);

        res.json({
            success: true,
            qrCode: qrData.qrCode,
            paymentUrl: qrData.paymentUrl,
            orderId: orderId,
            amount: order.total_price,
            reference: qrData.reference,
            gcashPaymentId: qrData.gcashPaymentId
        });

    } catch (error) {
        console.error('Error generating GCash QR code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate GCash QR code'
        });
    }
});

// Generate actual PayMaya QR Code for order
router.post('/paymaya/qr/:orderId', async(req, res) => {
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

        // Generate actual PayMaya QR code
        const qrData = await actualPaymentService.generatePayMayaQR(
            orderId,
            order.total_price,
            tableNumber
        );

        // Update order with QR code
        await db.query(`
            UPDATE orders SET qr_code = ? WHERE order_id = ?
        `, [qrData.qrCode, orderId]);

        res.json({
            success: true,
            qrCode: qrData.qrCode,
            paymentUrl: qrData.paymentUrl,
            orderId: orderId,
            amount: order.total_price,
            reference: qrData.reference,
            paymayaPaymentId: qrData.paymayaPaymentId
        });

    } catch (error) {
        console.error('Error generating PayMaya QR code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PayMaya QR code'
        });
    }
});

// Process cash payment (staff verification required)
router.post('/cash/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { amount, staffId, notes } = req.body;

        // Verify staff authentication
        if (!staffId) {
            return res.status(401).json({
                success: false,
                error: 'Staff authentication required'
            });
        }

        // Process cash payment (with one retry/fallback for transient DB errors)
        let result;
        try {
            result = await actualPaymentService.processCashPayment(
                orderId,
                amount,
                staffId,
                notes
            );
        } catch (err) {
            const transient = String(err && (err.code || err.message || '')).includes('ECONN');
            if (!transient) throw err;
            console.warn('Transient DB error on cash payment, attempting fallback path:', err.code || err.message);
            // Fallback: mark order as paid using a fresh connection (no complex logging)
            const db = require('../config/db');
            const conn = await db.getConnection();
            try {
                await conn.beginTransaction();
                await conn.execute('UPDATE orders SET payment_status = ?, payment_method = ?, completed_time = NOW() WHERE order_id = ?', ['paid', 'cash', orderId]);
                const { v4: uuidv4 } = require('uuid');
                const txId = `CASH-${uuidv4()}`;
                await conn.execute('INSERT INTO payment_transactions (order_id, payment_method, amount, transaction_id, reference, status, created_at, staff_id, notes) VALUES (?, ?, ?, ?, ?, "completed", NOW(), ?, ?)', [orderId, 'cash', amount, txId, `CASH-${orderId}`, staffId, notes || 'fallback write']);
                await conn.commit();
                result = { success: true, orderId, amount, method: 'cash', transactionId: txId, staffId, timestamp: new Date() };
            } catch (e2) {
                try { await conn.rollback(); } catch (_) {}
                throw err; // bubble original
            } finally {
                try { conn.release(); } catch (_) {}
            }
        }

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            const paymentData = {
                orderId,
                status: 'paid',
                method: 'cash',
                amount: amount,
                staffId: staffId,
                timestamp: new Date()
            };

            io.to(`order-${orderId}`).emit('payment-updated', paymentData);
            io.to('staff-room').emit('payment-updated', paymentData);
            io.to('admin-room').emit('payment-updated', paymentData);
        } else {
            console.log('❌ Socket.IO not available for payment update');
        }

        res.json({
            success: true,
            message: 'Cash payment processed successfully',
            ...result
        });

    } catch (error) {
        console.error('Error processing cash payment:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process cash payment'
        });
    }
});

// GCash payment callback (webhook from GCash)
router.post('/gcash/callback', async(req, res) => {
    try {
        const signature = req.headers['x-gcash-signature'];
        const payload = req.body;

        // Verify webhook signature
        if (!actualPaymentService.verifyGCashWebhook(payload, signature)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature'
            });
        }

        // Process payment callback
        const result = await actualPaymentService.processPaymentCallback(payload, 'gcash');

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            const paymentData = {
                orderId: result.orderId,
                status: 'paid',
                method: 'gcash',
                amount: result.amount,
                timestamp: new Date()
            };

            io.to(`order-${result.orderId}`).emit('payment-updated', paymentData);
            io.to('staff-room').emit('payment-updated', paymentData);
            io.to('admin-room').emit('payment-updated', paymentData);
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error processing GCash callback:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process callback'
        });
    }
});

// PayMaya payment callback (webhook from PayMaya)
router.post('/paymaya/callback', async(req, res) => {
    try {
        const signature = req.headers['x-paymaya-signature'];
        const payload = req.body;

        // Verify webhook signature
        if (!actualPaymentService.verifyPayMayaWebhook(payload, signature)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid signature'
            });
        }

        // Process payment callback
        const result = await actualPaymentService.processPaymentCallback(payload, 'paymaya');

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            const paymentData = {
                orderId: result.orderId,
                status: 'paid',
                method: 'paymaya',
                amount: result.amount,
                timestamp: new Date()
            };

            io.to(`order-${result.orderId}`).emit('payment-updated', paymentData);
            io.to('staff-room').emit('payment-updated', paymentData);
            io.to('admin-room').emit('payment-updated', paymentData);
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error processing PayMaya callback:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process callback'
        });
    }
});

// Check payment status from payment provider
router.get('/status/:paymentId/:method', async(req, res) => {
    try {
        const { paymentId, method } = req.params;

        const status = await actualPaymentService.checkPaymentStatus(paymentId, method);

        res.json({
            success: true,
            status: status
        });

    } catch (error) {
        console.error('Error checking payment status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check payment status'
        });
    }
});

// Get payment history for an order
router.get('/history/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;

        const history = await actualPaymentService.getPaymentHistory(orderId);

        res.json({
            success: true,
            history: history
        });

    } catch (error) {
        console.error('Error getting payment history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get payment history'
        });
    }
});

// Get payment status
router.get('/status/:orderId', async(req, res) => {
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

// Generate payment status QR for customer tracking (signed URL)
router.post('/status-qr/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { tableNumber } = req.body;

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        // Build unsigned URL first
        const unsignedUrl = new URL(tableNumber ?
            `${baseUrl}/payment-status/${orderId}?table=${tableNumber}` :
            `${baseUrl}/payment-status/${orderId}`);

        // Sign URL with short expiry to limit brute force
        const { signUrl } = require('../utils/urlSigner');
        const signedUrl = signUrl(unsignedUrl.toString(), { expiresInSeconds: 900 }); // 15 minutes

        const QRCode = require('qrcode');
        const qrCodeDataURL = await QRCode.toDataURL(signedUrl, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        res.json({
            success: true,
            qrCode: qrCodeDataURL,
            url: signedUrl,
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