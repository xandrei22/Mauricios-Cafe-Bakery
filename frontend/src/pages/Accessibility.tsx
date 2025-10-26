import React from "react";

function Accessibility() {
  return (
    <main className="min-h-[60vh] bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#3F3532] mb-4">Accessibility</h1>
        <p className="text-sm text-gray-500 mb-8">Our commitment to inclusive access</p>

        <section className="space-y-4 text-[#3F3532]/90 leading-relaxed">
          <p>
            We strive to make our website and services accessible to everyone,
            including people with disabilities. Our goal is WCAG 2.1 AA alignment.
          </p>

          <h2 className="text-xl font-semibold mt-6">Features</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Semantic HTML and keyboard navigability.</li>
            <li>Contrast-aware color palette and focus styles.</li>
            <li>Meaningful alt text for images and labels for inputs.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6">Feedback</h2>
          <p>
            If you encounter barriers, please email us at
            {" "}
            <a className="text-[#a87437] underline" href="mailto:maurioscb23@gmail.com">maurioscb23@gmail.com</a>
            {" "}with a description of the issue and the page URL.
          </p>
        </section>
      </div>
    </main>
  );
}

export default Accessibility;


















































