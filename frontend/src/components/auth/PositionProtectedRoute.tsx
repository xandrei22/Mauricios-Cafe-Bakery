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
    // Normalize position safely (trim + case-insensitive)
    const rawPosition = (user?.position ?? '').toString();
    const trimmedPosition = rawPosition.trim();

    if (!user) {
      return false;
    }

    // Admin and Manager can access everything
    const userPositionLower = trimmedPosition.toLowerCase();
    if (user.role === 'admin' || userPositionLower === 'manager') {
      return true;
    }

    const userPosition = trimmedPosition;
    // Normalize position for case-insensitive comparison
    const normalizedUserPosition =
      userPosition.length > 0
        ? userPosition.charAt(0).toUpperCase() + userPosition.slice(1).toLowerCase()
        : '';

    // Check requiredPosition
    if (requiredPosition) {
      if (Array.isArray(requiredPosition)) {
        return requiredPosition.some(pos => 
          (pos || '')
            .toString()
            .trim()
            .replace(/^./, c => c.toUpperCase())
            .toLowerCase() === normalizedUserPosition.toLowerCase()
        );
      }
      const normalizedRequired = (requiredPosition || '')
        .toString()
        .trim();
      return normalizedUserPosition.toLowerCase() === normalizedRequired.toLowerCase();
    }

    // Check allowedPositions
    if (allowedPositions) {
      return allowedPositions.some(pos => 
        pos.charAt(0).toUpperCase() + pos.slice(1).toLowerCase() === normalizedUserPosition
      );
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


