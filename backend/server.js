// server.js - Main entry point for the backend server
// Import required modules
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const https = require('https');
const fs = require('fs');
const helmet = require('helmet');
const socketIo = require('socket.io');
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
const db = require('./config/db');
const passport = require('passport');
const passportConfig = require('./controllers/passport');

// Import background services
let lowStockMonitorService;
try {
    lowStockMonitorService = require('./services/lowStockMonitorService');
} catch (error) {
    console.warn('⚠️  lowStockMonitorService not available:', error.message);
}

// Load environment variables from .env file
dotenv.config();

// Create Express app and set port
const app = express();

// Note: CORS will be configured properly below with corsOptions
// This initial setup is removed to prevent conflicts
app.set('trust proxy', 1);
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;

// ✅ Helper to normalize origins (remove trailing slash, lowercase)
function normalizeOrigin(origin) {
    if (!origin) {
        return '';
    }

    try {
        const parsed = new URL(origin.trim());
        return parsed.origin.toLowerCase();
    } catch (error) {
        return origin.trim().toLowerCase();
    }
}

// ✅ FIX: Apply CORS middleware early - MUST be defined before Socket.IO
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "https://mauricios-cafe-bakery.vercel.app",
    "https://mauricios-cafe-bakery.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
].filter(Boolean).map((origin) => origin.trim());

const normalizedAllowedOrigins = allowedOrigins
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

console.log('🔐 Allowed origins (raw):', allowedOrigins);
console.log('🔐 Allowed origins (normalized):', normalizedAllowedOrigins);

function isAllowedOrigin(origin) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
        console.log('✅ CORS: No origin (mobile app/Postman) - allowed');
        return true;
    }

    try {
        const url = new URL(origin);
        const hostname = url.hostname.toLowerCase();

        // Check if in allowed origins list (case-insensitive, normalized)
        const normalizedOrigin = normalizeOrigin(origin);
        if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
            console.log('✅ CORS: Origin in allowed list:', origin);
            return true;
        }

        // Allow all Vercel URLs (production and preview) - more permissive check
        if (hostname.endsWith('.vercel.app') ||
            hostname.includes('.vercel.app') ||
            hostname === 'vercel.app') {
            console.log('✅ CORS: Vercel origin allowed:', origin);
            return true;
        }

        // Allow Render URLs
        if (hostname.endsWith('.onrender.com') ||
            hostname.includes('.onrender.com') ||
            hostname === 'onrender.com') {
            console.log('✅ CORS: Render origin allowed:', origin);
            return true;
        }

        // Allow localhost for development (any port)
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
            console.log('✅ CORS: Localhost origin allowed:', origin);
            return true;
        }

        console.log('❌ CORS: Origin NOT allowed:', {
            origin: origin,
            hostname: hostname,
            normalizedOrigin,
            normalizedAllowedOrigins
        });
        return false;
    } catch (error) {
        console.error('❌ CORS Origin Check Error:', error.message, 'Origin:', origin);
        // In case of error, be more permissive in production to avoid blocking legitimate requests
        if (process.env.NODE_ENV === 'production') {
            console.log('⚠️ CORS: Production mode - allowing origin due to parse error');
            return true;
        }
        return false;
    }
}

// ✅ FIX: Proper Socket.IO CORS configuration - MUST be after isAllowedOrigin function
const io = socketIo(server, {
    cors: {
        origin: function(origin, callback) {
            // Use the same origin check function for consistency
            if (isAllowedOrigin(origin)) {
                console.log("✅ Socket.IO CORS allowed for origin:", origin || 'NO ORIGIN');
                return callback(null, true);
            }
            console.error("❌ Socket.IO CORS blocked for origin:", origin);
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST"],
        credentials: false // JWT-only, no cookies
    }
});

const corsOptions = {
    origin: function(origin, callback) {
        // Log CORS check for debugging
        console.log('🔍 CORS Preflight Check - Origin:', origin || 'NO ORIGIN');

        if (isAllowedOrigin(origin)) {
            console.log('✅ CORS: Origin allowed');
            return callback(null, true);
        }

        console.error('❌ CORS: Origin NOT allowed:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // ✅ Must include Authorization
    exposedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
    preflightContinue: false // Let CORS handle preflight
};

// ✅ HTTPS redirection (keep this after cors)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
        }
        next();
    });
}


