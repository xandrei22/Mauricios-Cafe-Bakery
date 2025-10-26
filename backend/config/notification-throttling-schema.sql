-- Notification Throttling System
-- This table tracks when notifications were last sent to prevent spam

CREATE TABLE notification_throttling (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    last_sent_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_notification_type (notification_type),
    INDEX idx_notification_type (notification_type),
    INDEX idx_last_sent_at (last_sent_at)
);

-- Insert initial records for both notification types
INSERT INTO notification_throttling (notification_type, last_sent_at) VALUES
('low_stock_critical', '1970-01-01 00:00:00'),
('low_stock_low', '1970-01-01 00:00:00')
ON DUPLICATE KEY UPDATE last_sent_at = last_sent_at;
