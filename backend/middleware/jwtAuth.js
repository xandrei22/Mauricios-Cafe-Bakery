const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies Authorization: Bearer <token> header and adds user to req.user
 * Returns 401 if token is missing, invalid, or expired
 */
function authenticateJWT(req, res, next) {
    try {
        // Log all headers for debugging (but not sensitive values)
        const headerKeys = Object.keys(req.headers);

        // ⭐ CRITICAL: Check ALL possible header variations (Express lowercases, but check both)
        // Also check for custom headers that proxies might use
        const authHeader = req.headers['authorization'] ||
            req.headers['Authorization'] ||
            req.headers['AUTHORIZATION'] ||
            req.headers['x-authorization'] ||
            req.headers['X-Authorization'] ||
            req.headers['x-auth-token'] ||
            req.headers['X-Auth-Token'];

        console.log('🔍 JWT Middleware - Request:', {
            method: req.method,
            path: req.path,
            url: req.url,
            headerKeys: headerKeys,
            hasAuthorization: !!authHeader,
            authorizationValue: authHeader ? authHeader.substring(0, 30) + '...' : 'NOT FOUND',
            // Log raw header values for debugging
            rawAuthHeader: req.headers['authorization'] || 'NOT FOUND (lowercase)',
            rawAuthHeaderUpper: req.headers['Authorization'] || 'NOT FOUND (uppercase)',
            rawXAuth: req.headers['x-authorization'] || req.headers['X-Authorization'] || 'NOT FOUND (x-header)'
        });

        if (!authHeader) {
            console.warn('❌ JWT Middleware: No Authorization header found');
            console.warn('❌ JWT Middleware: Available headers:', headerKeys);
            console.warn('❌ JWT Middleware: Full header object keys:', Object.keys(req.headers).map(k => `${k}: ${typeof req.headers[k]}`));
            return res.status(401).json({
                success: false,
                message: 'No authorization token provided'
            });
        } else {
            console.log('✅ JWT Middleware: Authorization header received:', authHeader.substring(0, 50) + '...');
        }

        // Extract token from "Bearer <token>"
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({
                success: false,
                message: 'Invalid authorization header format. Expected: Bearer <token>'
            });
        }

        const token = parts[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // Verify token
        const secret = process.env.JWT_SECRET || 'change-me-in-prod';
        try {
            const decoded = jwt.verify(token, secret);

            // Add user info to request object
            // Handle both 'name' and 'fullName' fields from JWT payload
            req.user = {
                id: decoded.id,
                username: decoded.username,
                email: decoded.email,
                name: decoded.name || decoded.fullName || decoded.username,
                fullName: decoded.fullName || decoded.name || decoded.username,
                role: decoded.role
            };

            next();
        } catch (verifyError) {
            if (verifyError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token has expired'
                });
            } else if (verifyError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Token verification failed'
                });
            }
        }
    } catch (error) {
        console.error('JWT authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
}

/**
 * Optional JWT middleware - doesn't fail if token is missing
 * Useful for routes that work with or without authentication
 */
function optionalJWT(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader) {
            const parts = authHeader.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                const token = parts[1];
                const secret = process.env.JWT_SECRET || 'change-me-in-prod';
                try {
                    const decoded = jwt.verify(token, secret);
                    req.user = {
                        id: decoded.id,
                        username: decoded.username,
                        email: decoded.email,
                        name: decoded.name || decoded.fullName,
                        role: decoded.role
                    };
                } catch (_) {
                    // Token invalid, but continue without user
                }
            }
        }
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
}

module.exports = {
    authenticateJWT,
    optionalJWT
};