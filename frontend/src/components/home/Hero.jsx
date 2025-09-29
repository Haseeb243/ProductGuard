import React from "react";
import Navbar from "./Navbar";
import heroImg from "../../img/hero_illustration.png";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div id="hero" className="relative min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 w-full overflow-hidden">
      <Navbar />
      <div className="flex flex-col md:flex-row items-center justify-between w-full h-full px-8 pt-32 pb-12 gap-8">
        <div className="flex-1 z-10">
          <span className="inline-block px-4 py-2 bg-primary-500/10 text-primary-400 rounded-full text-sm font-semibold border border-primary-500/20 mb-6">
            Welcome to ProductGuard
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Protect Your Products with <span className="text-primary-400">Smart</span> Verification
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed mb-8">
            Our advanced product protection system ensures authenticity and builds trust through blockchain technology. Guard your brand and customers from counterfeiting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Link to="/verify">
              <button className="w-full sm:w-auto px-8 py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-primary-500/20">
                Verify Product
              </button>
            </Link>
            <Link to="/scanner">
              <button className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-primary-400 rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 transform hover:scale-105 shadow-lg border border-primary-500/20">
                Scan QR Code
              </button>
            </Link>
            <Link to="/login">
              <button className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 transform hover:scale-105 shadow-lg border border-gray-600/20">
                Login
              </button>
            </Link>
          </div>
          <div className="flex items-center space-x-8 pt-4">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-300">Smart Protection</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-300">Real-time Tracking</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-300">Anti-Counterfeit</span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-end relative z-10 w-full h-full">
          <div className="absolute -inset-8 bg-gradient-to-r from-primary-500/20 to-indigo-500/20 rounded-2xl opacity-50 blur-2xl"></div>
          <img
            src={heroImg}
            alt="Product Protection"
            className="relative w-full max-w-2xl md:max-w-3xl transform hover:scale-105 transition-transform duration-300 drop-shadow-2xl object-contain"
          />
        </div>
      </div>
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-indigo-500/10 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};

export default Hero;