// Optional: redirect HTTP to HTTPS when behind a proxy/production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
        }
        next();
    });
}
// CRITICAL: Apply CORS headers FIRST, before any other middleware
// This ensures CORS headers are on ALL responses, including errors
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Log for debugging
    console.log('🔍 CORS Request:', {
        origin: origin || 'NO ORIGIN',
        method: req.method,
        path: req.path,
        url: req.url
    });

    if (isAllowedOrigin(origin)) {
        // Apply CORS headers to ALL requests (not just preflight)
        // NOTE: We now explicitly set Access-Control-Allow-Credentials to support frontend requests
        // that send credentials: 'include' (browser requirement)
        // CRITICAL: Only set origin if it exists, never use '*' as fallback
        if (origin) {
            res.header('Access-Control-Allow-Origin', origin);
        }
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

        // Handle preflight requests IMMEDIATELY
        if (req.method === 'OPTIONS') {
            console.log('✅ CORS Preflight: Sending 204');
            return res.sendStatus(204);
        }

        console.log('✅ CORS: Headers applied to', req.method, req.path);
    } else if (origin) {
        console.error('❌ CORS: Origin not allowed:', origin);
        console.error('❌ CORS: Allowed origins:', allowedOrigins);
        // Don't set CORS headers - browser will handle the CORS error
        // But continue processing so we can log the attempt
    } else {
        // No origin header (same-origin request or mobile app)
        console.log('⚠️ CORS: No origin header (same-origin or mobile app)');
    }

    // CRITICAL: Store origin in res.locals so we can apply headers in response interceptor
    res.locals.corsOrigin = origin;
    res.locals.isAllowedOrigin = isAllowedOrigin(origin);

    next();
});

// CRITICAL: Middleware to ensure CORS headers are on ALL responses
// This runs after routes but before response is sent
app.use((req, res, next) => {
    // Store original functions
    const originalJson = res.json;
    const originalSend = res.send;
    const originalEnd = res.end;

    // Helper function to set CORS headers
    const setCorsHeaders = () => {
        if (res.locals.isAllowedOrigin && res.locals.corsOrigin) {
            res.setHeader('Access-Control-Allow-Origin', res.locals.corsOrigin);
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    };

    // Override json to add CORS headers
    res.json = function(body) {
        setCorsHeaders();
        return originalJson.call(this, body);
    };

    // Override send to add CORS headers
    res.send = function(body) {
        setCorsHeaders();
        return originalSend.call(this, body);
    };

    // Override end to add CORS headers
    res.end = function(chunk, encoding) {
        setCorsHeaders();
        return originalEnd.call(this, chunk, encoding);
    };

    next();
});

// Apply CORS middleware (this handles preflight and basic CORS)
// Note: Our manual headers above ensure CORS headers are on ALL responses
app.use(cors(corsOptions));

// Ensure preflight handled for all routes
app.options('*', cors(corsOptions));

// CRITICAL: Apply CORS headers AFTER cors() middleware to ensure they're not overwritten
// This ensures headers are on actual responses (not just preflight)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin) && origin) {
        // Ensure CORS headers are set (cors() package might not set them for all responses)
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    next();
});

// Extra CORS guard specifically for Socket.IO polling/websocket endpoints
// Note: Socket.IO may need credentials for its own auth, but API routes use JWT
app.use(['/socket.io', '/socket.io/*'], (req, res, next) => {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Credentials', 'true');
        if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
});

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory and allow cross-origin resource policy for images
const path = require('path');
app.use('/uploads', (req, res, next) => {
    // Required for loading images from a different origin (e.g., Vite on 5173)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// Removed legacy route rewrite that caused paths like /inventoryapi/inventory

// Trust proxy (needed if behind proxies and for correct cookie handling)
app.set('trust proxy', 1);

// Security headers middleware to prevent caching of sensitive pages
app.use((req, res, next) => {
    // Set security headers for all responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent caching of sensitive routes
    if (req.path.includes('/admin') || req.path.includes('/staff') || req.path.includes('/customer')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }

    next();
});

// ✅ HYBRID SETUP: Sessions only for Google OAuth, JWT for everything else
// Session configuration for Google OAuth (Passport.js requires sessions)
// IMPORTANT: Reuse the main DB pool to avoid a second pool that may drop
const sessionOptions = {
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' }
    }
};
const sessionStore = new MySQLStore(sessionOptions, db.pool);

// Handle session store errors
sessionStore.on('error', (error) => {
    console.error('Session store error:', error);
});

sessionStore.on('connect', () => {
    console.log('✅ Session store connected (for Google OAuth only)');
});

// Build cookie config for Google OAuth sessions only
// Note: These cookies are only sent for /api/auth/google routes
const cookieConfig = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true in production (HTTPS)
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
    maxAge: 1000 * 60 * 60, // 1 hour (OAuth flow is quick)
    path: '/'
        // Intentionally NOT setting domain - works better for cross-origin
};

