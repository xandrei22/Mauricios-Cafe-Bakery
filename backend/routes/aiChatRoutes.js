const express = require('express');
const router = express.Router();
const db = require('../config/db');
const aiService = require('../services/aiService');
const { v4: uuidv4 } = require('uuid');

// Start a new chat session
router.post('/session/start', async(req, res) => {
    try {
        const { customerId, dietaryPreferences } = req.body;

        const sessionId = uuidv4();
        const initialMessage = {
            role: 'assistant',
            content: "Hello! I'm your coffee shop AI assistant. I can help you with drink recommendations, customization suggestions, and answer any questions about our menu. What can I help you with today?",
            timestamp: new Date().toISOString()
        };

        const messages = [initialMessage];

        // Save session to database (use NULL for anonymous/guest sessions)
        const customerIdOrNull = customerId ? customerId : null;
        await db.query(`
            INSERT INTO ai_chat_sessions 
            (session_id, customer_id, messages, dietary_preferences) 
            VALUES (?, ?, ?, ?)
        `, [sessionId, customerIdOrNull, JSON.stringify(messages), JSON.stringify(dietaryPreferences || {})]);

        res.json({
            success: true,
            sessionId,
            message: initialMessage
        });
    } catch (error) {
        console.error('Error starting chat session:', error);
        res.status(500).json({ success: false, error: 'Failed to start chat session' });
    }
});

// Send message to AI
router.post('/session/:sessionId/message', async(req, res) => {
    try {
        const { sessionId } = req.params;
        const { message, customerId } = req.body;

        // Get session data
        const [sessions] = await db.query(`
            SELECT * FROM ai_chat_sessions WHERE session_id = ?
        `, [sessionId]);

        if (sessions.length === 0) {
            return res.status(404).json({ success: false, error: 'Chat session not found' });
        }

        const session = sessions[0];
        const messages = JSON.parse(session.messages);
        const dietaryPreferences = JSON.parse(session.dietary_preferences || '{}');

        // Add user message
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        messages.push(userMessage);

        // Get AI response
        // Load a lightweight snapshot of current menu for grounding
        // Adjusted to actual schema fields
        const [menuRows] = await db.query(`
            SELECT name, category, base_price
            FROM menu_items
            WHERE is_available = 1 AND (visible_in_customer_menu = 1 OR allow_customization = 1)
            ORDER BY name
            LIMIT 100
        `);
        const aiResponse = await aiService.chatWithCustomer(
            message,
            messages.slice(0, -1), // Previous messages (excluding current user message)
            dietaryPreferences,
            menuRows
        );

        // Add AI response
        const assistantMessage = {
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString()
        };
        messages.push(assistantMessage);

        // Update session in database
        await db.query(`
            UPDATE ai_chat_sessions 
            SET messages = ?, updated_at = NOW() 
            WHERE session_id = ?
        `, [JSON.stringify(messages), sessionId]);

        res.json({
            success: true,
            response: assistantMessage,
            sessionId
        });
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({ success: false, error: 'Failed to process message' });
    }
});

// Get chat session history
router.get('/session/:sessionId', async(req, res) => {
    try {
        const { sessionId } = req.params;

        const [sessions] = await db.query(`
            SELECT * FROM ai_chat_sessions WHERE session_id = ?
        `, [sessionId]);

        if (sessions.length === 0) {
            return res.status(404).json({ success: false, error: 'Chat session not found' });
        }

        const session = sessions[0];
        res.json({
            success: true,
            session: {
                sessionId: session.session_id,
                customerId: session.customer_id,
                messages: JSON.parse(session.messages || '[]'),
                dietaryPreferences: JSON.parse(session.dietary_preferences || '{}'),
                createdAt: session.created_at,
                updatedAt: session.updated_at
            }
        });
    } catch (error) {
        console.error('Error fetching chat session:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch chat session' });
    }
});

