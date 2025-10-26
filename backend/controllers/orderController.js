const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const createOrder = async(req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            customerId,
            customerName,
            tableNumber,
            items,
            totalPrice,
            paymentMethod,
            notes
        } = req.body;

        const orderId = uuidv4();

        // Create order record
        await connection.query(`
            INSERT INTO orders (
                order_id, 
                customer_id, 
                customer_name,
                table_number,
                total_price,
                payment_method,
                payment_status,
                status,
                notes,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'new', ?, NOW())
        `, [orderId, customerId, customerName, tableNumber, totalPrice, paymentMethod, notes]);

        // Insert order items
        for (const item of items) {
            await connection.query(`
                INSERT INTO order_items (
                    order_id,
                    name,
                    price,
                    quantity,
                    customizations
                ) VALUES (?, ?, ?, ?, ?)
            `, [orderId, item.name, item.price, item.quantity, JSON.stringify(item.customizations)]);
        }

        // Emit new order event
        const io = req.app.get('io');
        io.emit('newOrder', {
            orderId,
            items,
            customerName,
            status: 'pending',
            totalPrice
        });

        await connection.commit();

        res.status(201).json({
            success: true,
            orderId,
            message: 'Order created successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order'
        });
    } finally {
        connection.release();
    }
};

const getOrder = async(req, res) => {
    try {
        const { orderId } = req.params;

        const [orders] = await db.query(`
            SELECT * FROM orders WHERE order_id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const [items] = await db.query(`
            SELECT * FROM order_items WHERE order_id = ?
        `, [orderId]);

        res.json({
            success: true,
            order: {
                ...orders[0],
                items
            }
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get order'
        });
    }
};

const updateOrderStatus = async(req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const [result] = await db.query(`
            UPDATE orders SET status = ? WHERE order_id = ?
        `, [status, orderId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Emit status update event
        const io = req.app.get('io');
        if (io) {
            // Emit to specific order room
            io.to(`order-${orderId}`).emit('order-updated', { orderId, status });
            // Emit to staff and admin rooms
            io.to('staff-room').emit('order-updated', { orderId, status });
            io.to('admin-room').emit('order-updated', { orderId, status });
            // Broadcast to all customers
            io.emit('order-updated', { orderId, status });
        }

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
};

module.exports = {
    createOrder,
    getOrder,
    updateOrderStatus
};