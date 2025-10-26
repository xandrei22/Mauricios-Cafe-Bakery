const adminInventoryService = require('../services/adminInventoryService');
const db = require('../config/db');

class AdminInventoryController {
    // Create new drink with recipe
    async createDrink(req, res) {
        try {
            const adminId = req.session.user ? req.session.user.id : null;
            if (!adminId) {
                return res.status(401).json({ success: false, message: 'Admin authentication required' });
            }

            const drinkData = req.body;

            // Validate required fields
            if (!drinkData.name || !drinkData.category || !drinkData.base_price || !drinkData.ingredients) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: name, category, base_price, ingredients'
                });
            }

            const result = await adminInventoryService.createDrink(adminId, drinkData);
            res.json(result);

        } catch (error) {
            console.error('Create drink error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create drink'
            });
        }
    }

    // Update drink visibility settings
    async updateDrinkVisibility(req, res) {
        try {
            const adminId = req.session.user ? req.session.user.id : null;
            if (!adminId) {
                return res.status(401).json({ success: false, message: 'Admin authentication required' });
            }

            const { menuItemId } = req.params;
            const visibilitySettings = req.body;

            const result = await adminInventoryService.updateDrinkVisibility(
                adminId,
                parseInt(menuItemId),
                visibilitySettings
            );
            res.json(result);

        } catch (error) {
            console.error('Update visibility error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update visibility'
            });
        }
    }

    // Update drink customization permissions
    async updateCustomizationPermissions(req, res) {
        try {
            const adminId = req.session.user ? req.session.user.id : null;
            if (!adminId) {
                return res.status(401).json({ success: false, message: 'Admin authentication required' });
            }

            const { menuItemId } = req.params;
            const { allow_customization } = req.body;

            const result = await adminInventoryService.updateCustomizationPermissions(
                adminId,
                parseInt(menuItemId),
                allow_customization
            );
            res.json(result);

        } catch (error) {
            console.error('Update customization error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update customization permissions'
            });
        }
    }

    // Get synchronized POS menu
    async getSynchronizedPOSMenu(req, res) {
        try {
            const menuItems = await adminInventoryService.getSynchronizedPOSMenu();
            res.json({ success: true, menu_items: menuItems });

        } catch (error) {
            console.error('Get POS menu error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get POS menu'
            });
        }
    }

    // Process order with automatic inventory deduction
    async processOrder(req, res) {
        try {
            const { orderData } = req.body;

            if (!orderData || !orderData.items || !Array.isArray(orderData.items)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order data format'
                });
            }

            const result = await adminInventoryService.processOrder(orderData);
            res.json(result);

        } catch (error) {
            console.error('Process order error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to process order'
            });
        }
    }

    // Get inventory status
    async getInventoryStatus(req, res) {
        try {
            const status = await adminInventoryService.getInventoryStatus();
            res.json({ success: true, ...status });

        } catch (error) {
            console.error('Get inventory status error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get inventory status'
            });
        }
    }

    // Update ingredient stock
    async updateIngredientStock(req, res) {
        try {
            const { ingredientId, newQuantity, reason } = req.body;

            if (!ingredientId || newQuantity === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: ingredientId, newQuantity'
                });
            }

            const result = await adminInventoryService.updateIngredientStock(
                parseInt(ingredientId),
                parseFloat(newQuantity),
                reason
            );
            res.json(result);

        } catch (error) {
            console.error('Update ingredient stock error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update ingredient stock'
            });
        }
    }

    // Get low stock alerts
    async getLowStockAlerts(req, res) {
        try {
            const alerts = await adminInventoryService.getLowStockAlerts();
            res.json({ success: true, alerts });

        } catch (error) {
            console.error('Get low stock alerts error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get low stock alerts'
            });
        }
    }

    // Get inventory transactions
    async getInventoryTransactions(req, res) {
        try {
            const { startDate, endDate, ingredientId } = req.query;

            const transactions = await adminInventoryService.getInventoryTransactions({
                startDate,
                endDate,
                ingredientId: ingredientId ? parseInt(ingredientId) : null
            });

            res.json({ success: true, transactions });

        } catch (error) {
            console.error('Get inventory transactions error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get inventory transactions'
            });
        }
    }

    // Get ingredient usage analytics
    async getIngredientUsageAnalytics(req, res) {
        try {
            const { period, ingredientId } = req.query;

            const analytics = await adminInventoryService.getIngredientUsageAnalytics({
                period: period || 'month',
                ingredientId: ingredientId ? parseInt(ingredientId) : null
            });

            res.json({ success: true, analytics });

        } catch (error) {
            console.error('Get ingredient usage analytics error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get ingredient usage analytics'
            });
        }
    }

    // Export inventory data
    async exportInventoryData(req, res) {
        try {
            const { format, filters } = req.query;

            if (!format || !['csv', 'excel', 'pdf'].includes(format)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid export format. Supported: csv, excel, pdf'
                });
            }

            const exportData = await adminInventoryService.exportInventoryData(format, filters);

            // Set appropriate headers for file download
            const filename = `inventory-export-${new Date().toISOString().split('T')[0]}.${format}`;

            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.send(exportData);
            } else if (format === 'excel') {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.send(exportData);
            } else if (format === 'pdf') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.send(exportData);
            }

        } catch (error) {
            console.error('Export inventory data error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to export inventory data'
            });
        }
    }

    // Get inventory dashboard data
    async getInventoryDashboard(req, res) {
        try {
            const dashboardData = await adminInventoryService.getInventoryDashboard();
            res.json({ success: true, ...dashboardData });

        } catch (error) {
            console.error('Get inventory dashboard error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get inventory dashboard'
            });
        }
    }

    // Bulk update ingredient stock
    async bulkUpdateIngredientStock(req, res) {
        try {
            const { updates } = req.body;

            if (!updates || !Array.isArray(updates)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid updates format. Expected array of updates.'
                });
            }

            const result = await adminInventoryService.bulkUpdateIngredientStock(updates);
            res.json(result);

        } catch (error) {
            console.error('Bulk update ingredient stock error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to bulk update ingredient stock'
            });
        }
    }

    // Get ingredient cost analysis
    async getIngredientCostAnalysis(req, res) {
        try {
            const { period, category } = req.query;

            const analysis = await adminInventoryService.getIngredientCostAnalysis({
                period: period || 'month',
                category: category || null
            });

            res.json({ success: true, analysis });

        } catch (error) {
            console.error('Get ingredient cost analysis error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get ingredient cost analysis'
            });
        }
    }

    // Get inventory reorder recommendations
    async getReorderRecommendations(req, res) {
        try {
            const recommendations = await adminInventoryService.getReorderRecommendations();
            res.json({ success: true, recommendations });

        } catch (error) {
            console.error('Get reorder recommendations error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get reorder recommendations'
            });
        }
    }

    // Process inventory adjustment
    async processInventoryAdjustment(req, res) {
        try {
            const { ingredientId, adjustmentType, quantity, reason, adminId } = req.body;

            if (!ingredientId || !adjustmentType || quantity === undefined || !reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: ingredientId, adjustmentType, quantity, reason'
                });
            }

            const adminIdFromSession = req.session.user ? req.session.user.id : null;
            const finalAdminId = adminId || adminIdFromSession;

            if (!finalAdminId) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin authentication required'
                });
            }

            const result = await adminInventoryService.processInventoryAdjustment({
                ingredientId: parseInt(ingredientId),
                adjustmentType,
                quantity: parseFloat(quantity),
                reason,
                adminId: finalAdminId
            });

            res.json(result);

        } catch (error) {
            console.error('Process inventory adjustment error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to process inventory adjustment'
            });
        }
    }

    // Get inventory audit trail
    async getInventoryAuditTrail(req, res) {
        try {
            const { startDate, endDate, ingredientId, adminId, actionType } = req.query;

            const auditTrail = await adminInventoryService.getInventoryAuditTrail({
                startDate,
                endDate,
                ingredientId: ingredientId ? parseInt(ingredientId) : null,
                adminId: adminId ? parseInt(adminId) : null,
                actionType
            });

            res.json({ success: true, auditTrail });

        } catch (error) {
            console.error('Get inventory audit trail error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get inventory audit trail'
            });
        }
    }
}

module.exports = new AdminInventoryController();