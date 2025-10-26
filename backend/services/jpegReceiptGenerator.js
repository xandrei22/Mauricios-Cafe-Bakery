const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class JPEGReceiptGenerator {
    constructor() {
        this.shopDetails = {
            name: "MAURICIO'S COFFEE AND BAKERY",
            address: "98 Poblacion west, Alitagtag, Philippines, 4205",
            telephone: "Tel. (0917) 503-9974"
        };
    }

    async generateJPEGReceipt(orderData) {
            const {
                orderId,
                customerName,
                tableNumber,
                items,
                totalPrice,
                paymentMethod,
                orderTime,
                status,
                paymentStatus,
                orderType
            } = orderData;

            // Format date and time
            const orderDate = new Date(orderTime);
            const dateStr = orderDate.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
            const timeStr = orderDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });

            // Validate date to prevent "Invalid Date"
            const isValidDate = !isNaN(orderDate.getTime());
            const displayDate = isValidDate ? dateStr : new Date().toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
            const displayTime = isValidDate ? timeStr : new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });

            // Determine order type display
            const orderTypeDisplay = orderType === 'take_out' ? 'TAKEOUT' : (orderType === 'dine_in' ? 'DINE-IN' : 'CHECKED OUT');

            // Generate receipt HTML
            const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt - ${orderId}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            color: #000;
            background-color: #fff;
            line-height: 1.2;
        }
        .header {
            text-align: center;
            margin-bottom: 10px;
        }
        .header h1 {
            font-size: 18px;
            margin: 0;
            text-transform: uppercase;
            font-weight: bold;
        }
        .header p {
            margin: 2px 0;
            font-size: 10px;
        }
        .separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
        }
        .transaction-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 10px;
        }
        .items-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 10px;
        }
        .item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10px;
        }
        .item-qty {
            width: 15%;
        }
        .item-desc {
            width: 60%;
        }
        .item-amt {
            width: 25%;
            text-align: right;
        }
        .summary {
            margin-top: 10px;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10px;
        }
        .total-row {
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
        }
        .payment-info {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 10px;
        }
        .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
            color: #fff;
            background-color: #28a745;
            text-align: center;
            margin: 5px 0;
        }
        .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.shopDetails.name}</h1>
        <p>${this.shopDetails.address}</p>
        <p>${this.shopDetails.telephone}</p>
    </div>
    
    <div class="separator"></div>
    
    <div class="transaction-info">
        <div>${displayDate}</div>
        <div>${displayTime}</div>
    </div>
    
    <div class="transaction-info">
        <div>${orderTypeDisplay}</div>
    </div>
    
    <div class="separator"></div>
    
    <div class="items-header">
        <div class="item-qty">QTY</div>
        <div class="item-desc">DESC</div>
        <div class="item-amt">AMT</div>
    </div>
    
    ${items.map(item => `
        <div class="item">
            <div class="item-qty">${item.quantity}</div>
            <div class="item-desc">${item.name}</div>
            <div class="item-amt">₱${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('')}
    
    <div class="separator"></div>
    
    <div class="summary">
        <div class="summary-row total-row">
            <div>AMOUNT</div>
            <div>₱${totalPrice.toFixed(2)}</div>
        </div>
    </div>
    
    <div class="separator"></div>
    
    <div class="payment-info">
        <div>PAYMENT: ${paymentMethod.toUpperCase()}</div>
        <div>ORDER: ${orderId}</div>
    </div>
    
    <div class="status-badge">PAID</div>
    
    <div class="separator"></div>
    
    <div class="footer">
        <p>Thank you for your visit!</p>
        <p>2025 Mauricio's Coffee</p>
    </div>
</body>
</html>`;

        // Launch puppeteer and generate JPEG
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(receiptHtml);
        
        // Set viewport for thermal printer width
        await page.setViewport({ width: 320, height: 600 });
        
        // Generate JPEG
        const jpegBuffer = await page.screenshot({
            type: 'jpeg',
            quality: 90,
            fullPage: true
        });
        
        await browser.close();
        
        return jpegBuffer;
    }
}

module.exports = JPEGReceiptGenerator;