// Get customization suggestions
router.post('/customization-suggestions', async(req, res) => {
    try {
        const { baseDrink, dietaryPreferences, currentMenu, availableIngredients } = req.body;

        const suggestions = await aiService.getCustomizationSuggestions(
            baseDrink,
            dietaryPreferences,
            currentMenu || [],
            availableIngredients || []
        );

        res.json({
            success: true,
            suggestions: suggestions.suggestions || [],
            combinations: suggestions.combinations || []
        });
    } catch (error) {
        console.error('Error getting customization suggestions:', error);
        res.status(500).json({ success: false, error: 'Failed to get customization suggestions' });
    }
});

// Get customer's chat sessions
router.get('/customer/:customerId/sessions', async(req, res) => {
    try {
        const { customerId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total FROM ai_chat_sessions WHERE customer_id = ?
        `, [customerId]);

        // Get sessions
        const [sessions] = await db.query(`
            SELECT session_id, created_at, updated_at, 
                   JSON_LENGTH(messages) as message_count
            FROM ai_chat_sessions 
            WHERE customer_id = ? 
            ORDER BY updated_at DESC 
            LIMIT ? OFFSET ?
        `, [customerId, parseInt(limit), offset]);

        res.json({
            success: true,
            sessions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching customer sessions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
    }
});

// Get AI recommendations for customer
router.post('/recommendations', async(req, res) => {
    try {
        const { customerId, dietaryPreferences, context } = req.body;

        // Get customer's order history if available
        let customerHistory = [];
        if (customerId) {
            const [orders] = await db.query(`
                SELECT items, order_time FROM orders 
                WHERE customer_id = ? 
                ORDER BY order_time DESC 
                LIMIT 5
            `, [customerId]);

            customerHistory = orders.map(order => ({
                items: JSON.parse(order.items),
                date: order.order_time
            }));
        }

        const recommendations = await aiService.getDrinkRecommendations(
            dietaryPreferences || {},
            customerHistory
        );

        res.json({
            success: true,
            recommendations,
            context: context || 'general'
        });
    } catch (error) {
        console.error('Error getting AI recommendations:', error);
        res.status(500).json({ success: false, error: 'Failed to get recommendations' });
    }
});

// Get customization suggestions
router.post('/customizations', async(req, res) => {
    try {
        const { baseDrink, dietaryPreferences, customerPreferences } = req.body;

        const suggestions = await aiService.getCustomizationSuggestions(
            baseDrink,
            dietaryPreferences || {}
        );

        res.json({
            success: true,
            suggestions,
            baseDrink
        });
    } catch (error) {
        console.error('Error getting customization suggestions:', error);
        res.status(500).json({ success: false, error: 'Failed to get customization suggestions' });
    }
});

// Analyze order for dietary compliance
router.post('/analyze-order', async(req, res) => {
    try {
        const { orderItems, dietaryPreferences } = req.body;

        const analysis = await aiService.analyzeOrderForDietaryCompliance(
            orderItems,
            dietaryPreferences || {}
        );

        res.json({
            success: true,
            analysis
        });
    } catch (error) {
        console.error('Error analyzing order:', error);
        res.status(500).json({ success: false, error: 'Failed to analyze order' });
    }
});

// Update dietary preferences for session
router.put('/session/:sessionId/preferences', async(req, res) => {
    try {
        const { sessionId } = req.params;
        const { dietaryPreferences } = req.body;

        // Update session preferences
        await db.query(`
            UPDATE ai_chat_sessions 
            SET dietary_preferences = ?, updated_at = NOW() 
            WHERE session_id = ?
        `, [JSON.stringify(dietaryPreferences), sessionId]);

        res.json({
            success: true,
            message: 'Dietary preferences updated successfully'
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ success: false, error: 'Failed to update preferences' });
    }
});

// End chat session
router.post('/session/:sessionId/end', async(req, res) => {
    try {
        const { sessionId } = req.params;
        const { feedback } = req.body;

        // Add ending message
        const [sessions] = await db.query(`
            SELECT messages FROM ai_chat_sessions WHERE session_id = ?
        `, [sessionId]);

        if (sessions.length === 0) {
            return res.status(404).json({ success: false, error: 'Chat session not found' });
        }

        const messages = JSON.parse(sessions[0].messages);
        const endMessage = {
            role: 'assistant',
            content: "Thank you for chatting with me! I hope I was able to help you find the perfect drink. Feel free to start a new session anytime you need assistance.",
            timestamp: new Date().toISOString()
        };
        messages.push(endMessage);

        // Update session with end message and feedback
        await db.query(`
            UPDATE ai_chat_sessions 
            SET messages = ?, recommendations = ?, updated_at = NOW() 
            WHERE session_id = ?
        `, [JSON.stringify(messages), JSON.stringify({ feedback }), sessionId]);

        res.json({
            success: true,
            message: 'Chat session ended successfully'
        });
    } catch (error) {
        console.error('Error ending chat session:', error);
        res.status(500).json({ success: false, error: 'Failed to end chat session' });
    }
});

// Get chat analytics (admin only)
router.get('/analytics', async(req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateFilter = '';
        const params = [];

        if (startDate && endDate) {
            dateFilter = 'WHERE created_at BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        // Get session statistics
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as totalSessions,
                COUNT(DISTINCT customer_id) as uniqueCustomers,
                AVG(JSON_LENGTH(messages)) as avgMessagesPerSession,
                DATE(created_at) as date
            FROM ai_chat_sessions 
            ${dateFilter}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, params);

        // Get popular topics/keywords
        const [topics] = await db.query(`
            SELECT 
                COUNT(*) as frequency,
                JSON_EXTRACT(messages, '$[*].content') as content
            FROM ai_chat_sessions 
            ${dateFilter}
        `, params);

        res.json({
            success: true,
            analytics: {
                sessions: stats,
                topics: topics
            }
        });
    } catch (error) {
        console.error('Error fetching chat analytics:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
});

// Get AI ingredient recommendations for drink customization
router.post('/customization/ingredient-recommendations', async(req, res) => {
    try {
        const { drinkName, drinkCategory, currentIngredients, preferences } = req.body;

        // Get available ingredients from database
        const [ingredients] = await db.query(`
            SELECT name, category, description, actual_unit, cost_per_actual_unit
            FROM ingredients 
            WHERE is_available = TRUE AND visible_in_customization = TRUE
            ORDER BY category, name
        `);

        // Get current menu items for context
        const [menuItems] = await db.query(`
            SELECT name, category, description, base_price
            FROM menu_items 
            WHERE is_available = TRUE AND allow_customization = TRUE
            ORDER BY category, name
        `);

        const recommendations = await aiService.getIngredientRecommendations({
            drinkName,
            drinkCategory,
            currentIngredients: currentIngredients || [],
            preferences: preferences || {},
            availableIngredients: ingredients,
            menuContext: menuItems
        });

        res.json({
            success: true,
            recommendations,
            availableIngredients: ingredients
        });
    } catch (error) {
        console.error('Error getting ingredient recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get ingredient recommendations'
        });
    }
});

// Get AI ingredient recommendations for drink customization
router.post('/ingredient-recommendations', async(req, res) => {
    try {
        const { drinkName, drinkCategory, currentIngredients, preferences } = req.body;

        // Get available ingredients from database
        const [ingredients] = await db.query(`
            SELECT name, category, description, actual_unit, cost_per_actual_unit
            FROM ingredients 
            WHERE is_available = TRUE AND visible_in_customization = TRUE
            ORDER BY category, name
        `);

        // Get current menu items for context
        const [menuItems] = await db.query(`
            SELECT name, category, description, base_price
            FROM menu_items 
            WHERE is_available = TRUE AND visible_in_customer_menu = TRUE
            ORDER BY category, name
        `);

        const recommendations = await aiService.getIngredientRecommendations({
            drinkName,
            drinkCategory,
            currentIngredients: currentIngredients || [],
            preferences: preferences || {},
            availableIngredients: ingredients,
            menuContext: menuItems
        });

        res.json({
            success: true,
            recommendations: recommendations.recommendations || [],
            combinations: recommendations.combinations || [],
            availableIngredients: ingredients
        });
    } catch (error) {
        console.error('Error getting ingredient recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get ingredient recommendations'
        });
    }
});

module.exports = router;