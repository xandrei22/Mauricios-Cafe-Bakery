import React from 'react';
import { useAuth } from './AuthContext';
import CustomerEventForm from './CustomerEventForm';

const CustomerEventsPage: React.FC = () => {
  const { user, loading, authenticated } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!authenticated || !user) return <div>Please log in to view your events.</div>;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-2 sm:mx-4 lg:mx-6 pt-4">
        <CustomerEventForm customer_id={user.id} customer_name={user.name || (user as any).full_name || user.email} />
      </div>
    </div>
  );
};

export default CustomerEventsPage; 