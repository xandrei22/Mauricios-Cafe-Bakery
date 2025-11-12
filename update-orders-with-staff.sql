-- Option 1: Update orders to assign them to a specific staff member
-- REPLACE <STAFF_ID> with an actual staff user ID from the find-staff-users.sql query

-- Example: Assign all unpaid orders with no staff to staff_id = 1
-- UPDATE orders 
-- SET staff_id = 1 
-- WHERE payment_status = 'paid' 
--     AND staff_id IS NULL 
--     AND order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Option 2: Assign orders to the first available staff member
-- This finds the first staff user and assigns orders to them
UPDATE orders o
INNER JOIN (
    SELECT id FROM users 
    WHERE role IN ('staff', 'admin') 
    ORDER BY id 
    LIMIT 1
) u ON 1=1
SET o.staff_id = u.id
WHERE o.payment_status = 'paid' 
    AND o.staff_id IS NULL 
    AND o.order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Verify the update
SELECT 
    COUNT(*) as updated_orders,
    staff_id,
    DATE(order_time) as order_date
FROM orders
WHERE payment_status = 'paid' 
    AND staff_id IS NOT NULL
    AND order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY staff_id, DATE(order_time)
ORDER BY order_date DESC;




