const db = require('../config/db');

class ActivityLogger {
    // Log admin activity
    static async logAdminActivity(adminId, actionType, targetType, targetId, oldValues = null, newValues = null, description = null) {
        try {
            const [result] = await db.query(`
                INSERT INTO admin_activity_log 
                (admin_id, action_type, target_type, target_id, old_values, new_values, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                adminId,
                actionType,
                targetType,
                targetId,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                description
            ]);

            // Emit real-time update if available via request-local io
            // Expect callers to pass req as last arg optionally (like staff logger) to access req.app.get('io')
            const io = ActivityLogger._ioFromReq(arguments[arguments.length - 1]);
            if (io) {
                const payload = {
                    id: result.insertId,
                    user_type: 'admin',
                    user_id: adminId,
                    username: undefined,
                    action_type: actionType,
                    target_type: targetType,
                    target_id: targetId,
                    old_values: oldValues || null,
                    new_values: newValues || null,
                    description,
                    created_at: new Date().toISOString(),
                    formatted_date: new Date().toLocaleString()
                };
                io.to('admin-room').emit('activity-log:new', payload);
            }
        } catch (error) {
            console.error('Error logging admin activity:', error);
        }
    }

    // Log staff activity
    static async logStaffActivity(staffId, actionType, targetType, targetId, oldValues = null, newValues = null, description = null, req = null) {
        try {
            const ipAddress = req ? (req.ip || (req.connection && req.connection.remoteAddress)) : null;
            const userAgent = req ? req.get('User-Agent') : null;

            const [result] = await db.query(`
                INSERT INTO staff_activity_log 
                (staff_id, action_type, target_type, target_id, old_values, new_values, description, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                staffId,
                actionType,
                targetType,
                targetId,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                description,
                ipAddress,
                userAgent
            ]);

            // Emit real-time update
            const io = ActivityLogger._ioFromReq(req);
            if (io) {
                const payload = {
                    id: result.insertId,
                    user_type: 'staff',
                    user_id: staffId,
                    username: undefined,
                    action_type: actionType,
                    target_type: targetType,
                    target_id: targetId,
                    old_values: oldValues || null,
                    new_values: newValues || null,
                    description,
                    created_at: new Date().toISOString(),
                    formatted_date: new Date().toLocaleString()
                };
                io.to('staff-room').emit('activity-log:new', payload);
                io.to('admin-room').emit('activity-log:new', payload);
            }
        } catch (error) {
            console.error('Error logging staff activity:', error);
        }
    }

    // Helper to safely get io from req
    static _ioFromReq(req) {
        try {
            if (req && req.app && typeof req.app.get === 'function') {
                return req.app.get('io');
            }
        } catch (_) {}
        return null;
    }

    // Get admin activity log
    static async getAdminActivityLog(adminId = null, limit = 50) {
        try {
            let query = `
                SELECT 
                    aal.*,
                    a.username as admin_username,
                    CASE 
                        WHEN aal.target_type = 'menu_item' THEN mi.name
                        WHEN aal.target_type = 'ingredient' THEN i.name
                        ELSE 'Unknown'
                    END as target_name
                FROM admin_activity_log aal
                JOIN admin a ON aal.admin_id = a.id
                LEFT JOIN menu_items mi ON aal.target_type = 'menu_item' AND aal.target_id = mi.id
                LEFT JOIN ingredients i ON aal.target_type = 'ingredient' AND aal.target_id = i.id
            `;

            const params = [];

            if (adminId) {
                query += ' WHERE aal.admin_id = ?';
                params.push(adminId);
            }

            query += ' ORDER BY aal.created_at DESC LIMIT ?';
            params.push(limit);

            const [activities] = await db.query(query, params);
            return activities;

        } catch (error) {
            console.error('Get admin activity log error:', error);
            throw error;
        }
    }

    // Get staff activity log
    static async getStaffActivityLog(staffId = null, limit = 50) {
        try {
            let query = `
                SELECT 
                    sal.*,
                    u.username as staff_username,
                    u.full_name as staff_full_name
                FROM staff_activity_log sal
                JOIN users u ON sal.staff_id = u.id
            `;

            const params = [];

            if (staffId) {
                query += ' WHERE sal.staff_id = ?';
                params.push(staffId);
            }

            query += ' ORDER BY sal.created_at DESC LIMIT ?';
            params.push(limit);

            const [activities] = await db.query(query, params);
            return activities;

        } catch (error) {
            console.error('Get staff activity log error:', error);
            throw error;
        }
    }

    // Get combined activity log (admin + staff)
    static async getCombinedActivityLog(filters = {}, limit = 50, offset = 0) {
        try {
            const { user_type = 'all', action_type = 'all', start_date, end_date } = filters;

            let query = `
                SELECT 
                    'admin' as user_type,
                    aal.id,
                    aal.admin_id as user_id,
                    a.username as username,
                    aal.action_type,
                    aal.target_type,
                    aal.target_id,
                    aal.old_values,
                    aal.new_values,
                    aal.description,
                    aal.created_at
                FROM admin_activity_log aal
                JOIN admin a ON aal.admin_id = a.id
                
                UNION ALL
                
                SELECT 
                    'staff' as user_type,
                    sal.id,
                    sal.staff_id as user_id,
                    u.username as username,
                    sal.action_type,
                    sal.target_type,
                    sal.target_id,
                    sal.old_values,
                    sal.new_values,
                    sal.description,
                    sal.created_at
                FROM staff_activity_log sal
                JOIN users u ON sal.staff_id = u.id
            `;

            const whereConditions = [];
            const params = [];

            if (user_type !== 'all') {
                whereConditions.push('user_type = ?');
                params.push(user_type);
            }

            if (action_type !== 'all') {
                whereConditions.push('action_type = ?');
                params.push(action_type);
            }

            if (start_date) {
                whereConditions.push('created_at >= ?');
                params.push(start_date);
            }

            if (end_date) {
                whereConditions.push('created_at <= ?');
                params.push(end_date + ' 23:59:59');
            }

            if (whereConditions.length > 0) {
                query = `SELECT * FROM (${query}) as combined_logs WHERE ${whereConditions.join(' AND ')}`;
            } else {
                query = `SELECT * FROM (${query}) as combined_logs`;
            }

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_query`;
            const [countResult] = await db.query(countQuery, params);
            const total = countResult[0].total;

            // Get paginated results
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [activities] = await db.query(query, params);

            // Format the activities
            const formattedActivities = activities.map(activity => ({
                id: activity.id,
                user_type: activity.user_type,
                user_id: activity.user_id,
                username: activity.username,
                action_type: activity.action_type,
                target_type: activity.target_type,
                target_id: activity.target_id,
                old_values: activity.old_values ? JSON.parse(activity.old_values) : null,
                new_values: activity.new_values ? JSON.parse(activity.new_values) : null,
                description: activity.description,
                created_at: activity.created_at,
                formatted_date: new Date(activity.created_at).toLocaleString()
            }));

            return {
                activities: formattedActivities,
                total,
                total_pages: Math.ceil(total / limit)
            };

        } catch (error) {
            console.error('Get combined activity log error:', error);
            throw error;
        }
    }
}

module.exports = ActivityLogger;