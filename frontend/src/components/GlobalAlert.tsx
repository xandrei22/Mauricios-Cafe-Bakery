import React from 'react';
import { useAlert } from '../contexts/AlertContext';
import LowStockAlert from './admin/LowStockAlert';

const GlobalAlert: React.FC = () => {
  const { showLowStockAlert, lowStockAlertData, setShowLowStockAlert } = useAlert();

  return (
    <LowStockAlert
      isOpen={showLowStockAlert}
      onClose={() => setShowLowStockAlert(false)}
      alert={lowStockAlertData}
    />
  );
};

export default GlobalAlert;
