import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MagnifyingGlassIcon, BuildingOfficeIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const Header: React.FC = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Query', href: '/', icon: MagnifyingGlassIcon },
    { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
    { name: 'About', href: '/about', icon: InformationCircleIcon },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <MagnifyingGlassIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  SEC EDGAR Query
                </span>
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;