import { Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarGroup, SidebarGroupLabel, SidebarFooter, useSidebar } from "../ui/sidebar";
import {
  LayoutDashboard,
  List,
  ShoppingCart,
  Calendar,
  Star,
  Settings,
  LogOut,
  User,
  MessageCircle,
} from "lucide-react";
import CustomerDashboardNavbar from "./CustomerDashboardNavbar";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { mobileFriendlySwal } from '@/utils/sweetAlertConfig';
import AIChatbot from "./AIChatbot";
import { useEffect } from "react";

export default function CustomerLayoutInner({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authenticated, loading } = useAuth();

  // Helper function to preserve table parameter in navigation
  const getUrlWithTableParam = (path: string) => {
    const urlParams = new URLSearchParams(location.search);
    const tableFromUrl = urlParams.get('table');
    return tableFromUrl ? `${path}?table=${tableFromUrl}` : path;
  };

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!loading && !authenticated) {
      // Get table parameter from current URL if present
      const urlParams = new URLSearchParams(location.search);
      const tableFromUrl = urlParams.get('table');
      
      // Redirect to login with table parameter preserved
      if (tableFromUrl) {
        navigate(`/login?table=${tableFromUrl}`);
      } else {
        navigate('/login');
      }
    }
  }, [authenticated, loading, location.search]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!authenticated) {
    return null;
  }

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    const result = await mobileFriendlySwal.confirm(
      'Are you sure?',
      'You will be logged out of your account.',
      'Yes, logout!',
      'Cancel'
    );
    if (result.isConfirmed) {
      await fetch('/api/customer/logout', { method: 'POST', credentials: 'include' });
      navigate('/');
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-[#f5f5f5]">
      <Sidebar collapsible="icon" className="w-64 bg-white border-r hidden sm:flex">
        <SidebarHeader className="bg-[#a87437] text-white h-14">
          <div
            className="
            flex flex-row items-center gap-1 h-full pl-2
            group-data-[collapsible=icon]:flex-col
            group-data-[collapsible=icon]:items-center
            group-data-[collapsible=icon]:justify-center
            group-data-[collapsible=icon]:pl-0
          "
          >
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/customer/dashboard'}>
                  <Link to={getUrlWithTableParam('/customer/dashboard')} className="flex items-center gap-2"><LayoutDashboard className="w-5 h-5" /> Dashboard</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/customer/menu'}>
                  <Link to={getUrlWithTableParam('/customer/menu')} className="flex items-center gap-2"><List className="w-5 h-5" /> Menu</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/customer/orders'}>
                  <Link to={getUrlWithTableParam('/customer/orders')} className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Orders</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/customer/events'}>
                  <Link to={getUrlWithTableParam('/customer/events')} className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Events</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/customer/loyalty'}>
                  <Link to={getUrlWithTableParam('/customer/loyalty')} className="flex items-center gap-2"><Star className="w-5 h-5" /> Loyalty Points</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/customer/feedback'}>
                  <Link to={getUrlWithTableParam('/customer/feedback')} className="flex items-center gap-2"><MessageCircle className="w-5 h-5" /> Feedback</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Settings</SidebarGroupLabel>
          <SidebarMenu className="pl-3 group-data-[collapsible=icon]:pl-3 flex flex-col">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === '/customer/settings'}>
                <Link to={getUrlWithTableParam('/customer/settings')} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="#" onClick={handleLogout} className="flex items-center gap-2 text-red-600">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarFooter className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
          <div className="bg-white rounded-lg p-4 text-[#6B5B5B] border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#a87437] rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-[#6B5B5B]">{user?.name || "Customer"}</span>
                <span className="text-xs text-[#6B5B5B]/70">{user?.email || "customer@example.com"}</span>
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="flex-1 flex flex-col w-full min-h-screen sm:ml-0">
        <CustomerDashboardNavbar customer_id={user?.id} />
        <main className="flex-1 w-full min-h-0 pt-16 bg-[#f5f5f5]">
          <div className="w-full h-full overflow-x-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* AI Chatbot - per-user session */}
      <AIChatbot onClose={() => {}} userId={user?.id || null} />
    </div>
  );
} 