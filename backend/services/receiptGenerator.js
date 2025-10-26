const fs = require('fs');
const path = require('path');

class ReceiptGenerator {
    constructor() {
        this.shopDetails = {
            name: "MAURICIO'S COFFEE AND BAKERY",
            address: "98 Poblacion west, Alitagtag, Philippines, 4205",
            telephone: "Tel. (0917) 503-9974"
        };
    }

    generateReceipt(orderData) {
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

            // Generate receipt HTML with thermal printer styling
            const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt - ${orderId}</title>
    <style>
        @page {
            size: 80mm 200mm;
            margin: 0;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 8px;
            background: white;
            color: black;
            width: 80mm;
            max-width: 80mm;
        }
        
        .header {
            text-align: center;
            margin-bottom: 10px;
        }
        
        .shop-name {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        
        .shop-address {
            font-size: 10px;
            margin-bottom: 1px;
        }
        
        .shop-tel {
            font-size: 10px;
            margin-bottom: 5px;
        }
        
        .separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
        }
        
        .transaction-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        
        .transaction-info div {
            font-size: 10px;
        }
        
        .tax-invoice {
            font-size: 10px;
            margin-bottom: 5px;
        }
        
        .items-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 3px;
        }
        
        .item-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 10px;
        }
        
        .item-qty {
            width: 20px;
        }
        
        .item-desc {
            flex: 1;
            margin: 0 5px;
        }
        
        .item-amount {
            width: 50px;
            text-align: right;
        }
        
        .summary {
            margin-top: 8px;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 10px;
        }
        
        .total-row {
            font-weight: bold;
            font-size: 12px;
            border-top: 1px solid #000;
            padding-top: 3px;
            margin-top: 5px;
        }
        
        .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 9px;
        }
        
        .status-badge {
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            text-transform: uppercase;
            margin-top: 5px;
        }
        
        .paid {
            background: #d4edda;
            color: #155724;
        }
        
        .preparing {
            background: #cce5ff;
            color: #004085;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="shop-name">${this.shopDetails.name}</div>
        <div class="shop-address">${this.shopDetails.address}</div>
        <div class="shop-tel">${this.shopDetails.telephone}</div>
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
        <div class="item-amount">AMT</div>
    </div>
    
    ${items.map(item => `
        <div class="item-row">
            <div class="item-qty">${item.quantity}</div>
            <div class="item-desc">${item.name.toUpperCase()}</div>
            <div class="item-amount">₱${(item.price * item.quantity).toFixed(2)}</div>
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
    
    <div class="transaction-info">
        <div>PAYMENT: ${paymentMethod.toUpperCase()}</div>
        <div>ORDER: ${orderId}</div>
    </div>
    
    <div class="status-badge ${paymentStatus === 'paid' ? 'paid' : 'preparing'}">
        ${paymentStatus === 'paid' ? 'PAID' : status.toUpperCase()}
    </div>
    
    <div class="footer">
        <div>Thank you for your visit!</div>
        <div>${new Date().getFullYear()} Mauricio's Coffee</div>
    </div>
</body>
</html>`;

    return receiptHtml;
  }

  async generateReceiptPDF(orderData) {
    const puppeteer = require('puppeteer');
    
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(this.generateReceipt(orderData), {
        waitUntil: 'networkidle0'
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        width: '80mm',
        height: '200mm',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0'
        }
      });
      
      await browser.close();
      return pdfBuffer;
      
    } catch (error) {
      console.error('Error generating PDF receipt:', error);
      throw error;
    }
  }

  async saveReceiptToFile(orderData, filename) {
    try {
      const receiptHtml = this.generateReceipt(orderData);
      const receiptPath = path.join(__dirname, '../uploads/receipts', filename);
      
      // Ensure directory exists
      const dir = path.dirname(receiptPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(receiptPath, receiptHtml);
      return receiptPath;
      
    } catch (error) {
      console.error('Error saving receipt to file:', error);
      throw error;
    }
  }
}

module.exports = ReceiptGenerator;