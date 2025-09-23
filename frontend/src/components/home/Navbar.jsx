import React, { useState } from "react";
import { Link } from "react-router-dom";
import logoImg from "../../img/logo.png";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  const menuItems = [
    { text: "Home", icon: "🏠", id: "hero" },
    { text: "Features", icon: "✨", id: "features" },
    { text: "How It Works", icon: "⚡", id: "guide" },
    { text: "Partners", icon: "🤝", id: "companies" },
    { text: "Contact", icon: "📞", id: "contact" },
  ];

  return (
    <nav className="fixed w-full z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div className="flex items-center justify-between h-20 w-full px-8">
        <div className="flex items-center space-x-10">
          <div className="flex items-center">
            <button
              onClick={toggleMenu}
              className="md:hidden mr-4 text-gray-300 hover:text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            {/* User's custom logo image */}
            <div className="flex items-center space-x-3">
              <img src={logoImg} alt="ProductGuard Logo" className="h-24 md:h-28 lg:h-32 w-auto max-w-xs object-contain mr-4 shadow-lg" />
            </div>
          </div>
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center space-x-2 text-lg"
              >
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/login" className="no-underline">
            <button className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-lg shadow-primary-500/20">
              Login
            </button>
          </Link>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="w-full text-left px-3 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md flex items-center space-x-2 text-lg"
              >
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
