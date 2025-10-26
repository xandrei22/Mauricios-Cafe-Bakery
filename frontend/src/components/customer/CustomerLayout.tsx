import { SidebarProvider } from "../ui/sidebar";
import CustomerLayoutInner from "./CustomerLayoutInner";
import { AuthProvider } from "./AuthContext";

export default function CustomerLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AuthProvider>
        <CustomerLayoutInner>{children}</CustomerLayoutInner>
      </AuthProvider>
    </SidebarProvider>
  );
} 