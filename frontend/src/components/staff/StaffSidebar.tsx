import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
} from "../ui/sidebar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { mobileFriendlySwal } from '@/utils/sweetAlertConfig';
import { MoreVertical } from "lucide-react";

const menuItems = [
  { label: "Dashboard", path: "/staff/dashboard", icon: "/images/dashboard.png" },
  { label: "Manage Inventory", path: "/staff/inventory", icon: "/images/inventory.png" },
  { label: "Orders", path: "/staff/orders", icon: "/images/Orders.png" },
  { label: "POS System", path: "/staff/pos", icon: "/images/payment.png" },
  { label: "Loyalty", path: "/staff/loyalty", icon: "/images/loyalty points.png" },
  { label: "Reward Processing", path: "/staff/reward-processing", icon: "/images/loyalty points.png" },
  { label: "Sales", path: "/staff/sales", icon: "/images/payment.png" },
  { label: "Activity Logs", path: "/staff/activity-logs", icon: "/images/activity logs.png" },
];

const settingsItems = [
  { label: "Settings", path: "/staff/settings", icon: "/images/settings.png" },
  { label: "Logout", path: "/staff/logout", icon: "/images/logout.png", isLogout: true },
];

const StaffSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const storedStaff = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('staffUser') || '{}');
    } catch {
      return {};
    }
  }, []);

  const displayName =
    (typeof storedStaff?.username === 'string' && storedStaff.username.trim().length > 0
      ? storedStaff.username.trim()
      : typeof storedStaff?.name === 'string' && storedStaff.name.trim().length > 0
        ? storedStaff.name.trim()
        : typeof storedStaff?.email === 'string' && storedStaff.email.length > 0
          ? storedStaff.email.split('@')[0]
          : 'Staff');

  const displayEmail =
    (typeof storedStaff?.email === 'string' && storedStaff.email.length > 0)
      ? storedStaff.email
      : 'staff@example.com';

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    const result = await mobileFriendlySwal.confirm(
      'Are you sure?',
      'You will be logged out of the staff portal.',
      'Yes, logout!',
      'Cancel'
    );
    if (result.isConfirmed) {
      try {
        // Call staff logout API
        await fetch('/api/staff/logout', {
          method: 'POST',
          credentials: 'omit'
        });
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        // Clear all local storage and session storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Force page reload to clear any cached data
        window.location.href = '/staff/login';
      }
    }
  };

  return (
    <Sidebar collapsible="icon" className="w-64 bg-white border-r hidden sm:flex">
      <SidebarHeader className="bg-[#a87437] text-white h-14">
        <div className="flex flex-row items-center gap-1 h-full pl-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
          <div className="group-data-[collapsible=icon]:p-0.5">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center p-1 border border-white/80 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <img 
                src="/images/mau-removebg-preview.png" 
                alt="Mauricio's Cafe and Bakery Logo" 
                className="h-8 w-8 object-contain group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6"
              />
            </div>
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="font-bold text-xs text-white">Mauricio's</div>
            <div className="text-xs text-white/90 leading-none">Cafe and Bakery</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="pl-3 group-data-[collapsible=icon]:pl-3 flex flex-col">
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === item.path}
                >
                  <Link to={item.path} className="flex items-center gap-2">
                    <img 
                      src={item.icon} 
                      alt={item.label + ' icon'} 
                      className={`w-5 h-5 ${location.pathname === item.path ? 'brightness-0 sepia saturate-[3] hue-rotate-[25deg]' : ''}`}
                    />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        
      </SidebarContent>
      <SidebarGroup className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Settings</SidebarGroupLabel>
        <SidebarMenu className="pl-3 group-data-[collapsible=icon]:pl-3 flex flex-col">
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === item.path}
              >
                {item.isLogout ? (
                  <a href="#" onClick={handleLogout} className="flex items-center gap-2 text-red-600">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </a>
                ) : (
                  <Link to={item.path} className="flex items-center gap-2">
                    <svg className={`w-5 h-5 ${location.pathname === item.path ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
      <SidebarFooter className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
        <div className="bg-white rounded-lg p-4 text-[#6B5B5B] border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#a87437] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-[#6B5B5B]">{displayName}</span>
              <span className="text-xs text-[#6B5B5B]/70">{displayEmail}</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default StaffSidebar;
