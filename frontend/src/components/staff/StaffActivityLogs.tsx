import React from 'react';
import AdminActivityLogs from '../admin/AdminActivityLogs';

const StaffActivityLogs: React.FC = () => {
  return (
    <AdminActivityLogs
      basePath="/api/staff"
      title="My Activity Logs"
      showUserTypeFilter={false}
      statsMode="none"
    />
  );
};

export default StaffActivityLogs;
