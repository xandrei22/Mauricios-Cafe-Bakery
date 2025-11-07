import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Download,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Package,
  Search
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SalesData {
  revenue: {
    today: number;
    week: number;
    month: number;
    year: number;
    growth: number;
  };
  orders: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    today: number;
  };
  topItems: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    orders: number;
    revenue: number;
    profit: number;
  }>;
  ingredientCosts: {
    totalCost: number;
    averagePerOrder: number;
    topIngredients: Array<{
      name: string;
      quantity: number;
    }>;
  };
}

interface Transaction {
  id: string;
  order_id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  items_count: number;
  reference?: string;
  receipt_path?: string;
}

const StaffSales: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isExporting, setIsExporting] = useState(false);


  // Separate useEffect for dashboard metrics only
  useEffect(() => {
    fetchSalesData();
  }, [selectedPeriod, dateFilter.start, dateFilter.end]);

  // Separate useEffect for transactions only
  useEffect(() => {
    fetchTransactions();
  }, [dateFilter.start, dateFilter.end, statusFilter, paymentMethodFilter, customerFilter, currentPage]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilter.start && dateFilter.end) {
        params.append('startDate', dateFilter.start);
        params.append('endDate', dateFilter.end);
      } else if (selectedPeriod) {
        params.append('period', selectedPeriod);
      }

      const response = await fetch(`/api/admin/sales?${params.toString()}`, {
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sales data received:', data);
        if (data.success) {
          setSalesData(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (page = 1) => {
    try {
      setTransactionsLoading(true);
      const params = new URLSearchParams({
        date: 'all', // Always use 'all' for transactions - period dropdown should not affect transactions
        status: statusFilter,
        payment_method: paymentMethodFilter,
        customer: customerFilter,
        page: page.toString(),
        limit: '50'
      });
      
      // Add date range filters if specified
      if (dateFilter.start && dateFilter.end) {
        params.append('startDate', dateFilter.start);
        params.append('endDate', dateFilter.end);
      }

      const response = await fetch(`/api/admin/transactions/sales?${params}`, {
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
        setTransactions(data.transactions || []);
        setTotalPages(data.totalPages || 1);
        setTotalTransactions(data.total || 0);
          setCurrentPage(page);
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchTransactions(page);
  };

  const downloadReport = async (format: 'excel' | 'pdf') => {
    try {
      setIsExporting(true);
      
      const params = new URLSearchParams({
        period: selectedPeriod,
        format,
        status: statusFilter,
        payment_method: paymentMethodFilter,
        customer: customerFilter,
        ...(dateFilter.start && { startDate: dateFilter.start }),
        ...(dateFilter.end && { endDate: dateFilter.end })
      });

      console.log('Downloading report with params:', params.toString());
      console.log('Full URL:', `/api/admin/sales/download?${params}`);

      const response = await fetch(`/api/admin/sales/download?${params}`, {
        credentials: 'omit',
        method: 'GET'
      });

      console.log('Download response status:', response.status);
      console.log('Download response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

        const blob = await response.blob();
      console.log('Download blob type:', blob.type, 'size:', blob.size);
      
      if (blob.type === 'application/json') {
        const text = await blob.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || 'Download failed');
      }
      
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
      const dateSuffix = dateFilter.start && dateFilter.end 
        ? `${dateFilter.start}-to-${dateFilter.end}` 
        : selectedPeriod;
      a.download = `staff-sales-report-${dateSuffix}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      
      console.log('Download completed successfully');
    } catch (error) {
      console.error(`Error downloading ${format} report:`, error);
      alert(`Failed to download ${format.toUpperCase()} report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCurrentRevenue = () => {
    if (!salesData) return 0;
    switch (selectedPeriod) {
      case 'today': return salesData.revenue.today;
      case 'week': return salesData.revenue.week;
      case 'month': return salesData.revenue.month;
      case 'year': return salesData.revenue.year;
      default: return salesData.revenue.month;
    }
  };

  const getCurrentOrders = () => {
    if (!salesData) return 0;
    return salesData.orders.total;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Analyze revenue trends and business performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => downloadReport('excel')}
            disabled={isExporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Generating...' : 'Excel'}
          </Button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full sm:w-48 pr-8 border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getCurrentRevenue())}</div>
            <p className="text-xs text-green-600">
              +{salesData?.revenue.growth || 0}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getCurrentOrders()}</div>
            <p className="text-xs text-muted-foreground">
              {salesData?.orders.completed || 0} completed, {salesData?.orders.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getCurrentRevenue() - (salesData?.ingredientCosts.totalCost || 0))}</div>
            <p className="text-xs text-muted-foreground">After ingredient costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full flex flex-wrap items-center justify-start gap-1 bg-transparent p-0">
          <TabsTrigger
            value="overview"
            className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100"
          >
            Revenue Analysis
          </TabsTrigger>
          <TabsTrigger
            value="items"
            className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100"
          >
            Top Items
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100"
          >
            Payment Methods
          </TabsTrigger>
          <TabsTrigger
            value="ingredients"
            className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100"
          >
            Ingredient Costs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="w-full">
            {/* Daily Sales Trend */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Daily Sales Trend
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {(salesData?.dailyBreakdown || [])
                    .slice(0, 7)
                    .map((day, index) => (
                      <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
                        <div className="text-sm font-medium">{formatDate(day.date)}</div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{day.orders} orders</div>
                          <div className="text-xs text-gray-500">{formatCurrency(day.revenue)}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Details in Overview */}
            <Card>
              <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transaction Details</CardTitle>
              </div>
              </CardHeader>
              <CardContent>
              {/* Filters Row - Reorganized Layout */}
              <div className="flex flex-col lg:flex-row gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                {/* Right side - Filters and Search */}
                <div className="flex flex-wrap gap-3 items-center justify-end">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 pr-4 border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger className="w-36 pr-4 border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]">
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="gcash">GCash</SelectItem>
                      <SelectItem value="paymaya">PayMaya</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Input
                      placeholder="Search customer..."
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      className="w-48 pr-10 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]"
                    />
                    <Button
                      onClick={() => {
                        // Search functionality is already handled by the filtered transactions
                        console.log('Searching for:', customerFilter);
                      }}
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-[#a87437]/10"
                    >
                      <Search className="h-4 w-4 text-[#a87437]" />
                    </Button>
                  </div>
                </div>
              </div>
              {transactionsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a87437]"></div>
                        </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transactions found for the selected period
                        </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Order ID</th>
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-left py-3 px-4 font-medium">Customer</th>
                          <th className="text-left py-3 px-4 font-medium">Items</th>
                          <th className="text-left py-3 px-4 font-medium">Payment Method</th>
                          <th className="text-left py-3 px-4 font-medium">Reference/Receipt</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-right py-3 px-4 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">#{transaction.order_id}</td>
                            <td className="py-3 px-4">
                              <div className="text-sm">{formatDate(transaction.created_at)}</div>
                              <div className="text-xs text-gray-500">{formatTime(transaction.created_at)}</div>
                            </td>
                            <td className="py-3 px-4">{transaction.customer_name}</td>
                            <td className="py-3 px-4">{transaction.items_count}</td>
                            <td className="py-3 px-4 capitalize">{transaction.payment_method}</td>
                            <td className="py-3 px-4">
                              {(() => {
                                // For e-payments (GCash, PayMaya), show reference number or receipt
                                if (transaction.payment_method && ['gcash', 'paymaya'].includes(transaction.payment_method.toLowerCase())) {
                                  if (transaction.reference) {
                                    return (
                                      <span className="text-sm font-mono bg-blue-100 px-2 py-1 rounded">
                                        {transaction.reference}
                                      </span>
                                    );
                                  } else if (transaction.receipt_path) {
                                    return (
                                      <a 
                                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${transaction.receipt_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                                      >
                                        View Receipt
                                      </a>
                                    );
                                  } else {
                                    return <span className="text-gray-400 text-sm">-</span>;
                                  }
                                } 
                                // For cash payments, show reference number
                                else if (transaction.payment_method && transaction.payment_method.toLowerCase() === 'cash') {
                                  if (transaction.reference) {
                                    return (
                                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                        {transaction.reference}
                                      </span>
                                    );
                                  } else {
                                    return <span className="text-gray-400 text-sm">-</span>;
                                  }
                                }
                                // Default case
                                else {
                                  return <span className="text-gray-400 text-sm">-</span>;
                                }
                              })()}
                            </td>
                            <td className="py-3 px-4">
                              <Badge 
                                variant={transaction.status === 'completed' ? 'default' : 
                                       transaction.status === 'pending' ? 'secondary' : 'destructive'}
                              >
                                {transaction.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {formatCurrency(transaction.total_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                      </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, totalTransactions)} of {totalTransactions} transactions
                      </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Analysis Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(salesData?.revenue.today || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(salesData?.revenue.week || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(salesData?.revenue.month || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Year</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(salesData?.revenue.year || 0)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Order Status moved here from Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Completed</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{salesData?.orders.completed || 0}</Badge>
                    <span className="text-xs text-gray-500">
                      {salesData?.orders.total ? Math.round(((salesData?.orders.completed || 0) / salesData.orders.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pending</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{salesData?.orders.pending || 0}</Badge>
                    <span className="text-xs text-gray-500">
                      {salesData?.orders.total ? Math.round(((salesData?.orders.pending || 0) / salesData.orders.total) * 100) : 0}%
                    </span>
                    </div>
                    </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cancelled</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{salesData?.orders.cancelled || 0}</Badge>
                    <span className="text-xs text-gray-500">
                      {salesData?.orders.total ? Math.round(((salesData?.orders.cancelled || 0) / salesData.orders.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Top Selling Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData?.topItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">Quantity: {item.quantity}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.revenue)}</div>
                      <div className="text-sm text-gray-500">Profit: {formatCurrency(item.profit)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData?.paymentMethods.map((method, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                      <div className="font-medium capitalize">{method.method}</div>
                      <div className="text-sm text-gray-500">{method.count} transactions</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(method.amount)}</div>
                      <div className="text-sm text-gray-500">{method.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ingredient Costs Tab */}
        <TabsContent value="ingredients" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
                <CardTitle>Cost Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-medium">{formatCurrency(salesData?.ingredientCosts.totalCost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average per Order:</span>
                    <span className="font-medium">{formatCurrency(salesData?.ingredientCosts.averagePerOrder || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Ingredients Used</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2">
                  {salesData?.ingredientCosts.topIngredients.map((ingredient, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{ingredient.name}</span>
                      <span className="font-medium">{ingredient.quantity}</span>
                      </div>
                  ))}
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffSales;