const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

// Table ID mappings - Generate random IDs for each table
// In production, you might want to store these in a database
const TABLE_MAPPINGS = {
    1: crypto.randomBytes(16).toString('hex') + Date.now().toString(36),
    2: crypto.randomBytes(16).toString('hex') + Date.now().toString(36),
    3: crypto.randomBytes(16).toString('hex') + Date.now().toString(36),
    4: crypto.randomBytes(16).toString('hex') + Date.now().toString(36),
    5: crypto.randomBytes(16).toString('hex') + Date.now().toString(36),
    6: crypto.randomBytes(16).toString('hex') + Date.now().toString(36),
};

// Reverse mapping: obfuscated ID -> real table number
const REVERSE_MAPPINGS = {};
Object.keys(TABLE_MAPPINGS).forEach(tableNum => {
    REVERSE_MAPPINGS[TABLE_MAPPINGS[tableNum]] = parseInt(tableNum);
});

console.log('🔐 Table ID Mappings Generated:');
Object.keys(TABLE_MAPPINGS).forEach(tableNum => {
    console.log(`  Table ${tableNum}: ${TABLE_MAPPINGS[tableNum]}`);
});

// Get all table mappings (for QR code generation)
router.get('/table-mappings', (req, res) => {
    try {
        const mappings = Object.keys(TABLE_MAPPINGS).map(tableNum => ({
            tableNumber: parseInt(tableNum),
            obfuscatedId: TABLE_MAPPINGS[tableNum],
            url: `${process.env.FRONTEND_URL || 'https://mauricios-cafe-bakery.shop'}?table=${TABLE_MAPPINGS[tableNum]}`
        }));

        res.json({
            success: true,
            mappings: mappings
        });
    } catch (error) {
        console.error('Error getting table mappings:', error);
        res.status(500).json({ success: false, error: 'Failed to get table mappings' });
    }
});

// Resolve obfuscated table ID to real table number
router.get('/resolve-table/:obfuscatedId', (req, res) => {
    try {
        const { obfuscatedId } = req.params;

        if (!obfuscatedId) {
            return res.status(400).json({ success: false, error: 'Table ID is required' });
        }

        const realTableNumber = REVERSE_MAPPINGS[obfuscatedId];

        if (!realTableNumber) {
            return res.status(404).json({ success: false, error: 'Invalid table ID' });
        }

        res.json({
            success: true,
            tableNumber: realTableNumber,
            obfuscatedId: obfuscatedId
        });
    } catch (error) {
        console.error('Error resolving table ID:', error);
        res.status(500).json({ success: false, error: 'Failed to resolve table ID' });
    }
});

module.exports = router;
