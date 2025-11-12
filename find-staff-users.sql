-- Find all staff users in the database
-- This will help you identify which staff_id to use

SELECT 
    u.id as staff_id,
    u.first_name,
    u.last_name,
    CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as full_name,
    u.email,
    u.role,
    COUNT(o.id) as total_orders,
    COUNT(CASE WHEN o.payment_status = 'paid' THEN 1 END) as paid_orders
FROM users u
LEFT JOIN orders o ON u.id = o.staff_id
WHERE u.role IN ('staff', 'admin')
GROUP BY u.id, u.first_name, u.last_name, u.email, u.role
ORDER BY u.id;




