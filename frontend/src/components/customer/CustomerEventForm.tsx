import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

interface CustomerEventFormProps {
  customer_id: number;
  customer_name: string;
}

// Predefined occasion options
const OCCASION_OPTIONS = [
  { value: 'birthday', label: 'Birthday Party' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate Event' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'christening', label: 'Christening' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'reunion', label: 'Family Reunion' },
  { value: 'seminar', label: 'Seminar/Conference' },
  { value: 'other', label: 'Other' },
];

const CustomerEventForm: React.FC<CustomerEventFormProps> = ({ customer_id, customer_name }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [cups, setCups] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [customOccasion, setCustomOccasion] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get the final event type value
  const getEventType = () => {
    if (selectedOccasion === 'other') {
      return customOccasion.trim();
    }
    return selectedOccasion;
  };

  // Fetch user's event requests
  const fetchUserEvents = async () => {
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      
      // Add JWT token to headers if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_URL}/api/events/customer/${customer_id}`, {
        credentials: 'omit',
        headers: headers
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserEvents(data.events);
      }
    } catch (err) {
      console.error('Failed to fetch user events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Load user events on component mount and setup WebSocket
  React.useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(API_URL, {
      transports: ['polling', 'websocket'],
      path: '/socket.io',
      withCredentials: false,
      timeout: 30000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1500
    });

    // Join customer room for real-time updates
    newSocket.on('connect', () => {
      newSocket.emit('join-customer-room', { customerEmail: customer_name });
    });
    newSocket.io.on('reconnect', () => {
      newSocket.emit('join-customer-room', { customerEmail: customer_name });
    });
    newSocket.on('connect_error', (err) => {
      console.warn('CustomerEventForm socket connect_error:', err?.message || err);
    });

    // Listen for real-time updates
    newSocket.on('event-updated', (data) => {
      console.log('Event updated in CustomerEventForm:', data);
      fetchUserEvents();
    });

    fetchUserEvents();

    return () => {
      newSocket.close();
    };
  }, [customer_id, customer_name]);

  // Validate contact number format (Philippines format)
  const validateContactNumber = (number: string): boolean => {
    // Remove spaces, dashes, and other characters
    const cleaned = number.replace(/[\s\-\(\)\+]/g, '');
    // Check if it's a valid Philippine mobile number
    // Format: 09XXXXXXXXX (11 digits) or 0XXXXXXXXXX (11 digits starting with 0)
    // Also allow +639XXXXXXXXX format
    if (cleaned.length < 10 || cleaned.length > 11) {
      return false;
    }
    // Must start with 09 or 0 (for 11 digits) or +639 (for 10 digits after +639)
    const phMobileRegex = /^(09|0)\d{9}$/; // 11 digits: 09XXXXXXXXX or 0XXXXXXXXXX
    const phMobileRegexPlus = /^\+639\d{9}$/; // +639XXXXXXXXX format
    return phMobileRegex.test(cleaned) || phMobileRegexPlus.test(number.replace(/[\s\-\(\)]/g, ''));
  };

  // Validate form
  const validateForm = () => {
    console.log('🔍 Starting form validation...');
    console.log('🔍 Form values:', {
      eventDate,
      eventStartTime,
      eventEndTime,
      cups,
      contactName,
      contactNumber,
      address,
      selectedOccasion,
      customOccasion
    });

    if (!eventDate) {
      console.log('❌ Validation failed: Event Date is missing');
      toast('Event Date is required', { description: 'Please select an event date.' });
      return false;
    }
    if (!eventStartTime) {
      console.log('❌ Validation failed: Event Start Time is missing');
      toast('Event Start Time is required', { description: 'Please select an event start time.' });
      return false;
    }
    if (!eventEndTime) {
      console.log('❌ Validation failed: Event End Time is missing');
      toast('Event End Time is required', { description: 'Please select an event end time.' });
      return false;
    }
    if (eventEndTime <= eventStartTime) {
      console.log('❌ Validation failed: End time must be after start time');
      toast('Invalid Time Range', { description: 'End time must be after start time.' });
      return false;
    }
    // Validate cups - must be at least 80
    const cupsNum = Number(cups);
    if (!cups || isNaN(cupsNum) || cupsNum < 80) {
      console.log('❌ Validation failed: Invalid cups:', cups, 'Number:', cupsNum);
      toast('Invalid Number of Cups', { description: 'Minimum order is 80 cups. Please enter a valid number.' });
      return false;
    }
    if (!contactName || !contactName.trim()) {
      console.log('❌ Validation failed: Contact Name is missing');
      toast('Contact Name is required', { description: 'Please enter your contact name.' });
      return false;
    }
    // Validate contact number
    if (!contactNumber || !contactNumber.trim()) {
      console.log('❌ Validation failed: Contact Number is missing');
      toast('Contact Number is required', { description: 'Please enter your contact number.' });
      return false;
    }
    const cleanedContact = contactNumber.replace(/[\s\-\(\)\+]/g, '');
    console.log('🔍 Contact number validation:', {
      original: contactNumber,
      cleaned: cleanedContact,
      length: cleanedContact.length
    });
    if (!validateContactNumber(contactNumber)) {
      console.log('❌ Validation failed: Invalid contact number format:', contactNumber, 'Cleaned:', cleanedContact);
      toast('Invalid Contact Number', { 
        description: `Please enter a valid Philippine mobile number (11 digits: 09XXXXXXXXX or 0XXXXXXXXXX). You entered ${cleanedContact.length} digits.` 
      });
      return false;
    }
    if (!address || !address.trim()) {
      console.log('❌ Validation failed: Address is missing');
      toast('Address is required', { description: 'Please enter the event address.' });
      return false;
    }
    if (!selectedOccasion) {
      console.log('❌ Validation failed: Event Type is missing');
      toast('Event Type is required', { description: 'Please select an event type.' });
      return false;
    }
    if (selectedOccasion === 'other' && (!customOccasion || !customOccasion.trim())) {
      console.log('❌ Validation failed: Custom Event Type is missing');
      toast('Custom Event Type is required', { description: 'Please specify the custom event type.' });
      return false;
    }
    console.log('✅ All validations passed!');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double submission
    if (isSubmitting || loading) {
      console.log('⚠️ Form is already submitting, ignoring duplicate submission');
      return;
    }
    
    console.log('🔄 Form submit triggered');
    
    // Validate form
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }
    
    console.log('✅ Form validation passed');
    setIsSubmitting(true);
    setLoading(true);
    
    // Clean contact number before sending (remove spaces, dashes, etc.)
    const cleanedContactNumber = contactNumber.replace(/[\s\-\(\)\+]/g, '');
    
    const formData = {
      customer_id,
      customer_name,
      contact_name: contactName,
      contact_number: cleanedContactNumber,
      event_date: eventDate,
      event_start_time: eventStartTime,
      event_end_time: eventEndTime,
      address: address,
      event_type: getEventType(),
      notes: notes.trim(),
      cups: Number(cups),
    };
    
    console.log('📤 Submitting event form with data:', formData);
    console.log('📡 API URL:', `${API_URL}/api/events`);
    
    // Get JWT token from localStorage
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Add JWT token to headers if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ JWT token added to request headers');
    } else {
      console.warn('⚠️ No JWT token found in localStorage');
    }
    
    try {
      const res = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: headers,
        credentials: 'omit',
        body: JSON.stringify(formData),
      });
      
      console.log('📥 Response status:', res.status);
      console.log('📥 Response headers:', res.headers);
      
      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('❌ Non-JSON response:', text);
        toast('Submission failed', { description: 'Server returned an invalid response. Please try again.' });
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      console.log('📥 Response data:', data);
      
      if (res.ok && data.success) {
        console.log('✅ Event request submitted successfully! Event ID:', data.eventId);
        toast.success('Event request submitted!', { 
          description: 'Your event request has been sent to the admin. You will be notified once it is reviewed.',
          duration: 5000
        });
        // Reset form
        setEventDate('');
        setEventStartTime('');
        setEventEndTime('');
        setCups('');
        setContactName('');
        setContactNumber('');
        setAddress('');
        setSelectedOccasion('');
        setCustomOccasion('');
        setNotes('');
        // Refresh user events after a short delay to ensure backend has processed
        setTimeout(() => {
          fetchUserEvents();
        }, 1000);
      } else {
        console.error('❌ Submission failed:', data);
        let errorMessage = data.message || data.error?.message || data.error || 'Please try again.';
        
        // Show more detailed error in development
        if (import.meta.env.DEV && data.error) {
          console.error('Full error object:', data.error);
          if (data.error.hint) {
            errorMessage += ` (${data.error.hint})`;
          }
        }
        
        toast.error('Submission failed', { 
          description: errorMessage,
          duration: 7000
        });
      }
    } catch (err: any) {
      console.error('❌ Network error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      toast.error('Network error', { 
        description: err.message || 'Failed to connect to server. Please check your connection and try again.',
        duration: 5000
      });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'accepted': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  return (
    <>
      {/* Header - Match Menu page spacing and alignment */}
      <div className="space-y-4 sm:space-y-6 ml-0 mr-2 sm:mr-4 lg:mr-6 pt-1">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Event Reservations</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Reserve coffee for your special events and celebrations</p>
        </div>
      </div>

      {/* Form Containers - Separate with different background */}
      <div className="min-h-screen bg-[#f5f5f5] p-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Event Form - Left Side */}
          <Card className="xl:col-span-2 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <h2 className="text-2xl font-bold text-[#6B5B5B] mb-6">Reserve for a Special Event</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <div className="md:col-span-4">
              <Label htmlFor="occasion" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Event Type/Occasion *</Label>
              <Select value={selectedOccasion} onValueChange={setSelectedOccasion} required>
                <SelectTrigger 
                  className="w-full h-12 min-h-[48px] border border-gray-300 rounded-xl focus:border-gray-400 focus:ring-2 focus:ring-gray-200 flex items-center justify-between"
                  style={{ height: '48px', minHeight: '48px' }}
                >
                  <SelectValue placeholder="Select an occasion" />
                </SelectTrigger>
                <SelectContent>
                  {OCCASION_OPTIONS.map((occasion) => (
                    <SelectItem key={occasion.value} value={occasion.value}>
                      {occasion.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="event-date" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Event Date *</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                min={getMinDate()}
                onChange={e => setEventDate(e.target.value)}
                required
                className="h-12 min-h-[48px] border border-gray-300 rounded-xl focus:border-gray-400 focus:ring-2 focus:ring-gray-200 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                style={{ height: '48px', minHeight: '48px' }}
              />
              <p className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap text-center">Minimum 1 day advance booking</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <div className="md:col-span-2">
              <Label htmlFor="event-start-time" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Event Start Time *</Label>
              <Input
                id="event-start-time"
                type="time"
                value={eventStartTime}
                onChange={e => setEventStartTime(e.target.value)}
                required
                className="h-12 border border-gray-300 rounded-xl focus:border-gray-400 focus:ring-2 focus:ring-gray-200 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="event-end-time" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Event End Time *</Label>
              <Input
                id="event-end-time"
                type="time"
                value={eventEndTime}
                onChange={e => setEventEndTime(e.target.value)}
                required
                className="h-12 border border-gray-300 rounded-xl focus:border-gray-400 focus:ring-2 focus:ring-gray-200 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="cups" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Number of Cups *</Label>
              <Input
                id="cups"
                type="number"
                min={80}
                step={1}
                value={cups}
                onChange={e => {
                  const value = e.target.value;
                  // Only allow numbers and ensure minimum is 80
                  if (value === '' || (Number(value) >= 80)) {
                    setCups(value);
                  } else if (Number(value) < 80 && value !== '') {
                    toast('Minimum 80 cups', { description: 'The minimum order is 80 cups.' });
                  }
                }}
                placeholder="Minimum: 80 cups"
                required
                className="h-12 border border-gray-300 rounded-xl focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
              />
              <p className="text-[10px] text-gray-500 mt-0.5 text-center">Minimum order: 80 cups</p>
            </div>
          </div>
          
          {selectedOccasion === 'other' && (
            <div>
              <Label htmlFor="custom-occasion" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Specify Event Type *</Label>
              <Input
                id="custom-occasion"
                type="text"
                placeholder="Enter your custom event type"
                value={customOccasion}
                onChange={e => setCustomOccasion(e.target.value)}
                required
                className="h-12 border border-gray-300 rounded-xl focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="contact-name" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Contact Name *</Label>
            <Input
              id="contact-name"
              type="text"
              placeholder="Enter your full name"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              required
              className="h-12 !border-gray-300 border rounded-xl focus:!border-gray-400 focus:ring-2 focus:ring-gray-200"
            />
          </div>
          
          <div>
            <Label htmlFor="contact-number" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Contact Number *</Label>
            <Input
              id="contact-number"
              type="tel"
              placeholder="e.g., 09123456789 or 09214733335"
              value={contactNumber}
              onChange={e => {
                // Allow numbers, spaces, dashes, parentheses, and + for formatting
                const value = e.target.value.replace(/[^\d\s\-\(\)\+]/g, '');
                // Limit to 13 characters to allow for formatting but prevent too long numbers
                const limitedValue = value.length > 13 ? value.slice(0, 13) : value;
                setContactNumber(limitedValue);
              }}
              maxLength={13}
              required
              className="h-12 !border-gray-300 border rounded-xl focus:!border-gray-400 focus:ring-2 focus:ring-gray-200"
            />
            <p className="text-[10px] text-gray-500 mt-0.5">Format: 09XXXXXXXXX (11 digits)</p>
          </div>
          
          <div>
            <Label htmlFor="address" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Complete Address *</Label>
            <Textarea
              id="address"
              placeholder="Enter the complete event address (street, barangay, etc.)"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              rows={3}
              className="border border-gray-300 rounded-xl focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            />
          </div>
          
          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or additional information"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="border border-gray-300 rounded-xl focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 bg-[#a87437] hover:bg-[#8f652f] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={loading || isSubmitting}
            onClick={(e) => {
              console.log('🖱️ Submit button clicked');
              // Prevent default to let form's onSubmit handle it
              if (!loading && !isSubmitting) {
                // Form submission will be handled by onSubmit
              } else {
                e.preventDefault();
                console.log('⚠️ Button click ignored - form is submitting');
              }
            }}
          >
            {loading || isSubmitting ? 'Submitting...' : 'Submit Event Request'}
          </Button>
              </form>
            </CardContent>
          </Card>

          {/* Your Event Requests - Right Side */}
          <Card className="xl:col-span-1 shadow-xl hover:shadow-2xl transition-shadow duration-300 xl:sticky xl:top-4">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-[#6B5B5B] mb-6">Your Event Requests</h3>
        
              {loadingEvents ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a87437] mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading...</p>
                </div>
              ) : userEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No event requests yet</p>
                  <p className="text-sm text-gray-400 mt-1">Submit your first event request using the form</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {userEvents.map((event) => (
                    <div key={event.id} className="rounded-xl p-4 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-[#6B5B5B]">{event.event_type}</h4>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusColor(event.status)} bg-white border border-gray-200`}>
                          {getStatusText(event.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-2">
                        <p><span className="font-medium text-[#6B5B5B]">Date:</span> {new Date(event.event_date).toLocaleDateString()}</p>
                        <p><span className="font-medium text-[#6B5B5B]">Time:</span> {event.event_start_time || 'TBD'} - {event.event_end_time || 'TBD'}</p>
                        <p><span className="font-medium text-[#6B5B5B]">Cups:</span> {event.cups}</p>
                        {event.contact_name && (
                          <p><span className="font-medium text-[#6B5B5B]">Contact:</span> {event.contact_name}</p>
                        )}
                        <p><span className="font-medium text-[#6B5B5B]">Location:</span> {event.address.substring(0, 50)}{event.address.length > 50 ? '...' : ''}</p>
                        {event.notes && (
                          <p><span className="font-medium text-[#6B5B5B]">Notes:</span> {event.notes.substring(0, 50)}{event.notes.length > 50 ? '...' : ''}</p>
                        )}
                        {event.admin_response_date && (
                          <p><span className="font-medium text-[#6B5B5B]">Admin Response:</span> {new Date(event.admin_response_date).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-200">
                        Submitted: {new Date(event.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerEventForm; 
