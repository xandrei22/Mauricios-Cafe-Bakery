import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { io, Socket } from 'socket.io-client';
import axiosInstance from '../../utils/axiosInstance';
import { getApiUrl } from '../../utils/apiConfig';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  User,
  Users,
  Clock,
  Eye,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

interface ActivityLog {
  id: number;
  user_type: 'admin' | 'staff';
  user_id: number;
  username: string;
  action_type: string;
  target_type: string;
  target_id: string;
  old_values: any;
  new_values: any;
  description: string;
  created_at: string;
  formatted_date: string;
  status?: 'success' | 'error' | 'warning' | 'info';
}

interface ActivityStats {
  by_user_type: Array<{ user_type: string; count: number }>;
  by_action_type: Array<{ action_type: string; count: number }>;
  recent_activity: Array<{ user_type: string; action_type: string; count: number }>;
}

interface AdminActivityLogsProps {
  basePath?: '/api/admin' | '/api/staff';
  title?: string;
  showUserTypeFilter?: boolean;
  statsMode?: 'admin' | 'none';
}

const AdminActivityLogs: React.FC<AdminActivityLogsProps> = ({
  basePath = '/api/admin',
  title = 'Activity Logs',
  showUserTypeFilter = true,
  statsMode = 'admin'
}) => {
  const showValueDiffs = false;
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    user_type: basePath === '/api/staff' ? 'staff' : 'all',
    action_type: 'all',
    status: 'all',
    start_date: '',
    end_date: '',
    search: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [, setSocket] = useState<Socket | null>(null);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {
        page: currentPage.toString(),
        limit: '20',
        action_type: filters.action_type,
        status: filters.status
      };
      if (basePath === '/api/admin') {
        params.user_type = filters.user_type;
      }
      if (filters.start_date) {
        params.start_date = filters.start_date;
      }
      if (filters.end_date) {
        params.end_date = filters.end_date;
      }

      let response = await axiosInstance.get(`${basePath}/activity-logs`, { params });
      let data = response.data;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch activity logs');
      }

      setActivities(data.activities);
      setTotalPages(data.pagination.total_pages);
      setTotalActivities(data.pagination.total);
    } catch (err: any) {
      // Fallback: some deployments may not expose /api/staff/activity-logs.
      // Retry via admin endpoint filtered to staff so the page still works.
      if (basePath === '/api/staff') {
        try {
          const params: Record<string, string> = {
            page: currentPage.toString(),
            limit: '20',
            action_type: filters.action_type,
            status: filters.status,
            user_type: 'staff'
          };
          if (filters.start_date) params.start_date = filters.start_date;
          if (filters.end_date) params.end_date = filters.end_date;
          const response = await axiosInstance.get(`/api/admin/activity-logs`, { params });
          const data = response.data;
          if (data?.success) {
            setActivities(data.activities);
            setTotalPages(data.pagination.total_pages);
            setTotalActivities(data.pagination.total);
            setError(null);
            return;
          }
        } catch (fallbackErr: any) {
          // Ignore and fall through to error message
        }
      }
      setError(err?.message || 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (statsMode !== 'admin') {
      setStats(null);
      return;
    }
    try {
      const params: Record<string, string> = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await axiosInstance.get(`${basePath}/activity-logs/stats`, { params });
      const data = response.data;
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Stable socket subscription for real-time updates
  useEffect(() => {
    const apiUrl = getApiUrl() || undefined;
    const newSocket = io(apiUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: false
    });
    setSocket(newSocket);

    // Join proper room depending on which logs we are viewing
    const room = basePath === '/api/staff' ? 'join-staff-room' : 'join-admin-room';
    newSocket.emit(room);

    // New, lightweight event: prepend log directly
    const handleNewLog = (log: any) => {
      setActivities(prev => [log, ...prev]);
      setTotalActivities(t => t + 1);
    };
    newSocket.on('activity-log:new', handleNewLog);

    // Backward compatibility with existing emitters
    const handleActivityUpdated = () => {
      fetchActivityLogs();
      fetchStats();
    };
    newSocket.on('activity-updated', handleActivityUpdated);
    newSocket.on('order-updated', handleActivityUpdated);

    // Initial fetch
    fetchActivityLogs();
    fetchStats();

    return () => {
      newSocket.off('activity-log:new', handleNewLog);
      newSocket.off('activity-updated', handleActivityUpdated);
      newSocket.off('order-updated', handleActivityUpdated);
      newSocket.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when server-side filters/page/basePath change (ignore text search)
  useEffect(() => {
    fetchActivityLogs();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    basePath,
    filters.user_type,
    filters.action_type,
    filters.status,
    filters.start_date,
    filters.end_date
  ]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      user_type: basePath === '/api/staff' ? 'staff' : 'all',
      action_type: 'all',
      status: 'all',
      start_date: '',
      end_date: '',
      search: ''
    });
    setCurrentPage(1);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create_drink':
      case 'update_drink':
      case 'delete_drink':
        return <Activity className="w-4 h-4" />;
      case 'order_status_update':
      case 'payment_verification':
        return <CheckCircle className="w-4 h-4" />;
      case 'inventory_view':
      case 'inventory_adjustment':
        return <BarChart3 className="w-4 h-4" />;
      case 'loyalty_points_check':
        return <TrendingUp className="w-4 h-4" />;
      case 'order_cancellation':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create_drink':
      case 'order_status_update':
      case 'payment_verification':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update_drink':
      case 'inventory_adjustment':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete_drink':
      case 'order_cancellation':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'inventory_view':
      case 'loyalty_points_check':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUserTypeColor = (userType: string) => {
    return userType === 'admin' 
      ? 'bg-blue-100 text-blue-800 border-blue-200' 
      : 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // Helper function to determine status based on action type (for demonstration)
  const getActivityStatus = (activity: ActivityLog): string => {
    if (activity.status) return activity.status;
    
    // Default status based on action type
    switch (activity.action_type) {
      case 'create_drink':
      case 'order_status_update':
      case 'payment_verification':
        return 'success';
      case 'delete_drink':
      case 'order_cancellation':
        return 'error';
      case 'inventory_view':
      case 'loyalty_points_check':
        return 'info';
      case 'update_drink':
      case 'inventory_adjustment':
        return 'warning';
      default:
        return 'info';
    }
  };

  const filteredActivities = activities.filter(activity => {
    const username = (activity.username || '').toLowerCase();
    const description = (activity.description || '').toLowerCase();
    const action = (activity.action_type || '').toLowerCase();
    const q = filters.search.toLowerCase();
    
    // Text search filter
    const matchesSearch = username.includes(q) || description.includes(q) || action.includes(q);
    
    // Status filter
    const activityStatus = getActivityStatus(activity);
    const matchesStatus = filters.status === 'all' || activityStatus === filters.status;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4 bg-[#f5f5f5] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {basePath === '/api/admin' ? 'Monitor all admin and staff activities' : 'View your recent activities'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {statsMode === 'admin' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Activities</p>
                  <p className="text-2xl font-bold text-gray-900">{totalActivities}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Admin Activities</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.by_user_type.find(s => s.user_type === 'admin')?.count || 0}</p>
                </div>
                <User className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Staff Activities</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.by_user_type.find(s => s.user_type === 'staff')?.count || 0}</p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
            <div className="flex items-end justify-end gap-4">
              {showUserTypeFilter && basePath === '/api/admin' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">User Type</label>
                  <Select value={filters.user_type} onValueChange={(value) => handleFilterChange('user_type', value)}>
                    <SelectTrigger className="pr-4 border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admin">Admin Only</SelectItem>
                      <SelectItem value="staff">Staff Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Action Type</label>
                <Select value={filters.action_type} onValueChange={(value) => handleFilterChange('action_type', value)}>
                  <SelectTrigger className="pr-4 border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create_drink">Create Drink</SelectItem>
                    <SelectItem value="delete_drink">Delete Drink</SelectItem>
                    <SelectItem value="order_status_update">Order Status Update</SelectItem>
                    <SelectItem value="payment_verification">Payment Verification</SelectItem>
                    <SelectItem value="inventory_view">Inventory View</SelectItem>
                    <SelectItem value="loyalty_points_check">Loyalty Points Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="pr-4 border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                />
              </div>

              <Button
                onClick={clearFilters}
                variant="outline"
                className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Quick Filters */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Input
              placeholder="Search activities by username, description, or action type..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pr-10 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]"
            />
            <Button
              onClick={() => {
                // Search functionality is already handled by the filtered activities
                console.log('Searching for:', filters.search);
              }}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-[#a87437]/10"
            >
              <Search className="h-4 w-4 text-[#a87437]" />
            </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="bg-white/50 backdrop-blur-sm border-[#a87437] hover:bg-white/70"
              >
                Advanced Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
            <Badge>{filteredActivities.length} activities</Badge>
          </div>

          {error ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No activities found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <Card key={activity.id} className="bg-white/90 backdrop-blur-sm border-white/30 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        {getActionIcon(activity.action_type)}
                        <div>
                          <h3 className="font-semibold text-gray-900">{activity.username}</h3>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getUserTypeColor(activity.user_type)}>
                          {activity.user_type === 'admin' ? 'Admin' : 'Staff'}
                        </Badge>
                        <Badge className={getActionColor(activity.action_type)}>
                          {activity.action_type.replace(/_/g, ' ')}
                        </Badge>
                        {(() => {
                          const status = getActivityStatus(activity);
                          return (
                            <Badge className={getStatusColor(status)}>
                              {getStatusIcon(status)}
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {activity.formatted_date}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedActivity(activity);
                          setShowDetails(true);
                        }}
                        className="text-xs bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Activity Details Modal */}
        {showDetails && selectedActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Activity Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                  aria-label="Close activity details"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">User</p>
                    <p className="font-semibold">{selectedActivity.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">User Type</p>
                    <Badge className={getUserTypeColor(selectedActivity.user_type)}>
                      {selectedActivity.user_type === 'admin' ? 'Admin' : 'Staff'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Action</p>
                    <Badge className={getActionColor(selectedActivity.action_type)}>
                      {selectedActivity.action_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Target</p>
                    <p className="font-semibold">{selectedActivity.target_type} #{selectedActivity.target_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date & Time</p>
                    <p className="font-semibold">{selectedActivity.formatted_date}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Description</p>
                  <p className="text-gray-900">{selectedActivity.description}</p>
                </div>

                {showValueDiffs && selectedActivity.old_values && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Previous Values</p>
                    <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(selectedActivity.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {showValueDiffs && selectedActivity.new_values && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">New Values</p>
                    <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(selectedActivity.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default AdminActivityLogs; 