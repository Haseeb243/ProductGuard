import React from "react";
import { Link } from "react-router-dom";

const Guide = () => {
  const guides = [
    {
      title: "Product Registration",
      description: "Register your products with unique identifiers and blockchain verification.",
      icon: "📝",
    },
    {
      title: "QR Code Generation",
      description: "Generate secure QR codes for each product with encrypted data.",
      icon: "🔐",
    },
    {
      title: "Verification Process",
      description: "Scan QR codes to verify product authenticity in real-time.",
      icon: "✅",
    },
    {
      title: "Supply Chain Tracking",
      description: "Track your products throughout the entire supply chain.",
      icon: "📊",
    },
  ];

  return (
    <div id="guide" className="py-20 bg-gray-900 w-full">
      <div className="w-full px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            How ProductGuard Works
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Our advanced product protection system ensures authenticity and builds trust through blockchain technology.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {guides.map((guide, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-2xl p-8 border border-gray-700 hover:border-primary-500/50 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-primary-500/10 rounded-lg flex items-center justify-center mb-6 text-2xl">
                {guide.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{guide.title}</h3>
              <p className="text-gray-300">{guide.description}</p>
            </div>
          ))}
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-indigo-500/10 rounded-3xl transform -rotate-1"></div>
          <div className="relative bg-gray-800 rounded-3xl p-8 md:p-12 border border-gray-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 space-y-4">
                <h3 className="text-2xl font-bold text-white">
                  Ready to Protect Your Products?
                </h3>
                <p className="text-gray-300">
                  Join thousands of businesses that trust ProductGuard for their product protection needs.
                </p>
              </div>
              <Link to="/login" className="no-underline">
                <button className="w-full md:w-auto px-8 py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-primary-500/20">
                  Get Started Now
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide;
