import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Users, 
  ShoppingCart, 
  TrendingUp,
  Package, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useSessionValidation } from '../../hooks/useSessionValidation';
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
  ArcElement,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface DashboardData {
  data: {
    revenue: {
      today: number;
      week: number;
      month: number;
      growth: number;
    };
  orders: {
    pending: number;
    processing: number;
    completed: number;
    total: number;
  };
    customers: {
      total: number;
      new: number;
      active: number;
    };
    inventory: {
      total: number;
      low_stock: number;
      out_of_stock: number;
    };
  };
}

const StaffDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [chartData, setChartData] = useState({
    sales: { labels: [], datasets: [] },
    ingredients: { labels: [], datasets: [] },
    menuItems: { labels: [], datasets: [] },
    staffSales: { labels: [], datasets: [] }
  });

  // Default empty chart data to prevent undefined errors
  const getDefaultChartData = (type: string) => ({
    labels: ['No Data'],
    datasets: [{
      label: type,
      data: [0],
      backgroundColor: type === 'sales' ? 'rgba(168, 116, 55, 0.1)' : '#a87437',
      borderColor: '#a87437',
      borderWidth: 1,
    }]
  });
  const [staffPerformanceData, setStaffPerformanceData] = useState(null);
  const [performancePeriod, setPerformancePeriod] = useState('month');
  const navigate = useNavigate();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };
  
  // Session validation - will automatically redirect if session expires
  const { user, isLoading: sessionLoading, isValid: sessionValid, checkSession } = useSessionValidation('staff');

  // Fetch staff performance data
  const fetchStaffPerformanceData = async (period = 'month') => {
    try {
      const response = await fetch(`/api/admin/dashboard/staff-performance?period=${period}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Staff performance data received:', data);
        setStaffPerformanceData(data);
        
        // Process data for chart
        if (data.staff_performance && data.staff_performance.length > 0) {
          const labels = data.staff_performance.map(staff => staff.staff_name || 'Unknown Staff');
          const salesData = data.staff_performance.map(staff => Number(staff.total_sales) || 0);
          
          console.log('Staff performance chart data:', { labels, salesData });
          
          // Ensure we have valid data before setting chart data
          if (labels.length > 0 && salesData.length > 0) {
            setChartData(prev => ({
              ...prev,
              staffSales: {
                labels: labels,
                datasets: [{
                  label: 'Sales (₱)',
                  data: salesData,
                  backgroundColor: [
                    '#a87437', '#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F5DEB3',
                    '#D2B48C', '#F4A460', '#BC8F8F', '#DDA0DD'
                  ],
                  borderColor: '#8f652f',
                  borderWidth: 1,
                }]
              }
            }));
          } else {
            console.log('Invalid staff performance data structure');
            // Set empty chart data to prevent undefined errors
            setChartData(prev => ({
              ...prev,
              staffSales: {
                labels: ['No Data'],
                datasets: [{
                  label: 'Sales (₱)',
                  data: [0],
                  backgroundColor: ['#a87437'],
                  borderColor: '#8f652f',
                  borderWidth: 1,
                }]
              }
            }));
          }
        } else {
          console.log('No staff performance data found');
          // Set empty chart data to prevent undefined errors
          setChartData(prev => ({
            ...prev,
            staffSales: {
              labels: ['No Data'],
              datasets: [{
                label: 'Sales (₱)',
                data: [0],
                backgroundColor: ['#a87437'],
                borderColor: '#8f652f',
                borderWidth: 1,
              }]
            }
          }));
        }
      } else {
        console.error('Staff performance API error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching staff performance data:', error);
    }
  };

  // Fetch chart data
  const fetchChartData = async () => {
    try {
      // Fetch sales data - use admin endpoints for consistency
      const salesResponse = await fetch('/api/admin/dashboard/sales', {
        credentials: 'include'
      });
      let salesData = null;
      if (salesResponse.ok) {
        const salesRaw = await salesResponse.json();
        console.log('Raw staff sales API response:', salesRaw);
        if (salesRaw && Array.isArray(salesRaw.labels) && Array.isArray(salesRaw.data) && salesRaw.labels.length > 0) {
          salesData = salesRaw;
          console.log('Valid staff sales data found:', salesData);
        } else {
          console.log('Staff sales API returned empty or invalid data');
        }
      } else {
        console.log('Staff sales API request failed:', salesResponse.status, salesResponse.statusText);
      }
      
      // Only use fallback if API completely fails, not if it returns empty data
      if (!salesData) {
        console.log('Staff sales API failed, using minimal fallback');
        const today = new Date();
        const labels = [];
        const data = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
          data.push(0); // Show zero instead of random data
        }
        salesData = { labels, data };
      } else {
        console.log('Staff sales data loaded from API:', salesData);
      }

      // Fetch ingredients usage data - use admin endpoints for consistency
      const ingredientsResponse = await fetch('/api/admin/dashboard/ingredients', {
        credentials: 'include'
      });
      let ingredientsData = null;
      if (ingredientsResponse.ok) {
        const ingredientsRaw = await ingredientsResponse.json();
        console.log('Raw staff ingredients API response:', ingredientsRaw);
        if (ingredientsRaw && Array.isArray(ingredientsRaw.labels) && Array.isArray(ingredientsRaw.data) && ingredientsRaw.labels.length > 0) {
          ingredientsData = ingredientsRaw;
          console.log('Valid staff ingredients data found:', ingredientsData);
        } else {
          console.log('Staff ingredients API returned empty or invalid data');
        }
      } else {
        console.log('Staff ingredients API request failed:', ingredientsResponse.status, ingredientsResponse.statusText);
      }
      
      // Only use fallback if API completely fails, not if it returns empty data
      if (!ingredientsData) {
        console.log('Staff ingredients API failed, using minimal fallback');
        const sampleIngredients = ['Coffee Beans', 'Milk', 'Sugar', 'Vanilla Syrup', 'Chocolate Powder', 'Cinnamon'];
        const labels = sampleIngredients.slice(0, 6);
        const data = labels.map(() => 0); // Show zero instead of random data
        ingredientsData = { labels, data };
      } else {
        console.log('Staff ingredients data loaded from API:', ingredientsData);
      }

      // Fetch menu items data - use admin endpoints for consistency
      const menuItemsResponse = await fetch('/api/admin/dashboard/menu-items', {
        credentials: 'include'
      });
      let menuItemsData = null;
      if (menuItemsResponse.ok) {
        const menuItemsRaw = await menuItemsResponse.json();
        console.log('Raw staff menu items API response:', menuItemsRaw);
        if (menuItemsRaw && Array.isArray(menuItemsRaw.labels) && Array.isArray(menuItemsRaw.data) && menuItemsRaw.labels.length > 0) {
          menuItemsData = menuItemsRaw;
          console.log('Valid staff menu items data found:', menuItemsData);
        } else {
          console.log('Staff menu items API returned empty or invalid data');
        }
      } else {
        console.log('Staff menu items API request failed:', menuItemsResponse.status, menuItemsResponse.statusText);
      }
      
      // Only use fallback if API completely fails, not if it returns empty data
      if (!menuItemsData) {
        console.log('Staff menu items API failed, using minimal fallback');
        const sampleItems = ['Cappuccino', 'Latte', 'Americano', 'Espresso', 'Mocha'];
        const labels = sampleItems.slice(0, 5);
        const data = labels.map(() => 0); // Show zero instead of random data
        menuItemsData = { labels, data };
      } else {
        console.log('Staff menu items data loaded from API:', menuItemsData);
      }

      // Process and set chart data with fallbacks
      setChartData({
        sales: salesData ? {
          labels: salesData.labels || [],
          datasets: [{
            label: 'Sales (₱)',
            data: (salesData.data || []).map((n: any) => Number(n) || 0),
            borderColor: '#a87437',
            backgroundColor: 'rgba(168, 116, 55, 0.1)',
            tension: 0.4,
            fill: true,
          }]
        } : {
          labels: ['No Data'],
          datasets: [{
            label: 'Sales (₱)',
            data: [0],
            borderColor: '#a87437',
            backgroundColor: 'rgba(168, 116, 55, 0.1)',
            tension: 0.4,
            fill: true,
          }]
        },
        
        ingredients: ingredientsData ? {
          labels: ingredientsData.labels || [],
          datasets: [{
            data: (ingredientsData.data || []).map((n: any) => Number(n) || 0),
            backgroundColor: [
              '#a87437', '#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F5DEB3'
            ],
            borderWidth: 2,
            borderColor: '#ffffff',
          }]
        } : {
          labels: ['No Data'],
          datasets: [{
            data: [100],
            backgroundColor: ['#a87437'],
            borderWidth: 2,
            borderColor: '#ffffff',
          }]
        },
        
        menuItems: menuItemsData ? {
          labels: menuItemsData.labels || [],
          datasets: [{
            label: 'Orders',
            data: (menuItemsData.data || []).map((n: any) => Number(n) || 0),
            backgroundColor: '#a87437',
            borderColor: '#8f652f',
            borderWidth: 1,
          }]
        } : {
          labels: ['No Data'],
          datasets: [{
            label: 'Orders',
            data: [0],
            backgroundColor: '#a87437',
            borderColor: '#8f652f',
            borderWidth: 1,
          }]
        }
      });
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };

  // Fetch dashboard data via unified metrics endpoint
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard data - use admin endpoints for consistency
      const staffResponse = await fetch('/api/admin/dashboard', {
        credentials: 'include'
      });
      
      if (staffResponse.status === 401) {
        // Session expired - redirect to login
        navigate('/staff/login');
        return;
      }
      
      let metricsData: any = null;
      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        console.log('Staff dashboard data received:', staffData);
        metricsData = {
          revenue: staffData?.data?.revenue?.month ?? 0, // Use month revenue for total
          todayRevenue: staffData?.data?.revenue?.today ?? 0, // Today's revenue
          growthPercent: staffData?.data?.revenue?.growth ?? 0,
          orders: staffData?.data?.orders ?? { total: 0, pending: 0, processing: 0, completed: 0, cancelled: 0 },
          inventory: staffData?.data?.inventory ?? { total: 0, low_stock: 0, out_of_stock: 0 },
          customers: staffData?.data?.customers ?? { total: 0, new: 0, active: 0 }
        };
        console.log('Processed metrics data:', metricsData);
      } else {
        console.log('Staff dashboard API failed:', staffResponse.status, staffResponse.statusText);
        // Fallback to basic data if staff endpoint fails
        metricsData = {
          revenue: 0,
          todayRevenue: 0,
          growthPercent: 0,
          orders: { total: 0, pending: 0, processing: 0, completed: 0, cancelled: 0 },
          inventory: { total: 0, low_stock: 0, out_of_stock: 0 },
          customers: { total: 0, new: 0, active: 0 }
        };
      }
      
      // Transform metrics data to match expected dashboard format
      console.log('Transformed metrics data:', metricsData);
      const n = (v: any) => {
        const num = Number(v);
        return isNaN(num) ? 0 : num;
      };
      const transformedData = {
        data: {
          revenue: {
            today: n(metricsData.todayRevenue),
            week: 0,
            month: n(metricsData.revenue),
            growth: n(metricsData.growthPercent || 0)
          },
          orders: {
            pending: n(metricsData.orders.pending),
            processing: n(metricsData.orders.processing),
            completed: n(metricsData.orders.completed),
            total: n(metricsData.orders.total)
          },
          customers: {
            total: n(metricsData.customers.total),
            new: n(metricsData.customers.new),
            active: n(metricsData.customers.active)
          },
          inventory: {
            total: n(metricsData.inventory.total),
            low_stock: n(metricsData.inventory.low_stock),
            out_of_stock: n(metricsData.inventory.out_of_stock)
          }
        }
      };
      
      setDashboardData(transformedData);
      setLastUpdated(new Date());
      
      // Also fetch chart data
      await fetchChartData();
      
      // Fetch staff performance data
      await fetchStaffPerformanceData(performancePeriod);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Network error')) {
        // Network error might be session related
        setError('Connection error. Please refresh the page or log in again.');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time updates via Socket.IO
  useEffect(() => {
    let socket: Socket | null = null;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      socket = io(API_URL, {
        transports: ['polling', 'websocket'],
        path: '/socket.io',
        withCredentials: true,
        timeout: 30000,
        forceNew: true,
        autoConnect: true
      });

      const joinRooms = () => {
        socket?.emit('join-staff-room');
      };
      socket.on('connect', joinRooms);
      joinRooms();

      const refreshAll = () => {
        // Refresh main metrics and charts
        fetchDashboardData();
        fetchChartData();
      };

      socket.on('new-order-received', refreshAll);
      socket.on('order-updated', refreshAll);
      socket.on('payment-updated', refreshAll);
      socket.on('inventory-updated', refreshAll);
      socket.on('feedback-updated', refreshAll);

      // Periodic refresh every 10 seconds for real-time updates
      const interval = setInterval(refreshAll, 10000);

      return () => {
        clearInterval(interval);
        socket?.close();
      };
    } catch (e) {
      console.warn('Socket initialization failed on StaffDashboard:', e);
      return () => {};
    }
  }, []);

  // Show loading while validating session
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching dashboard data
  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
          <Button onClick={fetchDashboardData} variant="outline">
            Try Again
          </Button>
            <Button onClick={checkSession} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
              Refresh Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData || !dashboardData.data) {
  return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">No dashboard data available</p>
          <Button onClick={fetchDashboardData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Staff Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Overview of your cafe's operations and performance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 dashboard-cards-tablet">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <span className="text-muted-foreground text-base font-semibold">₱</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{dashboardData.data.revenue.month.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={dashboardData.data.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {dashboardData.data.revenue.growth >= 0 ? '+' : ''}{dashboardData.data.revenue.growth}%
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <span className="text-muted-foreground text-base font-semibold">₱</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{dashboardData.data.revenue.today.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Updated daily
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.data.orders.total}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.data.orders.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.data.customers.total}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData.data.customers.new} new today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.data.inventory.total}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.data.inventory.low_stock} low stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Sales Line Chart */}
            <Card className="border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80 dashboard-chart-tablet">
                  {chartData.sales && chartData.sales.labels && chartData.sales.labels.length > 0 ? (
                    <Line data={chartData.sales} options={chartOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No sales data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Most Used Ingredients Pie Chart */}
            <Card className="border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Most Used Ingredients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80 dashboard-chart-tablet">
                  {chartData.ingredients && chartData.ingredients.labels && chartData.ingredients.labels.length > 0 ? (
                    <Pie data={chartData.ingredients} options={chartOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No ingredients data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bar Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Most Bought Menu Items Bar Chart */}
            <Card className="border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Most Bought Menu Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80 dashboard-chart-tablet">
                  {chartData.menuItems && chartData.menuItems.labels && chartData.menuItems.labels.length > 0 ? (
                    <Bar data={chartData.menuItems} options={chartOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No menu items data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Staff Performance Card */}
            <Card className="border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Staff Performance</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={performancePeriod === 'day' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setPerformancePeriod('day');
                        fetchStaffPerformanceData('day');
                      }}
                    >
                      Daily
                    </Button>
                    <Button
                      variant={performancePeriod === 'month' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setPerformancePeriod('month');
                        fetchStaffPerformanceData('month');
                      }}
                    >
                      Monthly
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80 dashboard-chart-tablet">
                  {staffPerformanceData && staffPerformanceData.staff_performance && staffPerformanceData.staff_performance.length > 0 && 
                   chartData.staffSales && chartData.staffSales.labels && chartData.staffSales.labels.length > 0 ? (
                    <Bar 
                      data={chartData.staffSales} 
                      options={{
                        ...chartOptions,
                        indexAxis: 'y' as const,
                        scales: {
                          x: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)',
                            },
                            ticks: {
                              callback: function(value) {
                                return '₱' + value.toLocaleString();
                              }
                            }
                          },
                          y: {
                            grid: {
                              display: false,
                            },
                          },
                        },
                        plugins: {
                          ...chartOptions.plugins,
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const staff = staffPerformanceData.staff_performance[context.dataIndex];
                                return [
                                  `Sales: ₱${staff.total_sales.toLocaleString()}`,
                                  `Orders: ${staff.total_orders}`,
                                  `Avg Order: ₱${staff.avg_order_value.toFixed(2)}`
                                ];
                              }
                            }
                          }
                        }
                      }} 
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No performance data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-500 text-center py-8">Recent orders will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-500 text-center py-8">Top products will be displayed here</p>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffDashboard;