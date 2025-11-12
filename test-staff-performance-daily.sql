-- Test query for Daily Staff Performance (last 7 days)
-- This matches exactly what the backend API uses

SELECT 
    CASE 
        WHEN o.staff_id IS NULL THEN 'Unassigned Orders'
        WHEN CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) = ' ' 
        THEN CONCAT('Staff ', u.id)
        ELSE TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))
    END as staff_name,
    COALESCE(u.id, 0) as staff_id,
    DATE(o.order_time) as period,
    SUM(o.total_price) as total_sales,
    COUNT(o.id) as order_count,
    AVG(o.total_price) as avg_order_value
FROM orders o
LEFT JOIN users u ON o.staff_id = u.id
WHERE o.payment_status = 'paid'
    AND o.order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY u.id, u.first_name, u.last_name, DATE(o.order_time)
ORDER BY period DESC, total_sales DESC;




