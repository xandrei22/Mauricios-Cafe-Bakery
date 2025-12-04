-- Debug query to see exactly what data the backend should return
-- This simulates the backend processing

-- Step 1: Get raw query results (what the backend query returns)
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

-- Step 2: Check if users table has the staff members
SELECT 
    id,
    first_name,
    last_name,
    CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) as full_name,
    role
FROM users
WHERE id IN (1, 15)
ORDER BY id;

-- Step 3: Verify orders have correct staff_id and payment_status
SELECT 
    id,
    order_id,
    staff_id,
    payment_status,
    total_price,
    DATE(order_time) as order_date
FROM orders
WHERE payment_status = 'paid'
    AND staff_id IS NOT NULL
    AND order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY order_time DESC;






