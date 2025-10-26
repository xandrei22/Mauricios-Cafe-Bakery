import Swal from 'sweetalert2';

// Mobile-friendly SweetAlert2 configuration
export const mobileFriendlySwal = {
  // Default configuration for all alerts
  defaultConfig: {
    customClass: {
      popup: 'mobile-friendly-popup',
      actions: 'mobile-friendly-actions',
      confirmButton: 'mobile-friendly-confirm',
      cancelButton: 'mobile-friendly-cancel',
    },
    buttonsStyling: false,
    allowOutsideClick: true,
    allowEscapeKey: true,
    focusConfirm: false,
    focusCancel: false,
    showCloseButton: true,
    heightAuto: true,
    width: 'auto',
    padding: '1rem',
  },

  // Success alert
  success: (title: string, text?: string) => {
    return Swal.fire({
      ...mobileFriendlySwal.defaultConfig,
      icon: 'success',
      title,
      text,
      confirmButtonText: 'OK',
      confirmButtonColor: '#10b981',
    });
  },

  // Error alert
  error: (title: string, text?: string) => {
    return Swal.fire({
      ...mobileFriendlySwal.defaultConfig,
      icon: 'error',
      title,
      text,
      confirmButtonText: 'OK',
      confirmButtonColor: '#ef4444',
    });
  },

  // Warning alert
  warning: (title: string, text?: string) => {
    return Swal.fire({
      ...mobileFriendlySwal.defaultConfig,
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'OK',
      confirmButtonColor: '#f59e0b',
    });
  },

  // Confirmation dialog
  confirm: (title: string, text?: string, confirmText = 'Yes', cancelText = 'No') => {
    return Swal.fire({
      ...mobileFriendlySwal.defaultConfig,
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      reverseButtons: false, // Cancel first, then Confirm (but we'll use CSS order instead)
      buttonsStyling: true,
      allowOutsideClick: true,
      allowEscapeKey: true,
    });
  },

  // Toast notification
  toast: (icon: 'success' | 'error' | 'warning' | 'info', title: string, timer = 3000) => {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer,
      timerProgressBar: true,
      customClass: {
        popup: 'mobile-friendly-toast',
      },
    });
  },

  // Loading alert
  loading: (title: string, text?: string) => {
    return Swal.fire({
      ...mobileFriendlySwal.defaultConfig,
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  // Close any open alert
  close: () => {
    Swal.close();
  },
};

export default mobileFriendlySwal;
