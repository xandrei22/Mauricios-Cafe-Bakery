-- Fix existing orders without staff_id
-- This script assigns completed/paid orders to a default admin user

-- First, find an admin user to assign orders to
SELECT id, username, email, role FROM users WHERE role = 'admin' LIMIT 1;

-- Update orders that don't have staff_id but have been processed
-- Replace 'ADMIN_USER_ID' with the actual admin user ID from the query above
UPDATE orders 
SET staff_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE staff_id IS NULL 
AND (status IN ('completed', 'ready', 'preparing') OR payment_status = 'paid');

-- Check the results
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN staff_id IS NOT NULL THEN 1 END) as orders_with_staff,
    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
FROM orders;

-- Show recent orders with staff assignments
SELECT 
    order_id, 
    customer_name, 
    total_price, 
    status, 
    payment_status, 
    staff_id,
    (SELECT username FROM users WHERE id = orders.staff_id) as staff_username
FROM orders 
ORDER BY order_time DESC 
LIMIT 10;
