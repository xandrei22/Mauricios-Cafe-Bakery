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

// Load environment variables from .env file
dotenv.config();

// Create Express app and set port
const app = express();
// Behind Render/Vercel proxies, trust the proxy for correct protocol/WS handling
app.set('trust proxy', 1);
const server = http.createServer(app);

// ✅ FIX: Proper Socket.IO CORS configuration
const io = socketIo(server, {
    cors: {
        origin: function(origin, callback) {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            const allowedOrigins = [
                process.env.FRONTEND_URL,
                "https://mauricios-cafe-bakery.vercel.app",
                "https://mauricios-cafe-bakery-d9b03t1n4-josh-sayats-projects.vercel.app",
                "https://mauricios-cafe-bakery.onrender.com",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
            ];

            try {
                const hostname = new URL(origin).hostname;
                if (
                    allowedOrigins.includes(origin) ||
                    hostname.endsWith(".vercel.app") ||
                    hostname.endsWith("vercel.app")
                ) {
                    console.log("✅ Socket.IO CORS allowed for origin:", origin);
                    return callback(null, true);
                }
                console.error("❌ Socket.IO CORS blocked for origin:", origin);
                return callback(new Error('Not allowed by CORS'));
            } catch (err) {
                console.error("❌ Socket.IO CORS error:", err);
                return callback(new Error('Invalid origin'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 5001;

// ✅ FIX: Apply CORS middleware early
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "https://mauricios-cafe-bakery.vercel.app",
    "https://mauricios-cafe-bakery.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
].filter(Boolean);

function isAllowedOrigin(origin) {
    if (!origin) return true;
    try {
        const hostname = new URL(origin).hostname;
        return (
            allowedOrigins.includes(origin) ||
            hostname.endsWith('.vercel.app') ||
            hostname.endsWith('vercel.app')
        );
    } catch (_) {
        return false;
    }
}

const corsOptions = {
    origin: function(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204
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
app.use(cors(corsOptions));
// Ensure preflight handled for all routes
app.options('*', cors(corsOptions));
// Fallback explicit headers for some hosts/proxies
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
});

// Extra CORS guard specifically for Socket.IO polling/websocket endpoints
app.use(['/socket.io', '/socket.io/*'], (req, res, next) => {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
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

// Session configuration for user authentication with MySQL store
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
    console.log('Session store connected successfully');
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Requires HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'none', // Required for cross-origin cookies (frontend on Vercel, backend on Render)
        httpOnly: true,
        rolling: true, // Added: refresh cookie on each request
        domain: process.env.COOKIE_DOMAIN // Set this if cookies should work across subdomains
    },
    name: 'sessionId', // Added: custom session name
    unset: 'destroy', // Added: properly destroy sessions
    proxy: true // Trust proxy for correct secure flag handling
}));

// Initialize Passport.js for authentication
passportConfig(passport, db);
app.use(passport.initialize());
app.use(passport.session());

// Session refresh middleware - extend session on each request
app.use((req, res, next) => {
    if (req.session) {
        // Refresh session for admin users
        if (req.session.adminUser) {
            req.session.touch();
            console.log(`Admin session refreshed for: ${req.session.adminUser.email || req.session.adminUser.id}`);
        }
        // Refresh session for staff users
        if (req.session.staffUser) {
            req.session.touch();
            console.log(`Staff session refreshed for: ${req.session.staffUser.email || req.session.staffUser.id}`);
        }
        // Refresh session for customer users
        if (req.session.customerUser) {
            req.session.touch();
            console.log(`Customer session refreshed for: ${req.session.customerUser.email || req.session.customerUser.id}`);
        }
    }
    next();
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
const lowStockMonitorService = require('./services/lowStockMonitorService');

// Debug middleware to log all routes
app.use((req, res, next) => {
    console.log(`Route requested: ${req.method} ${req.url}`);
    next();
});

// Add before route registrations
app.use((req, res, next) => {
    console.log('Request URL:', req.url);
    next();
});

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

console.log({
    adminRoutesType: typeof adminRoutes,
    inventoryRoutesType: typeof inventoryRoutes,
    staffRoutesType: typeof staffRoutes,
    customerRoutesType: typeof customerRoutes,
    guestOrderRoutesType: typeof guestOrderRoutes,
    orderRoutesType: typeof orderRoutes
});

console.log({
    eventRoutesType: typeof eventRoutes,
    menuRoutesType: typeof menuRoutes,
    loyaltyRoutesType: typeof loyaltyRoutes,
    aiChatRoutesType: typeof aiChatRoutes,
    feedbackRoutesType: typeof feedbackRoutes,
    uploadRoutesType: typeof uploadRoutes,
    receiptRoutesType: typeof receiptRoutes,
    notificationRoutesType: typeof notificationRoutes,
    lowStockRoutesType: typeof lowStockRoutes,
    cleanupRoutesType: typeof cleanupRoutes,
    dailyResetRoutesType: typeof dailyResetRoutes
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
            }
        })();
    } else {
        console.log('⏸ Ingredient deduction queue disabled by DISABLE_BACKGROUND_JOBS=1');
    }

    // Start low stock monitor (guarded)
    if (process.env.DISABLE_BACKGROUND_JOBS !== '1') {
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
            }
        })();
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