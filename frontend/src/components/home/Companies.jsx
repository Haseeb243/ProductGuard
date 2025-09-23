import React from "react";
import logosImg from "../../img/logos.png";
import starsImg from "../../img/Star.png";

const Companies = () => {
  return (
    <div id="companies" className="py-20 bg-gray-900 w-full">
      <div className="w-full px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            Trusted by Industry Leaders
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Join thousands of businesses that trust our platform for smart product protection and supply chain security.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="38" height="38" rx="10" fill="url(#paint0_linear)"/>
                  <g filter="url(#shadow)">
                    <rect x="9" y="9" width="20" height="20" rx="5" fill="#fff" fillOpacity="0.95"/>
                    <rect x="13" y="13" width="12" height="12" rx="3" fill="#38bdf8" fillOpacity="0.15"/>
                    <path d="M19 15L23 19L19 23L15 19L19 15Z" stroke="#2563EB" strokeWidth="1.5" fill="#fff"/>
                    <circle cx="19" cy="19" r="2.5" fill="#06B6D4" stroke="#2563EB" strokeWidth="1.2"/>
                    <rect x="11.5" y="11.5" width="15" height="15" rx="3.5" stroke="#06B6D4" strokeWidth="1.2"/>
                  </g>
                  <defs>
                    <linearGradient id="paint0_linear" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2563EB"/>
                      <stop offset="1" stopColor="#06B6D4"/>
                    </linearGradient>
                    <filter id="shadow" x="0" y="0" width="38" height="38" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#06B6D4" floodOpacity="0.15"/>
                    </filter>
                  </defs>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">ProductGuard</h3>
                <p className="text-gray-300">Smart Product Protection</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <img src={starsImg} alt="5 Star Rating" className="h-6" />
              <span className="text-gray-300 font-medium">5.0 Rating</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-300">2,000+ Reviews</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-300">45,000+ Protected Products</span>
            </div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-700">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-400 mb-2">98%</div>
                <div className="text-gray-300">Protection Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-400 mb-2">24/7</div>
                <div className="text-gray-300">Security Monitoring</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-400 mb-2">50+</div>
                <div className="text-gray-300">Countries Protected</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-400 mb-2">1M+</div>
                <div className="text-gray-300">Products Secured</div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mt-16">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-indigo-500/10 rounded-3xl transform -rotate-1"></div>
          <div className="relative bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6 text-center">
              Trusted by Industry Leaders
            </h3>
            <img
              src={logosImg}
              alt="Partner Companies"
              className="w-full max-w-4xl mx-auto opacity-75 hover:opacity-100 transition-opacity duration-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Companies;
