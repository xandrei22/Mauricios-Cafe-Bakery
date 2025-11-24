import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

interface PositionProtectedRouteProps {
  children: React.ReactNode;
  requiredPosition?: string | string[];
  allowedPositions?: string[];
  fallbackPath?: string;
}

/**
 * PositionProtectedRoute - Extends ProtectedRoute to check user position
 * 
 * Usage:
 * - For Cashier only: <PositionProtectedRoute requiredPosition="Cashier">
 * - For Barista only: <PositionProtectedRoute requiredPosition="Barista">
 * - For multiple positions: <PositionProtectedRoute requiredPosition={["Cashier", "Manager"]}>
 * - For allowed positions: <PositionProtectedRoute allowedPositions={["Cashier", "Manager", "Admin"]}>
 */
const PositionProtectedRoute: React.FC<PositionProtectedRouteProps> = ({
  children,
  requiredPosition,
  allowedPositions,
  fallbackPath = '/staff/dashboard'
}) => {
  const location = useLocation();

  // Get user from localStorage
  const getStaffUser = () => {
    try {
      const staffUser = localStorage.getItem('staffUser');
      if (staffUser) {
        return JSON.parse(staffUser);
      }
    } catch (e) {
      console.error('Failed to parse staff user:', e);
    }
    return null;
  };

  // Check if user has required position
  const checkPosition = () => {
    const user = getStaffUser();
    
    if (!user) {
      return false;
    }

    // Admin and Manager can access everything
    if (user.role === 'admin' || user.position === 'Manager') {
      return true;
    }

    const userPosition = user.position || '';

    // Check requiredPosition
    if (requiredPosition) {
      if (Array.isArray(requiredPosition)) {
        return requiredPosition.includes(userPosition);
      }
      return userPosition === requiredPosition;
    }

    // Check allowedPositions
    if (allowedPositions) {
      return allowedPositions.includes(userPosition);
    }

    // If no position requirement specified, allow access
    return true;
  };

  return (
    <ProtectedRoute requiredRole="staff" fallbackPath={fallbackPath}>
      {checkPosition() ? (
        <>{children}</>
      ) : (
        <Navigate to="/unauthorized" state={{ from: location }} replace />
      )}
    </ProtectedRoute>
  );
};

export default PositionProtectedRoute;

