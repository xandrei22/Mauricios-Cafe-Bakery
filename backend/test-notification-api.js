const express = require('express');
const session = require('express-session');
const notificationService = require('./services/notificationService');

// Create a test app
const app = express();

// Mock session middleware
app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Mock admin session
app.use((req, res, next) => {
    req.session.adminUser = {
        id: 1,
        role: 'admin',
        username: 'test-admin'
    };
    next();
});

// Test notification API
app.get('/test-notifications', async (req, res) => {
    try {
        console.log('Testing notification API...');
        console.log('Session adminUser:', req.session.adminUser);
        
        const notifications = await notificationService.getNotifications(
            req.session.adminUser.id,
            'admin',
            50,
            0
        );

        console.log('Found notifications:', notifications.length);
        notifications.forEach((notif, i) => {
            console.log(`${i+1}. [${notif.notification_type}] ${notif.title}: ${notif.message}`);
        });

        res.json({
            success: true,
            notifications: notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Error testing notifications:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Test unread count
app.get('/test-unread-count', async (req, res) => {
    try {
        const count = await notificationService.getUnreadCount(
            req.session.adminUser.id,
            'admin'
        );

        console.log('Unread count:', count);

        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Error testing unread count:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log('Test URLs:');
    console.log(`- http://localhost:${PORT}/test-notifications`);
    console.log(`- http://localhost:${PORT}/test-unread-count`);
});














