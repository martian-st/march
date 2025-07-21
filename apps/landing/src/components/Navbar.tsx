"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';
import { FaGithub, FaDiscord } from 'react-icons/fa';

// Font class for the logo
const logoFont = {
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  fontWeight: 700,
  letterSpacing: '-0.02em',
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { 
      name: 'GitHub', 
      href: 'https://github.com',
      icon: <FaGithub size={20} className="text-gray-600 hover:text-gray-900" />,
      external: true
    },
    { 
      name: 'Discord', 
      href: 'https://discord.gg',
      icon: <FaDiscord size={20} className="text-gray-600 hover:text-gray-900" />,
      external: true
    },
  ];

  return (
    <nav 
      className={`fixed w-full z-50 bg-white transition-all ${
        scrolled ? 'border-b border-gray-200' : 'border-b-0'
      }`}
      style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="w-full max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-xl font-bold text-gray-900"
            style={logoFont}
          >
            March
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name + link.href}
                href={link.href}
                target={link.external ? "_blank" : "_self"}
                rel={link.external ? "noopener noreferrer" : ""}
                className={`flex items-center ${
                  link.name === 'GitHub' 
                    ? 'text-gray-900 font-semibold' 
                    : 'text-gray-600 hover:text-gray-900'
                } transition-colors`}
              >
                {link.icon || link.name}
              </Link>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <div className="flex items-center space-x-6 ml-2">
              <Link 
                href="/login" 
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none p-2 -mr-2"
            >
              {isOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-4 py-2.5 text-sm font-medium rounded ${
                    link.name === 'GitHub' 
                      ? 'bg-gray-100 text-gray-900 font-semibold' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-2 mt-1 border-t border-gray-100">
                <Link
                  href="/login"
                  className="block w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="block w-full text-left px-4 py-2.5 mt-1 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-900"
                  onClick={() => setIsOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
