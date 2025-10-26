import AdminSidebar from './AdminSidebar';
import StaffSidebar from '../staff/StaffSidebar';
import AdminNavbar from './AdminNavbar';
import StaffNavbar from '../staff/StaffNavbar';
import GlobalAlert from '../GlobalAlert';
import { Outlet, useLocation } from 'react-router-dom';
import React from 'react';
import { SidebarProvider } from '../ui/sidebar';

/**
 * AdminLayout provides the sidebar and navbar for all admin dashboard pages.
 * It uses nested routing to render child routes in the main content area.
 */
const AdminLayout: React.FC = () => {
  const location = useLocation();
  
  // If on /admin or /admin/ exactly, render only the Outlet (AdminLanding)
  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    return <Outlet />;
  }
  
  // If on /staff exactly, render only the Outlet (StaffLanding)
  if (location.pathname === '/staff' || location.pathname === '/staff/') {
    return <Outlet />;
  }
  
  // If on staff routes, use StaffSidebar and StaffNavbar, otherwise use AdminSidebar and AdminNavbar
  const isStaffRoute = location.pathname.startsWith('/staff');
  const SidebarComponent = isStaffRoute ? StaffSidebar : AdminSidebar;
  const NavbarComponent = isStaffRoute ? StaffNavbar : AdminNavbar;
  
  return (
    <SidebarProvider>
      <div className="flex w-full h-screen bg-[#f5f5f5]">
        <SidebarComponent />
        <div className="flex-1 flex flex-col w-full sm:ml-0 overflow-hidden">
          <NavbarComponent />
          <main className="flex-1 w-full pt-16 lg:pt-16 md:pt-16 sm:pt-16 overflow-y-auto bg-[#f5f5f5]">
            <div className="w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <GlobalAlert />
    </SidebarProvider>
  );
};

export default AdminLayout; 