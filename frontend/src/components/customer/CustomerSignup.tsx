import { SignupForm } from "../ui/signup-form";
import { CustomerNavbar } from "../ui/CustomerNavbar";

export default function CustomerSignup() {
  return (
    <>
      <CustomerNavbar />
      <div className="min-h-screen flex items-center justify-center bg-[#f8ede3] pt-16 sm:pt-20 px-2 sm:px-4">
        <SignupForm />
      </div>
    </>
  );
} 