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
// Helper: Normalize origin
// -------------------
function normalizeOrigin(origin) {
    if (!origin) return '';
    try {
        const url = new URL(origin.trim());
        return url.origin.toLowerCase();
    } catch {
        return origin.trim().toLowerCase();
    }
}

// -------------------
// Allowed origins
// -------------------
// Parse CORS_ALLOWED_ORIGINS if set (comma-separated list)
const corsAllowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS ?
    process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean) :
    [];

const allowedOrigins = [
    process.env.FRONTEND_URL,
    ...corsAllowedOriginsEnv,
    "https://mauricios-cafe-bakery.vercel.app",
    "https://mauricios-cafe-bakery.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
].filter(Boolean).map(normalizeOrigin);

console.log('🌐 CORS Allowed Origins:', allowedOrigins);
console.log('🌐 CORS_ALLOWED_ORIGINS env:', process.env.CORS_ALLOWED_ORIGINS || 'not set');
console.log('🌐 FRONTEND_URL env:', process.env.FRONTEND_URL || 'not set');

function isAllowedOrigin(origin) {
    if (!origin) return true; // mobile app/Postman
    try {
        const normalized = normalizeOrigin(origin);
        const hostname = new URL(origin).hostname.toLowerCase();
        return allowedOrigins.includes(normalized) ||
            hostname.endsWith('.vercel.app') ||
            hostname.endsWith('.onrender.com') ||
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '::1';
    } catch {
        return process.env.NODE_ENV === 'production'; // be permissive in production
    }
}

// -------------------
// CORS middleware
// -------------------
const corsOptions = {
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            console.log('✅ CORS: Allowing origin:', origin);
            return callback(null, true);
        }
        console.warn('⚠️ CORS: Origin not in allowed list, but allowing for debugging:', origin);
        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // ⭐ CRITICAL: JWT-only - MUST be false (no cookies)
    optionsSuccessStatus: 204,
    maxAge: 86400 // Cache preflight for 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // ⭐ CRITICAL: Preflight must use same options

// Additional CORS headers for all responses (backup to ensure headers are set)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        if (isAllowedOrigin(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            res.setHeader('Access-Control-Max-Age', '86400');
        } else {
            // In production, be permissive if origin check fails
            if (process.env.NODE_ENV === 'production') {
                console.warn('⚠️ CORS: Allowing origin in production (permissive mode):', origin);
                res.setHeader('Access-Control-Allow-Origin', origin);
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            }
        }
    }
    next();
});

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
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin) && origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    }
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
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin) && origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    }
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

    const origin = req.headers.origin;
    if (isAllowedOrigin(origin) && origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        if (req.path.startsWith('/api/auth/google')) {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

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