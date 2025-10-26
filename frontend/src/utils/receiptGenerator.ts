interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  customizations?: any;
  notes?: string;
}

interface Order {
  orderId: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  orderTime: string;
  estimatedReadyTime: string;
  items: OrderItem[];
  totalPrice: number;
  tableNumber?: number | null;
  customerEmail?: string;
}

export const generateReceipt = (order: Order): string => {
  const receipt = `
╔══════════════════════════════════════════════════════════════╗
║                    MAURICIO'S CAFE & BAKERY                 ║
║                        RECEIPT                              ║
╠══════════════════════════════════════════════════════════════╣
║ Order Number: ${order.orderId.padEnd(40)} ║
║ Customer: ${order.customerName.padEnd(42)} ║
║ Date: ${new Date(order.orderTime).toLocaleString().padEnd(42)} ║
║ Status: ${order.status.toUpperCase().padEnd(42)} ║
║ Payment: ${order.paymentMethod.toUpperCase().padEnd(41)} ║
${order.tableNumber ? `║ Table: ${order.tableNumber.toString().padEnd(44)} ║` : ''}
╠══════════════════════════════════════════════════════════════╣
║ ITEMS                                                         ║
╠══════════════════════════════════════════════════════════════╣
`;

  // Add items
  order.items.forEach(item => {
    const itemName = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;
    const quantity = `x${item.quantity}`;
    const price = `₱${item.price.toFixed(2)}`;
    const total = `₱${(item.price * item.quantity).toFixed(2)}`;
    
    receipt += `║ ${itemName.padEnd(30)} ${quantity.padEnd(4)} ${price.padEnd(8)} ${total.padEnd(8)} ║\n`;
    
    if (item.notes) {
      receipt += `║   Note: ${item.notes.substring(0, 50).padEnd(50)} ║\n`;
    }
    
    if (item.customizations && Object.keys(item.customizations).length > 0) {
      const customizations = Object.entries(item.customizations)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      receipt += `║   Custom: ${customizations.substring(0, 50).padEnd(50)} ║\n`;
    }
  });

  receipt += `╠══════════════════════════════════════════════════════════════╣\n`;
  receipt += `║ TOTAL: ${`₱${order.totalPrice.toFixed(2)}`.padEnd(50)} ║\n`;
  receipt += `║                                                              ║\n`;
  receipt += `║ Thank you for your order!                                    ║\n`;
  receipt += `║ Visit us again soon!                                         ║\n`;
  receipt += `╚══════════════════════════════════════════════════════════════╝`;

  return receipt;
};

export const downloadReceipt = (order: Order) => {
  const receipt = generateReceipt(order);
  const blob = new Blob([receipt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${order.orderId}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
