import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { 
  Calendar, 
  Users, 
  Coffee, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  User,
  RefreshCw,
  CreditCard,
  Plus
} from 'lucide-react';

interface Event {
  id: number;
  customer_name: string;
  contact_number: string;
  event_date: string;
  address: string;
  event_type: string;
  notes?: string;
  cups: number;
  status: string;
  admin_response_date?: string;
  created_at: string;
}

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Payment form state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: '',
    status: 'not_paid',
    amount_paid: '',
    amount_to_be_paid: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events/admin');
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents(data.events);
      } else {
        toast('Failed to load events', { description: data.message || 'Please try again.' });
      }
    } catch (err) {
      toast('Network error', { description: 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize Socket.IO connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL, { transports: ['polling','websocket'], path: '/socket.io' });
    setSocket(newSocket);

    // Join admin room for real-time updates
    const joinAdminRoom = () => {
      console.log('📡 AdminEvents: Joining admin-room');
      newSocket.emit('join-admin-room');
    };

    // Join room on connect
    newSocket.on('connect', () => {
      console.log('✅ AdminEvents: Socket connected');
      joinAdminRoom();
    });

    // Join room immediately if already connected
    if (newSocket.connected) {
      joinAdminRoom();
    }

    // Listen for real-time updates
    newSocket.on('event-updated', (data) => {
      console.log('📡 AdminEvents: Event updated received:', data);
      if (data.type === 'event_created') {
        console.log('🆕 New event created, refreshing events list');
        fetchEvents();
      } else {
        fetchEvents();
      }
    });

    // Listen for new notifications
    newSocket.on('new-notification', (notification) => {
      console.log('📢 AdminEvents: New notification received:', notification);
      if (notification.notification_type === 'event_request') {
        console.log('🆕 New event request notification, refreshing events list');
        fetchEvents();
      }
    });

    // Handle connection errors
    newSocket.on('connect_error', (error) => {
      console.error('❌ AdminEvents: Socket connection error:', error);
    });

    // Handle disconnection
    newSocket.on('disconnect', () => {
      console.log('❌ AdminEvents: Socket disconnected');
    });

    fetchEvents();

    return () => {
      console.log('🧹 AdminEvents: Cleaning up socket connection');
      newSocket.close();
    };
  }, []);

  const handleAction = async (id: number, action: 'accept' | 'reject') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/events/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(`Event ${action}ed`, { description: data.message });
        fetchEvents();
      } else {
        toast('Action failed', { description: data.message || 'Please try again.' });
      }
    } catch (err) {
      toast('Network error', { description: 'Please try again.' });
    } finally {
      setActionLoading(null);
    }
  };

  const openPaymentModal = (event: Event) => {
    setSelectedEvent(event);
    setPaymentForm({
      amount: '',
      payment_method: '',
      status: 'not_paid',
      amount_paid: '',
      amount_to_be_paid: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setPaymentLoading(true);
    try {
      const res = await fetch('/api/admin/event-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
        body: JSON.stringify({
          event_id: selectedEvent.id,
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          status: paymentForm.status,
          amount_paid: parseFloat(paymentForm.amount_paid) || 0,
          amount_to_be_paid: parseFloat(paymentForm.amount_to_be_paid) || parseFloat(paymentForm.amount)
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast('Payment added successfully', { description: 'Event sales record created' });
        setShowPaymentModal(false);
        setSelectedEvent(null);
        // Refresh events to show updated data
        fetchEvents();
      } else {
        toast('Failed to add payment', { description: data.message || 'Please try again.' });
      }
    } catch (err) {
      toast('Network error', { description: 'Please try again.' });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Filter events based on search and status
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.contact_number.includes(searchTerm) ||
                         event.event_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pendingEvents = events.filter(event => event.status === 'pending');
  const acceptedEvents = events.filter(event => event.status === 'accepted');
  const rejectedEvents = events.filter(event => event.status === 'rejected');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Event Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Review and manage customer event requests</p>
        </div>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingEvents.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Accepted</p>
                <p className="text-2xl font-bold text-gray-900">{acceptedEvents.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{rejectedEvents.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  placeholder="Search by customer name, contact, or event type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]"
                />
                <Button
                  onClick={() => {
                    // Search functionality is already handled by the filtered events
                    console.log('Searching for:', searchTerm);
                  }}
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-[#a87437]/10"
                >
                  <Search className="h-4 w-4 text-[#a87437]" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="px-3 py-2 pr-4 border border-[#a87437] rounded-lg text-sm bg-white focus:border-[#8f652f] focus:ring-[#a87437]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Event Requests</h2>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {filteredEvents.length} events
            </Badge>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-lg font-medium">No events found</p>
              <p className="text-sm">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Event requests will appear here when customers submit them'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="font-semibold text-gray-900">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-900">Contact</TableHead>
                    <TableHead className="font-semibold text-gray-900">Event Date</TableHead>
                    <TableHead className="font-semibold text-gray-900">Event Type</TableHead>
                    <TableHead className="font-semibold text-gray-900">Address</TableHead>
                    <TableHead className="font-semibold text-gray-900">Cups</TableHead>
                    <TableHead className="font-semibold text-gray-900">Status</TableHead>
                    <TableHead className="font-semibold text-gray-900">Response Date</TableHead>
                    <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map(event => (
                    <TableRow key={event.id} className="border-white/20 hover:bg-white/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-50 rounded-full">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{event.customer_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{event.contact_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{new Date(event.event_date).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Coffee className="w-4 h-4 text-gray-400" />
                          <span>{event.event_type || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-xs">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate" title={event.address}>
                            {event.address || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{event.cups}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(event.status)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {event.admin_response_date 
                            ? new Date(event.admin_response_date).toLocaleDateString()
                            : '-'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        {event.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                              disabled={actionLoading === event.id}
                              onClick={() => handleAction(event.id, 'accept')}
                            >
                              {actionLoading === event.id ? 'Accepting...' : 'Accept'}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
                              disabled={actionLoading === event.id}
                              onClick={() => handleAction(event.id, 'reject')}
                            >
                              {actionLoading === event.id ? 'Rejecting...' : 'Reject'}
                            </Button>
                          </div>
                        )}
                        {event.status === 'accepted' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                            onClick={() => openPaymentModal(event)}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Add Payment
                          </Button>
                        )}
                        {event.status === 'rejected' && (
                          <span className="text-sm text-gray-500">No actions available</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Add Payment for Event
              </DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{selectedEvent.customer_name}</p>
                  <p className="text-sm text-gray-600">{selectedEvent.event_type} • {new Date(selectedEvent.event_date).toLocaleDateString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Total Amount (₱)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Select
                      value={paymentForm.payment_method}
                      onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="gcash">GCash</SelectItem>
                        <SelectItem value="paymaya">PayMaya</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Payment Status</Label>
                  <Select
                    value={paymentForm.status}
                    onValueChange={(value) => setPaymentForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_paid">Not Paid</SelectItem>
                      <SelectItem value="downpayment">Downpayment</SelectItem>
                      <SelectItem value="fully_paid">Fully Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount_paid">Amount Paid (₱)</Label>
                    <Input
                      id="amount_paid"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentForm.amount_paid}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount_paid: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount_to_be_paid">Amount to be Paid (₱)</Label>
                    <Input
                      id="amount_to_be_paid"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentForm.amount_to_be_paid}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount_to_be_paid: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPaymentModal(false)}
                    disabled={paymentLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={paymentLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {paymentLoading ? 'Adding...' : 'Add Payment'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default AdminEvents; 