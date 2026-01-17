const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { encodeId, decodeId, generateTableUrl } = require('../utils/idObfuscator');

// Table ID mappings - Use deterministic obfuscation for consistency
// This ensures QR codes remain valid across server restarts
const TABLE_NUMBERS = [1, 2, 3, 4, 5, 6];

// Generate table mappings using the same obfuscation system as the frontend
// Note: encodeId includes a timestamp, so we generate fresh obfuscated IDs
// but they can still be decoded back to the original table number
const generateTableMappings = () => {
    const mappings = {};
    TABLE_NUMBERS.forEach(tableNum => {
        // Generate obfuscated ID for this table number
        // The obfuscation is deterministic in that decodeId will always extract the table number correctly
        mappings[tableNum] = encodeId(tableNum.toString());
    });
    return mappings;
};

// Generate mappings on module load
const TABLE_MAPPINGS = generateTableMappings();

console.log('🔐 Table ID Mappings Generated (using obfuscation):');
TABLE_NUMBERS.forEach(tableNum => {
    console.log(`  Table ${tableNum}: ${TABLE_MAPPINGS[tableNum]}`);
});

// Get all table mappings (for QR code generation)
router.get('/table-mappings', (req, res) => {
    try {
        const baseUrl = process.env.FRONTEND_URL || 'https://mauricios-cafe-bakery.shop';

        // Generate fresh mappings with current obfuscated IDs
        const mappings = TABLE_NUMBERS.map(tableNum => {
            const obfuscatedId = encodeId(tableNum.toString());
            const url = generateTableUrl(tableNum.toString(), baseUrl);

            return {
                tableNumber: tableNum,
                obfuscatedId: obfuscatedId,
                url: url
            };
        });

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

        // Decode the obfuscated ID to get the original table number
        const decodedTableNumber = decodeId(obfuscatedId);

        if (!decodedTableNumber) {
            return res.status(404).json({ success: false, error: 'Invalid table ID' });
        }

        const tableNumber = parseInt(decodedTableNumber);

        // Validate that it's a valid table number
        if (isNaN(tableNumber) || !TABLE_NUMBERS.includes(tableNumber)) {
            return res.status(404).json({ success: false, error: 'Invalid table number' });
        }

        res.json({
            success: true,
            tableNumber: tableNumber,
            obfuscatedId: obfuscatedId
        });
    } catch (error) {
        console.error('Error resolving table ID:', error);
        res.status(500).json({ success: false, error: 'Failed to resolve table ID' });
    }
});

module.exports = router;