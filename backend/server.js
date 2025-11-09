// server.js - Main backend entry point
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const passport = require('passport');
const db = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

// -------------------
// ⭐ CRITICAL: Log ALL incoming headers BEFORE CORS (for debugging)
// -------------------
app.use((req, res, next) => {
    // Only log for check-session requests
    if (req.path && req.path.includes('check-session')) {
        console.log('🔍 RAW REQUEST HEADERS (before CORS):', {
            method: req.method,
            path: req.path,
            headers: Object.keys(req.headers),
            authorization: req.headers['authorization'] || req.headers['Authorization'] || 'NOT FOUND',
            allHeaderKeys: Object.keys(req.headers)
        });
    }
    next();
});
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);

        const allowed = [
            'https://mauricios-cafe-bakery.vercel.app',
            'https://mauricios-cafe-bakery-4eq8kul9f-josh-sayats-projects.vercel.app',
            'https://mauricios-cafe-bakery.onrender.com',
            'http://localhost:5173',
            'http://127.0.0.1:5173'
        ];

        if (allowed.some(o => origin.includes(o))) {
            return callback(null, true);
        }

        // Allow all origins for dev fallback
        if (process.env.NODE_ENV !== 'production') return callback(null, true);

        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'authorization',
        'AUTHORIZATION',
        'X-Authorization',
        'x-authorization',
        'X-Requested-With',
        'Accept',
        'Accept-Language',
        'Content-Language',
        'Origin',
        'Referer'
    ],
    exposedHeaders: ['Authorization', 'authorization'],
    credentials: true, // JWT-only authentication - no cookies needed
    optionsSuccessStatus: 204,
    preflightContinue: false,
    maxAge: 86400 // Cache preflight for 24 hours
}));

// -------------------
// CORS - SIMPLE AND WORKING
// -------------------
// CORS configuration that works with both old and new frontend builds
/*app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Allow Vercel frontend and Render backend
        if (origin.includes('vercel.app') ||
            origin.includes('mauricios-cafe-bakery.vercel.app') ||
            origin.includes('onrender.com') ||
            origin === 'http://localhost:5173' ||
            origin === 'http://127.0.0.1:5173') {
            return callback(null, true);
        }

        // Allow all origins in development
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        callback(null, true); // Allow all for now
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'authorization',
        'AUTHORIZATION',
        'X-Authorization',
        'x-authorization',
        'X-Requested-With',
        'Accept',
        'Accept-Language',
        'Content-Language'
    ],
    exposedHeaders: ['Authorization', 'authorization'],
    credentials: false, // JWT-only authentication - no cookies/credentials needed
    optionsSuccessStatus: 204,
    preflightContinue: false,
    maxAge: 86400 // Cache preflight for 24 hours
}));*/

// -------------------
// Body parsing
// -------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------
// Serve uploads
// -------------------
app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// -------------------
// Security headers
// -------------------
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (req.path.includes('/admin') || req.path.includes('/staff') || req.path.includes('/customer')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }
    next();
});

// -------------------
// Session (Google OAuth only)
// -------------------
const sessionStore = new MySQLStore({
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' }
    }
}, db.pool);

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'change-me-in-prod',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    proxy: true,
    name: 'connect.sid',
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 3600000,
        path: '/'
    }
});

// -------------------
// Passport.js
// -------------------
const passportConfig = require('./controllers/passport');
passportConfig(passport, db);
app.use(passport.initialize());
app.use('/api/auth/google', sessionMiddleware, passport.session());

// -------------------
// Routes
// -------------------
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const eventRoutes = require('./routes/eventRoutes');
const menuRoutes = require('./routes/menuRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');
const aiChatRoutes = require('./routes/aiChatRoutes');
const actualPaymentRoutes = require('./routes/actualPaymentRoutes');
const devPaymentRoutes = require('./routes/devPaymentRoutes');
const adminInventoryRoutes = require('./routes/adminInventoryRoutes');
const customerOrderRoutes = require('./routes/customerOrderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const guestOrderRoutes = require('./routes/guestOrderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const staffRoutes = require('./routes/staffRoutes');
const userSettingsRoutes = require('./routes/userSettingsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const lowStockRoutes = require('./routes/lowStockRoutes');
const cleanupRoutes = require('./routes/cleanupRoutes');
const dailyResetRoutes = require('./routes/dailyResetRoutes');

app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', userSettingsRoutes);
app.use('/api/customer', customerOrderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/guest', guestOrderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', eventRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api', feedbackRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/low-stock', lowStockRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/daily-reset', dailyResetRoutes);

// -------------------
// Health check endpoint
// -------------------
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Payment routes
if (process.env.NODE_ENV === 'development') {
    app.use('/api/payment', devPaymentRoutes);
    app.use('/api/dev-payment', devPaymentRoutes);
} else {
    app.use('/api/payment', actualPaymentRoutes);
}

// -------------------
// Socket.IO
// -------------------
const io = socketIo(server, {
    cors: {
        origin: (origin, callback) => callback(null, true),
        methods: ["GET", "POST"],
        credentials: false
    }
});
app.set('io', io);

// -------------------
// 404 handler
// -------------------
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// -------------------
// Global error handler
// -------------------
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    if (res.headersSent) return next(err);

    // CORS is handled by cors middleware above, just send error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// -------------------
// Start server
// -------------------
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS: Allowing all origins (debugging mode)`);
}).on('error', (err) => {
    console.error('❌ Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port.`);
    }
    process.exit(1);
});