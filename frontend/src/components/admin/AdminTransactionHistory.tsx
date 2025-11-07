import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  DollarSign, 
  ShoppingCart, 
  CreditCard, 
  Calendar,
  Filter,
  Download,
  Eye,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useSessionValidation } from '../../hooks/useSessionValidation';

interface Transaction {
  id: string;
  order_id: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface SalesTransaction {
  id: string;
  order_id: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  items_count: number;
}

interface PaymentTransaction {
  id: string;
  order_id: string;
  payment_method: string;
  amount: number;
  status: string;
  reference: string;
  created_at: string;
  customer_name: string;
}

const AdminTransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('orders');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Session validation - will automatically redirect if session expires
  const { user, isLoading: sessionLoading, isValid: sessionValid, checkSession } = useSessionValidation('admin');

  useEffect(() => {
    if (sessionValid) {
      fetchTransactionData();
    }
  }, [sessionValid, dateFilter, statusFilter]);

  const fetchTransactionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [ordersRes, salesRes, paymentsRes] = await Promise.all([
        fetch(`/api/admin/transactions/orders?date=${dateFilter}&status=${statusFilter}`, {
          credentials: 'omit'
        }),
        fetch(`/api/admin/transactions/sales?date=${dateFilter}&status=${statusFilter}`, {
          credentials: 'omit'
        }),
        fetch(`/api/admin/transactions/payments?date=${dateFilter}&status=${statusFilter}`, {
          credentials: 'omit'
        })
      ]);
      
      if (ordersRes.ok && salesRes.ok && paymentsRes.ok) {
        const [ordersData, salesData, paymentsData] = await Promise.all([
          ordersRes.json(),
          salesRes.json(),
          paymentsRes.json()
        ]);
        
        setTransactions(ordersData.transactions || []);
        setSalesTransactions(salesData.transactions || []);
        setPaymentTransactions(paymentsData.transactions || []);
      } else {
        throw new Error('Failed to fetch transaction data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      ready: 'bg-blue-100 text-blue-800 border-blue-200',
      preparing: 'bg-orange-100 text-orange-800 border-orange-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        {status}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />;
      case 'gcash':
      case 'paymaya':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    const csvContent = data.map(row => 
      Object.values(row).map(value => `"${value}"`).join(',')
    ).join('\n');
    
    const csvHeader = Object.keys(data[0]).join(',') + '\n';
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Show loading while validating session
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading transaction history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTransactionData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <p className="text-gray-600">Detailed view of all sales, orders, and payments</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => exportToCSV(transactions, 'orders-history.csv')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Orders
          </Button>
          <Button 
            onClick={() => exportToCSV(salesTransactions, 'sales-history.csv')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Sales
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="border border-gray-300 rounded-md px-3 py-2 pr-4">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border border-gray-300 rounded-md px-3 py-2 pr-4">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Orders ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Sales ({salesTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments ({paymentTransactions.length})
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Order #{transaction.order_id}</h3>
                        <p className="text-sm text-gray-600">{transaction.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(transaction.total_amount)}
                        </div>
                        <p className="text-sm text-gray-600">{formatDate(transaction.created_at)}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Order Status:</span>
                        {getStatusBadge(transaction.order_status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Payment Status:</span>
                        {getStatusBadge(transaction.payment_status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Payment Method:</span>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(transaction.payment_method)}
                          <span className="capitalize">{transaction.payment_method}</span>
                        </div>
                      </div>
                      <div className="border-t pt-3">
                        <h4 className="font-medium text-gray-800 mb-2">Order Items:</h4>
                        <div className="space-y-1">
                          {transaction.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span>{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No orders found for the selected filters</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          {salesTransactions.length > 0 ? (
            <div className="space-y-4">
              {salesTransactions.map((sale) => (
                <Card key={sale.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Sale #{sale.order_id}</h3>
                        <p className="text-sm text-gray-600">{sale.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(sale.total_amount)}
                        </div>
                        <p className="text-sm text-gray-600">{formatDate(sale.created_at)}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        {getStatusBadge(sale.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Payment Method:</span>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(sale.payment_method)}
                          <span className="capitalize">{sale.payment_method}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Items Sold:</span>
                        <span className="font-medium">{sale.items_count} items</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No sales found for the selected filters</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {paymentTransactions.length > 0 ? (
            <div className="space-y-4">
              {paymentTransactions.map((payment) => (
                <Card key={payment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Payment #{payment.reference}</h3>
                        <p className="text-sm text-gray-600">{payment.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(payment.amount)}
                        </div>
                        <p className="text-sm text-gray-600">{formatDate(payment.created_at)}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        {getStatusBadge(payment.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Payment Method:</span>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.payment_method)}
                          <span className="capitalize">{payment.payment_method}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Order ID:</span>
                        <span className="font-medium">{payment.order_id}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No payments found for the selected filters</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTransactionHistory;
