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
  PieChart,
  CreditCard,
  Package,
  Calendar,
  Phone,
  MapPin,
  XCircle,
  Clock,
  Search
} from 'lucide-react';

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
  payment_method: string;
  status: string;
  created_at: string;
  items_count: number;
  reference?: string;
  receipt_path?: string;
}

// Event sales API types
interface EventSalesTotals {
  not_fully_paid: number;
  downpayment: number;
  pending_payments: number;
  total_events: number;
}

interface EventSalesByDay { day: string; total: number; }

interface EventTopEvent {
  event_id: number;
  customer_name: string;
  event_type: string;
  event_date: string;
  revenue: number;
  transactions: number;
}

interface EventRecentTx {
  id: number;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  amount_paid?: number;
  amount_to_be_paid?: number;
  event: {
    id: number;
    customer_name: string;
    event_type: string;
    event_date: string;
    contact_number?: string;
    address?: string;
  };
}

interface EventSalesData {
  totals: EventSalesTotals;
  byDay: EventSalesByDay[];
  topEvents: EventTopEvent[];
  recent: EventRecentTx[];
}

const AdminSales: React.FC = () => {
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
  // Removed trendCount/menu; always show recent 7 days

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Event sales state
  const [eventSales, setEventSales] = useState<EventSalesData | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [activeSalesTab, setActiveSalesTab] = useState<'actual' | 'event'>('actual');

  // Separate useEffect for dashboard metrics only
  useEffect(() => {
      fetchSalesData();
    fetchEventSales();
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

  const fetchEventSales = async () => {
    try {
      setEventLoading(true);
      const params = new URLSearchParams();
      if (dateFilter.start && dateFilter.end) {
        params.append('startDate', dateFilter.start);
        params.append('endDate', dateFilter.end);
      } else if (selectedPeriod) {
        params.append('period', selectedPeriod);
      }
      const response = await fetch(`/api/admin/sales/events?${params.toString()}`, {
        credentials: 'omit'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEventSales(data.data as EventSalesData);
        }
      }
    } catch (err) {
      console.error('Error fetching event sales:', err);
    } finally {
      setEventLoading(false);
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

      const url = `${API_URL}/api/admin/transactions/sales?${params}`;
      console.log('Fetching transactions from:', url);
      
      const response = await fetch(url, {
        credentials: 'omit'
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Transactions data:', data);
        if (data.success) {
          setTransactions(data.transactions || []);
          setTotalPages(data.totalPages || 1);
          setTotalTransactions(data.total || 0);
          setCurrentPage(page);
        } else {
          console.error('API returned success: false', data);
        }
      } else {
        console.error('API request failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };


  const downloadReport = async (format: 'excel' | 'pdf') => {
    try {
      setIsExporting(true);
      
      const params = new URLSearchParams({
        period: selectedPeriod,
        format,
        sales_type: activeSalesTab, // Add sales type parameter
        status: statusFilter,
        payment_method: paymentMethodFilter,
        customer: customerFilter,
        ...(dateFilter.start && { startDate: dateFilter.start }),
        ...(dateFilter.end && { endDate: dateFilter.end })
      });

      const endpoint = activeSalesTab === 'event' 
        ? '/api/admin/event-sales/download' 
        : '/api/admin/sales/download';

      console.log('Downloading report with params:', params.toString());
      console.log('Full URL:', `${endpoint}?${params}`);

      const response = await fetch(`${endpoint}?${params}`, {
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
      const salesTypePrefix = activeSalesTab === 'event' ? 'event-sales' : 'actual-sales';
      a.download = `${salesTypePrefix}-report-${dateSuffix}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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

  const downloadTransactionDetails = async (format: 'excel' | 'pdf') => {
    try {
      setIsExporting(true);
      
      const params = new URLSearchParams();
      if (dateFilter.start) params.append('startDate', dateFilter.start);
      if (dateFilter.end) params.append('endDate', dateFilter.end);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      // Backend expects `payment_method` (snake_case)
      if (paymentMethodFilter !== 'all') params.append('payment_method', paymentMethodFilter);
      if (customerFilter) params.append('customer', customerFilter);
      params.append('format', format);
      params.append('type', 'transactions'); // Add type to distinguish from overview export
      
      console.log('Exporting transaction details with params:', params.toString());
      
      const response = await fetch(`/api/admin/sales/download?${params.toString()}`, {
        credentials: 'omit',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Check if the response is actually an error JSON instead of a file
      if (blob.type === 'application/json') {
        const errorText = await blob.text();
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || 'Unknown error occurred');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const dateRangeText = dateFilter.start && dateFilter.end 
        ? `_${dateFilter.start}_to_${dateFilter.end}` 
        : `_${selectedPeriod}`;

      const extension = format === 'excel' ? 'xlsx' : 'pdf';
      a.download = `transaction_details${dateRangeText}_${timestamp}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Transaction details ${format.toUpperCase()} downloaded successfully!`);
    } catch (error) {
      console.error(`Failed to download transaction details ${format.toUpperCase()}:`, error);
      toast.error(`Failed to download transaction details ${format.toUpperCase()}: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchTransactions(page);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a87437]"></div>
        </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Analyze revenue trends and business performance metrics.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => downloadReport('excel')} 
            variant="outline"
            className="flex items-center gap-2"
            disabled={isExporting}
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Generating...' : 'Excel'}
          </Button>
        </div>
      </div>

      {/* Sales Type Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveSalesTab('actual')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeSalesTab === 'actual'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Actual Sales
        </button>
        <button
          onClick={() => setActiveSalesTab('event')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeSalesTab === 'event'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Event Sales
        </button>
      </div>

      {/* Content based on active tab */}
      {activeSalesTab === 'actual' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
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
          {/* Event Sales tab removed - now separate section */}
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
            {/* Placeholder for spacing: the other charts already exist below in overview grid */}
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
                {/* Left side - Date Range */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium whitespace-nowrap">Date Range:</label>
                    <Input
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        setDateFilter(prev => ({ 
                          ...prev, 
                          start: newStartDate 
                        }));
                      }}
                      className="w-40"
                      placeholder="Start Date"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) => {
                        const newEndDate = e.target.value;
                        setDateFilter(prev => ({ 
                          ...prev, 
                          end: newEndDate 
                        }));
                      }}
                      className="w-40"
                      placeholder="End Date"
                    />
                  </div>
                </div>
                
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
                                // For e-payments (GCash, PayMaya), prioritize admin reference > receipt > auto-generated reference
                                if (transaction.payment_method && ['gcash', 'paymaya'].includes(transaction.payment_method.toLowerCase())) {
                                  // 1. Admin-inputted reference (starts with "ADMIN-")
                                  if (transaction.reference && transaction.reference.startsWith('ADMIN-')) {
                                    // Different colors for different payment methods
                                    const isGCash = transaction.reference.includes('GCASH');
                                    const isPayMaya = transaction.reference.includes('PAYMAYA');
                                    
                                    let bgColor = 'bg-gray-100 text-gray-800'; // default
                                    if (isGCash) {
                                      bgColor = 'bg-blue-100 text-blue-800';
                                    } else if (isPayMaya) {
                                      bgColor = 'bg-purple-100 text-purple-800';
                                    }
                                    
                                    return (
                                      <span className={`text-sm font-mono ${bgColor} px-2 py-1 rounded`}>
                                        {transaction.reference}
                                      </span>
                                    );
                                  }
                                  // 2. Customer uploaded receipt (if no admin reference)
                                  else if (transaction.receipt_path) {
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
                                  }
                                  // 3. Auto-generated reference (only if no admin reference and no receipt)
                                  else if (transaction.reference) {
                                    return (
                                      <span className="text-sm font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                        {transaction.reference}
                                      </span>
                                    );
                                  }
                                  // 4. No reference or receipt
                                  else {
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
                {salesData?.topItems.map((item, index) => (
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

        {/* Event Sales tab removed - now separate section */}

      </Tabs>
        </>
      )}

      {/* Event Sales Tab */}
      {activeSalesTab === 'event' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#6B5B5B]">Event Sales Analytics</h2>
              <p className="text-gray-600 mt-1">Analyze event revenue trends and performance metrics</p>
            </div>
          </div>

        {eventLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a87437]"></div>
          </div>
        ) : !eventSales ? (
          <div className="text-center text-gray-500 py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No event sales data available</p>
          </div>
        ) : (
          <>
            {/* Event Sales Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white border-2 border-red-300 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Not Fully Paid</p>
                      <p className="text-2xl font-bold text-red-600">{eventSales.totals.not_fully_paid || 0}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-yellow-300 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Downpayment</p>
                      <p className="text-2xl font-bold text-yellow-600">{eventSales.totals.downpayment || 0}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-orange-300 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                      <p className="text-2xl font-bold text-orange-600">{eventSales.totals.pending_payments || 0}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-[#a87437] shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Events</p>
                      <p className="text-2xl font-bold text-[#6B5B5B]">{eventSales.totals.total_events || 0}</p>
                    </div>
                    <Package className="h-8 w-8 text-[#a87437]" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Event Sales Charts and Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Daily Event Sales Trend */}
              <Card className="bg-white border-2 border-gray-200 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#6B5B5B]">
                    <TrendingUp className="w-5 h-5" />
                    Daily Event Sales Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {eventSales.byDay.map((d, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div className="text-sm font-medium text-gray-700">{formatDate(d.day)}</div>
                        <div className="text-right text-sm font-bold text-[#a87437]">{formatCurrency(d.total)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Events by Revenue */}
              <Card className="bg-white border-2 border-gray-200 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#6B5B5B]">
                    <Calendar className="w-5 h-5" />
                    Top Events by Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {eventSales.topEvents.map(e => (
                      <div key={e.event_id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div>
                          <div className="font-medium text-gray-900">{e.customer_name} • {e.event_type}</div>
                          <div className="text-sm text-gray-500">{formatDate(e.event_date)} • {e.transactions} transactions</div>
                        </div>
                        <div className="text-right font-bold text-[#a87437]">{formatCurrency(e.revenue)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Event Transactions */}
            <Card className="bg-white border-2 border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="text-[#6B5B5B]">Recent Event Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {eventSales.recent.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No event transactions found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Event</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Customer Contact</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Method</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Amount to be Paid</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Amount Paid</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-700">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventSales.recent.map((tx) => (
                          <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900">{tx.event.customer_name} • {tx.event.event_type}</div>
                              <div className="text-xs text-gray-500">Event #{tx.event.id}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-gray-700">
                                {tx.event.contact_number && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    <span>{tx.event.contact_number}</span>
                                  </div>
                                )}
                                {tx.event.address && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-500 truncate max-w-32" title={tx.event.address}>
                                      {tx.event.address}
                                    </span>
                                  </div>
                                )}
                                {!tx.event.contact_number && !tx.event.address && (
                                  <span className="text-xs text-gray-400">No contact info</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-gray-700">{formatDate(tx.created_at)}</div>
                              <div className="text-xs text-gray-500">{formatTime(tx.created_at)}</div>
                            </td>
                            <td className="py-3 px-4 capitalize text-gray-700">{tx.payment_method || '-'}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  value={tx.amount_to_be_paid === 0 ? '' : tx.amount_to_be_paid}
                                  onChange={async (e) => {
                                    // Handle amount to be paid update
                                    const inputValue = e.target.value;
                                    
                                    // Only allow numbers and decimal point
                                    if (inputValue && !/^\d*\.?\d*$/.test(inputValue)) {
                                      return; // Don't update if invalid characters
                                    }
                                    
                                    const newAmount = inputValue === '' ? 0 : parseFloat(inputValue) || 0;
                                    
                                    // Update local state immediately for better UX
                                    if (eventSales) {
                                      const updatedRecent = eventSales.recent.map(item => 
                                        item.id === tx.id ? { ...item, amount_to_be_paid: newAmount } : item
                                      );
                                      setEventSales({ ...eventSales, recent: updatedRecent });
                                    }
                                    
                                    try {
                                      const response = await fetch(`/api/admin/event-sales/${tx.id}/amount-to-be-paid`, {
                                        method: 'PUT',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        credentials: 'omit',
                                        body: JSON.stringify({ amount_to_be_paid: newAmount })
                                      });
                                      
                                      if (!response.ok) {
                                        console.error('Failed to update amount to be paid');
                                        // Revert local state on error
                                        if (eventSales) {
                                          const revertedRecent = eventSales.recent.map(item => 
                                            item.id === tx.id ? { ...item, amount_to_be_paid: tx.amount_to_be_paid } : item
                                          );
                                          setEventSales({ ...eventSales, recent: revertedRecent });
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Error updating amount to be paid:', error);
                                      // Revert local state on error
                                      if (eventSales) {
                                        const revertedRecent = eventSales.recent.map(item => 
                                          item.id === tx.id ? { ...item, amount_to_be_paid: tx.amount_to_be_paid } : item
                                        );
                                        setEventSales({ ...eventSales, recent: revertedRecent });
                                      }
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    // Allow: backspace, delete, tab, escape, enter, decimal point
                                    if ([8, 9, 27, 13, 46, 110, 190].indexOf(e.keyCode) !== -1 ||
                                        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                                        (e.keyCode === 65 && e.ctrlKey === true) ||
                                        (e.keyCode === 67 && e.ctrlKey === true) ||
                                        (e.keyCode === 86 && e.ctrlKey === true) ||
                                        (e.keyCode === 88 && e.ctrlKey === true) ||
                                        // Allow: home, end, left, right, down, up
                                        (e.keyCode >= 35 && e.keyCode <= 40)) {
                                      return;
                                    }
                                    // Ensure that it is a number and stop the keypress
                                    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onPaste={(e) => {
                                    // Prevent pasting non-numeric content
                                    const paste = e.clipboardData.getData('text');
                                    if (!/^\d*\.?\d*$/.test(paste)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onFocus={(e) => {
                                    // Select all text when focused for easy replacement
                                    e.target.select();
                                  }}
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  title="Enter negotiated amount (numbers only)"
                                  aria-label={`Amount to be paid for transaction ${tx.id}`}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  value={tx.amount_paid === 0 ? '' : tx.amount_paid}
                                  onChange={async (e) => {
                                    // Handle amount paid update
                                    const inputValue = e.target.value;
                                    
                                    // Only allow numbers and decimal point
                                    if (inputValue && !/^\d*\.?\d*$/.test(inputValue)) {
                                      return; // Don't update if invalid characters
                                    }
                                    
                                    const newAmount = inputValue === '' ? 0 : parseFloat(inputValue) || 0;
                                    
                                    // Update local state immediately for better UX
                                    if (eventSales) {
                                      const updatedRecent = eventSales.recent.map(item => 
                                        item.id === tx.id ? { ...item, amount_paid: newAmount } : item
                                      );
                                      setEventSales({ ...eventSales, recent: updatedRecent });
                                    }
                                    
                                    try {
                                      const response = await fetch(`/api/admin/event-sales/${tx.id}/amount-paid`, {
                                        method: 'PUT',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        credentials: 'omit',
                                        body: JSON.stringify({ amount_paid: newAmount })
                                      });
                                      
                                      if (!response.ok) {
                                        console.error('Failed to update payment amount');
                                        // Revert local state on error
                                        if (eventSales) {
                                          const revertedRecent = eventSales.recent.map(item => 
                                            item.id === tx.id ? { ...item, amount_paid: tx.amount_paid } : item
                                          );
                                          setEventSales({ ...eventSales, recent: revertedRecent });
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Error updating payment amount:', error);
                                      // Revert local state on error
                                      if (eventSales) {
                                        const revertedRecent = eventSales.recent.map(item => 
                                          item.id === tx.id ? { ...item, amount_paid: tx.amount_paid } : item
                                        );
                                        setEventSales({ ...eventSales, recent: revertedRecent });
                                      }
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    // Allow: backspace, delete, tab, escape, enter, decimal point
                                    if ([8, 9, 27, 13, 46, 110, 190].indexOf(e.keyCode) !== -1 ||
                                        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                                        (e.keyCode === 65 && e.ctrlKey === true) ||
                                        (e.keyCode === 67 && e.ctrlKey === true) ||
                                        (e.keyCode === 86 && e.ctrlKey === true) ||
                                        (e.keyCode === 88 && e.ctrlKey === true) ||
                                        // Allow: home, end, left, right, down, up
                                        (e.keyCode >= 35 && e.keyCode <= 40)) {
                                      return;
                                    }
                                    // Ensure that it is a number and stop the keypress
                                    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onPaste={(e) => {
                                    // Prevent pasting non-numeric content
                                    const paste = e.clipboardData.getData('text');
                                    if (!/^\d*\.?\d*$/.test(paste)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onFocus={(e) => {
                                    // Select all text when focused for easy replacement
                                    e.target.select();
                                  }}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  title="Enter amount paid (numbers only)"
                                  aria-label={`Amount paid for transaction ${tx.id}`}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <select
                                value={tx.status}
                                onChange={async (e) => {
                                  // Handle payment status change
                                  const newStatus = e.target.value;
                                  
                                  // Update local state immediately for better UX
                                  if (eventSales) {
                                    const updatedRecent = eventSales.recent.map(item => 
                                      item.id === tx.id ? { ...item, status: newStatus } : item
                                    );
                                    setEventSales({ ...eventSales, recent: updatedRecent });
                                  }
                                  
                                  try {
                                    const response = await fetch(`/api/admin/event-sales/${tx.id}/status`, {
                                      method: 'PUT',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      credentials: 'omit',
                                      body: JSON.stringify({ status: newStatus })
                                    });
                                    
                                    if (!response.ok) {
                                      console.error('Failed to update payment status');
                                      // Revert local state on error
                                      if (eventSales) {
                                        const revertedRecent = eventSales.recent.map(item => 
                                          item.id === tx.id ? { ...item, status: tx.status } : item
                                        );
                                        setEventSales({ ...eventSales, recent: revertedRecent });
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error updating payment status:', error);
                                    // Revert local state on error
                                    if (eventSales) {
                                      const revertedRecent = eventSales.recent.map(item => 
                                        item.id === tx.id ? { ...item, status: tx.status } : item
                                      );
                                      setEventSales({ ...eventSales, recent: revertedRecent });
                                    }
                                  }
                                }}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                title="Select payment status"
                              >
                                <option value="not_paid">Not Paid</option>
                                <option value="downpayment">Downpayment</option>
                                <option value="fully_paid">Fully Paid</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
        </>
      )}

    </div>
  );
};

export default AdminSales; 