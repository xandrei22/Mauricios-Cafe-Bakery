import { LoginForm } from "../../components/ui/login-form";
import { CustomerNavbar } from "../ui/CustomerNavbar";

export default function CustomerLogin() {
  return (
    <>
      <CustomerNavbar />
      <div className="min-h-screen flex items-center justify-center bg-[#f8ede3] pt-20">
        <LoginForm />
      </div>
    </>
  );
} 