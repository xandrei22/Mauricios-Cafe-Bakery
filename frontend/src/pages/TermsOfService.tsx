import React from "react";

function TermsOfService() {
  return (
    <main className="min-h-[60vh] bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#3F3532] mb-4">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: September 30, 2025</p>

        <section className="space-y-4 text-[#3F3532]/90 leading-relaxed">
          <p>
            By using our website and services, you agree to these Terms. Please read
            them carefully.
          </p>

          <h2 className="text-xl font-semibold mt-6">Use of Service</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You must provide accurate account information.</li>
            <li>Do not misuse the service or attempt to disrupt operations.</li>
            <li>Comply with applicable laws and regulations.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Orders and Payments</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>All orders are subject to availability and confirmation.</li>
            <li>Prices may change; totals are confirmed at checkout.</li>
            <li>Refunds and cancellations follow our store policies.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Intellectual Property</h2>
          <p>All content, logos, and trademarks are owned by Mauricio&apos;s or licensors.</p>

          <h2 className="text-xl font-semibold mt-6">Limitation of Liability</h2>
          <p>
            To the extent permitted by law, we are not liable for indirect or
            consequential damages arising from the use of our services.
          </p>

          <h2 className="text-xl font-semibold mt-6">Changes</h2>
          <p>
            We may update these Terms from time to time. Material changes will be
            posted on this page.
          </p>
        </section>
      </div>
    </main>
  );
}

export default TermsOfService;


































