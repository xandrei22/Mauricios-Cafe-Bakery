import React from "react";

function PrivacyPolicy() {
  return (
    <main className="min-h-[60vh] bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#3F3532] mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: September 30, 2025</p>

        <section className="space-y-4 text-[#3F3532]/90 leading-relaxed">
          <p>
            We value your privacy. This policy explains what data we collect, why we
            collect it, and how we use and safeguard it.
          </p>

          <h2 className="text-xl font-semibold mt-6">Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account details such as name, email, and phone number when you sign up.</li>
            <li>Order information including items purchased, totals, and payment status.</li>
            <li>Technical data such as device, browser, and approximate location.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">How We Use Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To fulfill orders and provide customer support.</li>
            <li>To improve our menu, services, and site performance.</li>
            <li>To send important account, security, and order notifications.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Sharing</h2>
          <p>
            We do not sell your personal information. We may share necessary data with
            service providers (e.g., payments, hosting) under strict confidentiality
            agreements.
          </p>

          <h2 className="text-xl font-semibold mt-6">Your Choices</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Update your account details in settings.</li>
            <li>Request access, correction, or deletion of your data.</li>
            <li>Opt out of non-essential emails by using unsubscribe links.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Contact Us</h2>
          <p>
            For privacy questions, contact us at <a className="text-[#a87437] underline" href="mailto:maurioscb23@gmail.com">maurioscb23@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}

export default PrivacyPolicy;


















































