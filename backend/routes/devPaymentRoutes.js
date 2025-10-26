const express = require('express');
const router = express.Router();
const devPaymentService = require('../services/devPaymentService');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Generate simulated GCash QR Code for order
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

        // Generate simulated GCash QR code
        const qrData = await devPaymentService.generateGCashQR(
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
            gcashPaymentId: qrData.gcashPaymentId,
            devMode: true,
            message: 'DEV MODE: This is a simulated QR code for testing'
        });

    } catch (error) {
        console.error('Error generating GCash QR code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate GCash QR code'
        });
    }
});

// Generate simulated PayMaya QR Code for order
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

        // Generate simulated PayMaya QR code
        const qrData = await devPaymentService.generatePayMayaQR(
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
            paymayaPaymentId: qrData.paymayaPaymentId,
            devMode: true,
            message: 'DEV MODE: This is a simulated QR code for testing'
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

        // Process cash payment
        const result = await devPaymentService.processCashPayment(
            orderId,
            amount,
            staffId,
            notes
        );

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`order-${orderId}`).emit('payment-updated', {
                orderId,
                status: 'paid',
                method: 'cash',
                amount: amount,
                staffId: staffId,
                devMode: true,
                timestamp: new Date()
            });
            io.to('staff-room').emit('payment-updated', {
                orderId,
                status: 'paid',
                method: 'cash',
                amount: amount,
                staffId: staffId,
                devMode: true,
                timestamp: new Date()
            });
        }

        res.json({
            success: true,
            message: 'Cash payment processed successfully (DEV MODE)',
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

// Simulate payment processing (for testing)
router.post('/simulate/:orderId/:method', async(req, res) => {
    try {
        const { orderId, method } = req.params;
        const { amount } = req.body;

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

        // Simulate payment processing
        const result = await devPaymentService.simulatePayment(
            orderId,
            method,
            amount || order.total_price
        );

        // Emit real-time update
        const io = req.app.get('io');
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

        res.json({
            success: true,
            message: `Payment simulated successfully (DEV MODE)`,
            ...result
        });

    } catch (error) {
        console.error('Error simulating payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to simulate payment'
        });
    }
});

// Get payment history for an order
router.get('/history/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;

        const history = await devPaymentService.getPaymentHistory(orderId);

        res.json({
            success: true,
            history: history,
            devMode: true
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
            completedAt: order.completed_time,
            devMode: true
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
        const unsignedUrl = new URL(tableNumber ?
            `${baseUrl}/payment-status/${orderId}?table=${tableNumber}&dev=true` :
            `${baseUrl}/payment-status/${orderId}?dev=true`);

        const { signUrl } = require('../utils/urlSigner');
        const signedUrl = signUrl(unsignedUrl.toString(), { expiresInSeconds: 900 });

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
            orderId: orderId,
            devMode: true
        });

    } catch (error) {
        console.error('Error generating payment status QR:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate payment status QR'
        });
    }
});

// Development mode info
router.get('/dev-info', (req, res) => {
    res.json({
        success: true,
        message: 'Development Payment System Active',
        features: [
            'Simulated GCash QR codes',
            'Simulated PayMaya QR codes',
            'Cash payment processing with staff verification',
            'Payment simulation for testing',
            'Real-time updates via Socket.IO',
            'Complete transaction logging',
            'Staff activity tracking'
        ],
        endpoints: {
            'Generate GCash QR': 'POST /api/dev-payment/gcash/qr/:orderId',
            'Generate PayMaya QR': 'POST /api/dev-payment/paymaya/qr/:orderId',
            'Process Cash Payment': 'POST /api/dev-payment/cash/:orderId',
            'Simulate Payment': 'POST /api/dev-payment/simulate/:orderId/:method',
            'Get Payment History': 'GET /api/dev-payment/history/:orderId',
            'Get Payment Status': 'GET /api/dev-payment/status/:orderId'
        },
        note: 'This is a development system for testing. Use actual business accounts for production.'
    });
});

module.exports = router;