import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Star, MessageCircle, ThumbsUp, Clock, Trash2, Filter, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { io, Socket } from 'socket.io-client';
import Swal from 'sweetalert2';
import '../customer/progress-bar.css';
import RatingBar from '../ui/RatingBar';

interface Feedback {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  category: string;
  feedback_time: string;
}

interface FeedbackMetrics {
  totalReviews: number;
  averageRating: string;
  satisfiedCustomers: string;
  ratingDistribution: { [key: number]: number };
}

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [metrics, setMetrics] = useState<FeedbackMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterRating, setFilterRating] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setSocket] = useState<Socket | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Join admin room for real-time updates
    newSocket.emit('join-admin-room');

    // Listen for real-time updates
    newSocket.on('feedback-updated', (data) => {
      console.log('Feedback updated in AdminFeedback:', data);
      fetchFeedbacks();
      fetchMetrics();
    });

    fetchFeedbacks();
    fetchMetrics();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const response = await fetch('/api/feedback', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/feedback/metrics', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleDeleteFeedback = async (feedbackId: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This feedback will be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/feedback/${feedbackId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          // Remove from local state
          setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
          // Refresh metrics
          await fetchMetrics();
          Swal.fire('Deleted!', 'Feedback has been deleted.', 'success');
        } else {
          Swal.fire('Error!', 'Failed to delete feedback.', 'error');
        }
      } catch (error) {
        console.error('Error deleting feedback:', error);
        Swal.fire('Error!', 'Failed to delete feedback.', 'error');
      }
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Food': 'bg-green-100 text-green-800',
      'Service': 'bg-blue-100 text-blue-800',
      'Ambience': 'bg-purple-100 text-purple-800',
      'General': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors['General'];
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter feedbacks based on selected filters and search query
  const filteredFeedbacks = feedbacks.filter(feedback => {
    const categoryMatch = filterCategory === 'All' || feedback.category === filterCategory;
    const ratingMatch = filterRating === 'All' || 
      (filterRating === '5' && feedback.rating === 5) ||
      (filterRating === '4' && feedback.rating === 4) ||
      (filterRating === '3' && feedback.rating === 3) ||
      (filterRating === '2' && feedback.rating === 2) ||
      (filterRating === '1' && feedback.rating === 1);
    const searchMatch = searchQuery === '' || 
      feedback.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return categoryMatch && ratingMatch && searchMatch;
  });

  // Display recent first (already ordered desc by API), limit to 5 by default
  const displayedFeedbacks = showAll ? filteredFeedbacks : filteredFeedbacks.slice(0, 5);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <main className="flex-1 bg-white p-0 m-0 w-full min-h-screen overflow-y-auto pt-20">
          <div className="flex items-center justify-center h-64">
            <span className="text-lg">Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Customer Feedback</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and respond to customer feedback</p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
            {/* Metrics Cards - match Customer layout */}
            {metrics && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Average Rating + Distribution */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 lg:col-span-8">
                  <div className="flex items-start gap-8">
                    {/* Average Rating */}
                    <div className="text-center">
                      <div className="text-5xl font-bold text-[#3f3532] mb-3">{metrics.averageRating}</div>
                      <div className="flex items-center justify-center gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-6 h-6 ${
                              star <= Math.floor(parseFloat(metrics.averageRating))
                                ? 'fill-yellow-400 text-yellow-400'
                                : star === Math.ceil(parseFloat(metrics.averageRating)) && parseFloat(metrics.averageRating) % 1 !== 0
                                ? 'fill-yellow-400/50 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="bg-[#8B4513] text-white px-4 py-2 rounded-full text-sm font-medium inline-block">
                        Total Reviews {metrics.totalReviews}
                      </div>
                    </div>

                    {/* Distribution */}
                    <div className="flex-1">
                      <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = metrics.ratingDistribution[rating] || 0;
                          const total = metrics.totalReviews || 1;
                          const pct = Math.max(0, Math.min(100, (count / total) * 100));
                          const width = `${pct}%`;
                          return (
                            <div key={rating} className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-600 w-4">{rating}</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <RatingBar value={pct} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Satisfaction */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 lg:col-span-4">
                  <div className="flex items-center gap-6">
                    {/* Large thumbs-up icon without ring */}
                    <ThumbsUp className="w-20 h-20 text-[#8B4513]" />
                    {/* Centered text */}
                    <div className="text-left">
                      <div className="text-4xl sm:text-5xl font-bold text-[#3f3532] leading-tight">{metrics.satisfiedCustomers}</div>
                      <div className="text-sm text-gray-600">Customer Satisfaction</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filters - unified bar */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
        <input
          type="text"
          placeholder="Search by customer name, comment, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-3 py-3 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437] rounded-lg"
        />
        <Button
          onClick={() => {
            // Search functionality is already handled by the filtered feedbacks
            console.log('Searching for:', searchQuery);
          }}
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-[#a87437]/10"
        >
          <Search className="h-4 w-4 text-[#a87437]" />
        </Button>
                </div>
                <Select value={filterRating} onValueChange={setFilterRating}>
                  <SelectTrigger className="min-w-[140px] pr-4 border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]">
                    <SelectValue placeholder="All Ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="min-w-[140px] pr-4 border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All categories</SelectItem>
                    <SelectItem value="Food">Food & Drinks</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Ambience">Ambience</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Feedback List */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-semibold text-[#6B5B5B]">
                  Feedback
                </h2>
              </div>
              
              {filteredFeedbacks.length === 0 ? (
                <Card className="bg-white border border-[#a87437]/20 shadow-lg">
                  <CardContent className="p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No reviews found</h3>
                    <p className="text-gray-500">Try adjusting your filters or check back later.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {displayedFeedbacks.map((feedback) => (
                    <Card key={feedback.id} className="bg-gray-50 border border-gray-200 shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#6B5B5B] rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {feedback.customer_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-[#3f3532] text-lg">{feedback.customer_name}</h4>
                              <div className="flex items-center gap-2 text-base text-gray-500">
                                <Clock className="w-5 h-5" />
                                {formatDate(feedback.feedback_time)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getCategoryColor(feedback.category)} text-xs px-2 py-1`}>
                              {feedback.category}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteFeedback(feedback.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex items-center gap-2">
                            {renderStars(feedback.rating)}
                            <span className={`font-semibold text-base ${getRatingColor(feedback.rating)}`}>
                              {feedback.rating}/5
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {(() => {
                            const full = (feedback.comment || '').trim();
                            const words = full ? full.split(/\s+/) : [];
                            const shouldShowTitle = words.length > 6; // only show a title if there is enough text
                            const title = shouldShowTitle ? words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '') : '';
                            return shouldShowTitle ? (
                              <h5 className="font-medium text-[#3f3532] text-base">{title}</h5>
                            ) : null;
                          })()}
                          {feedback.comment && (
                            <p className="text-gray-700 text-base leading-relaxed">{feedback.comment}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredFeedbacks.length > 5 && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAll(prev => !prev)}
                        className="px-6"
                      >
                        {showAll ? 'Show less' : `Show all (${filteredFeedbacks.length - 5} more)`}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
      </div>
    </div>
  );
} 