// ✅ Create session middleware (but don't apply it globally)
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'change-me-in-prod',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: false, // Don't extend session on every request (OAuth is quick)
    proxy: true,
    name: 'connect.sid',
    cookie: cookieConfig
});

// ✅ Initialize Passport.js (needed for Google OAuth)
passportConfig(passport, db);
app.use(passport.initialize());
// NOTE: passport.session() will be applied ONLY to Google OAuth routes below

console.log('✅ Hybrid auth mode: JWT for normal logins, Sessions only for Google OAuth');

// Debug endpoint for mobile session testing
app.get('/api/debug/session', (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    res.json({
        sessionId: req.sessionID,
        hasSession: !!req.session,
        hasAdminUser: !!(req.session && req.session.adminUser),
        hasStaffUser: !!(req.session && req.session.staffUser),
        hasCustomerUser: !!(req.session && req.session.customerUser),
        isMobile,
        userAgent: userAgent.substring(0, 100),
        cookies: req.headers.cookie,
        timestamp: new Date().toISOString()
    });
});

// Echo request headers and cookies to verify proxy/cookie behavior
app.get('/api/debug/headers', (req, res) => {
    res.json({
        headers: req.headers,
        cookies: req.headers.cookie || null,
        sessionId: req.sessionID || null
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join order room for real-time updates
    socket.on('join-order-room', (orderId) => {
        // Accept either raw id or already prefixed value
        const room = String(orderId).startsWith('order-') ? String(orderId) : `order-${orderId}`;
        socket.join(room);
        console.log(`Client ${socket.id} joined order room: ${room}`);
    });

    // Join staff room for POS updates
    socket.on('join-staff-room', () => {
        socket.join('staff-room');
    });

    // Join admin room for admin updates
    socket.on('join-admin-room', () => {
        socket.join('admin-room');
    });

    // Join customer room for customer updates
    socket.on('join-customer-room', (data) => {
        const roomName = `customer-${data.customerEmail}`;
        socket.join(roomName);
        console.log(`🔌 Client ${socket.id} joined customer room: ${roomName}`);
        console.log(`📧 Customer email: ${data.customerEmail}`);

        // Send a test event to confirm the room is working
        socket.emit('test-customer-room', {
            message: 'Customer room joined successfully',
            room: roomName,
            timestamp: new Date()
        });
    });

    // Handle order status updates
    socket.on('order-status-update', (data) => {
        io.to(`order-${data.orderId}`).emit('order-updated', data);
        io.to('staff-room').emit('order-updated', data);
        io.to('admin-room').emit('order-updated', data);
        // Broadcast to all customer rooms for order updates
        io.emit('order-updated', data);
    });

    // Handle new order notifications
    socket.on('new-order', (orderData) => {
        io.to('staff-room').emit('new-order-received', orderData);
        io.to('admin-room').emit('new-order-received', orderData);
    });

    // Handle inventory updates
    socket.on('inventory-update', (data) => {
        console.log('🔔 Server received inventory-update event:', data);
        io.to('staff-room').emit('inventory-updated', data);
        io.to('admin-room').emit('inventory-updated', data);
    });


    // Handle payment status updates
    socket.on('payment-update', (data) => {
        io.to(`order-${data.orderId}`).emit('payment-updated', data);
        io.to('staff-room').emit('payment-updated', data);
        io.to('admin-room').emit('payment-updated', data);
        // Broadcast to all customer rooms for payment updates
        io.emit('payment-updated', data);
    });


    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Make io available to routes
app.set('io', io);

// Setup notification service with Socket.IO
const notificationService = require('./services/notificationService');
notificationService.setupSocketConnection(io);

// Setup order processing service with Socket.IO
const orderProcessingService = require('./services/orderProcessingService');
orderProcessingService.setupSocketConnection(io);

// Setup low stock monitor
//const lowStockMonitorService = require('./services/lowStockMonitorService');

// Debug middleware to log all routes
app.use((req, res, next) => {
    console.log(`Route requested: ${req.method} ${req.url}`);
    next();
});

// Add before route registrations - comprehensive request logging
app.use((req, res, next) => {
    const origin = req.headers.origin || 'no-origin';
    const method = req.method;
    const path = req.url;
    const hasCookies = req.headers.cookie ? 'YES' : 'NO';

    // Only log API routes and login attempts
    if (path.includes('/api/') || path.includes('/auth/')) {
        console.log(`🌐 ${method} ${path} | Origin: ${origin.substring(0, 50)} | Cookies: ${hasCookies}`);

        // Log login attempts with more detail
        if (path.includes('/login') && method === 'POST') {
            console.log('🔐 LOGIN ATTEMPT DETECTED:', {
                path,
                origin,
                hasCookies,
                contentType: req.headers['content-type'],
                bodySize: req.headers['content-length']
            });
        }
    }
    next();
});

// ✅ Apply session middleware ONLY to Google OAuth routes
// This allows Passport.js to work for OAuth while keeping JWT-only for normal logins
app.use('/api/auth/google', sessionMiddleware, passport.session());

// Register routes with /api prefix
// IMPORTANT: authRoutes must come FIRST to handle login endpoints before specific routes
app.use('/api', authRoutes);

// Test endpoints for export functionality (no authentication required)
app.get('/api/test-export', async(req, res) => {
    try {
        console.log('Testing export packages...');

        // Test write-excel-file
        const writeExcelFile = require('write-excel-file/node');
        const testData = [
            ['Name', 'Value'],
            ['Test', 123]
        ];
        const excelBuffer = await writeExcelFile(testData, {
            schema: [
                { column: 'Name', type: String, value: row => row[0] },
                { column: 'Value', type: Number, value: row => row[1] }
            ]
        });

        // Test PDF
        const jsPDF = require('jspdf').jsPDF;
        const doc = new jsPDF();
        doc.text('Test PDF', 10, 10);
        const pdfBuffer = doc.output('arraybuffer');

        res.json({
            success: true,
            message: 'Export packages are working',
            excelSize: excelBuffer.length,
            pdfSize: pdfBuffer.byteLength
        });
    } catch (error) {
        console.error('Test export error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/test-excel', async(req, res) => {
    try {
        const writeExcelFile = require('write-excel-file/node');
        const testData = [
            ['Order ID', 'Customer', 'Amount'],
            ['TEST-001', 'Test Customer', 100.50],
            ['TEST-002', 'Another Customer', 250.75]
        ];

        const excelBuffer = await writeExcelFile(testData, {
            schema: [
                { column: 'Order ID', type: String, value: row => row[0] },
                { column: 'Customer', type: String, value: row => row[1] },
                { column: 'Amount', type: Number, value: row => row[2] }
            ]
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="test-report.xlsx"');
        res.setHeader('Content-Length', excelBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');

        res.end(excelBuffer, 'binary');
    } catch (error) {
        console.error('Test Excel error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test-pdf', async(req, res) => {
    try {
        const jsPDF = require('jspdf').jsPDF;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text('Test Sales Report', 14, 22);

        doc.setFontSize(12);
        doc.text('This is a test PDF file', 14, 35);
        doc.text('Generated at: ' + new Date().toLocaleString(), 14, 45);

        const pdfBuffer = doc.output('arraybuffer');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="test-report.pdf"');
        res.setHeader('Content-Length', pdfBuffer.byteLength);
        res.setHeader('Cache-Control', 'no-cache');

        res.end(Buffer.from(pdfBuffer), 'binary');
    } catch (error) {
        console.error('Test PDF error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.use('/api/inventory', inventoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', userSettingsRoutes);
app.use('/api/customer', customerOrderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/guest', guestOrderRoutes);
app.use('/api/orders', orderRoutes); // Add the missing order routes
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

// Use development or production payment routes based on environment
if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode: Using simulated payment system');
    app.use('/api/payment', devPaymentRoutes);
    app.use('/api/dev-payment', devPaymentRoutes); // Alternative endpoint for clarity
} else {
    console.log('🚀 Production mode: Using actual payment system');
    app.use('/api/payment', actualPaymentRoutes);
}

// Daily reset routes
app.use('/api/daily-reset', dailyResetRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        paymentMode: process.env.NODE_ENV === 'development' ? 'simulated' : 'actual'
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
    });
    if (res.headersSent) {
        return next(err);
    }
    try {
        // ⭐ CRITICAL: Add CORS headers to error responses
        const origin = req.headers.origin;
        if (isAllowedOrigin(origin) && origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } catch (_) {
        // prevent double-send crashes
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', {
        message: err.message,
        stack: err.stack,
        name: err.name
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', {
        message: err.message,
        stack: err.stack,
        name: err.name
    });
    process.exit(1);
});

// Start the server and listen for incoming requests
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.IO server ready for real-time updates`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Payment System: ${process.env.NODE_ENV === 'development' ? 'Simulated (DEV MODE)' : 'Actual (Production)'}`);

    // Start ingredient deduction queue service (guarded by env to reduce DB contention)
    if (process.env.DISABLE_BACKGROUND_JOBS !== '1') {
        (async() => {
            try {
                const ingredientDeductionQueueService = require('./services/ingredientDeductionQueueService');
                const db = require('./config/db');
                const [tables] = await db.query(`SHOW TABLES LIKE 'ingredient_deduction_queue'`);
                if (tables.length > 0) {
                    ingredientDeductionQueueService.start();
                    console.log(`🍳 Ingredient deduction queue service started`);
                } else {
                    console.log(`⚠️  Ingredient deduction queue service not started - tables not ready`);
                }
            } catch (error) {
                console.error('❌ Failed to start ingredient deduction queue service:', error.message);
                // Don't crash the server if background services fail
            }
        })();
    } else {
        console.log('⏸ Ingredient deduction queue disabled by DISABLE_BACKGROUND_JOBS=1');
    }

    // Start low stock monitor (guarded)
    if (process.env.DISABLE_BACKGROUND_JOBS !== '1' && lowStockMonitorService) {
        (async() => {
            try {
                const db = require('./config/db');
                const [tables] = await db.query(`SHOW TABLES LIKE 'notifications'`);
                if (tables.length > 0) {
                    lowStockMonitorService.start(2);
                    console.log(`🔍 Low stock monitor started`);
                } else {
                    console.log(`⚠️  Low stock monitor not started - notifications table not ready`);
                }
            } catch (error) {
                console.error('❌ Failed to start low stock monitor:', error.message);
                // Don't crash the server if background services fail
            }
        })();
    } else if (!lowStockMonitorService) {
        console.log('⏸ Low stock monitor disabled - service not available');
    } else {
        console.log('⏸ Low stock monitor disabled by DISABLE_BACKGROUND_JOBS=1');
    }

    // Start scheduled notification service (guarded)
    if (process.env.DISABLE_BACKGROUND_JOBS !== '1') {
        (async() => {
            try {
                const db = require('./config/db');
                const [tables] = await db.query(`SHOW TABLES LIKE 'notifications'`);
                if (tables.length > 0) {
                    const scheduledNotificationService = require('./services/scheduledNotificationService');
                    scheduledNotificationService.start();
                    console.log(`📧 Scheduled notification service started`);
                } else {
                    console.log(`⚠️  Scheduled notification service not started - notifications table not ready`);
                }
            } catch (error) {
                console.error('❌ Failed to start scheduled notification service:', error.message);
                // Don't crash the server if background services fail
            }
        })();
    } else {
        console.log('⏸ Scheduled notification service disabled by DISABLE_BACKGROUND_JOBS=1');
    }

    // Start daily cleanup job for old cancelled orders (guarded)
    if (process.env.DISABLE_BACKGROUND_JOBS !== '1') {
        (async() => {
            try {
                const { startCleanupJob } = require('./scripts/setup-daily-cleanup');
                startCleanupJob();
                console.log(`🧹 Daily cleanup job started`);
            } catch (error) {
                console.error('❌ Failed to start daily cleanup job:', error.message);
                // Don't crash the server if background services fail
            }
        })();
    } else {
        console.log('⏸ Daily cleanup job disabled by DISABLE_BACKGROUND_JOBS=1');
    }
}).on('error', (err) => {
    console.error('Server error:', {
        message: err.message,
        stack: err.stack,
        name: err.name
    });
});