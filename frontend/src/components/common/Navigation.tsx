import React from 'react';
import { Search, ShoppingCart, Package, Menu, User, Settings, LogOut, Eye } from 'lucide-react';
import type { User as UserType, CartItem } from '../../types';

interface NavigationProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: UserType | null;
  cart: CartItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;
  setShowAuthModal: (show: boolean) => void;
  handleLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  setCurrentPage,
  user,
  cart,
  searchQuery,
  setSearchQuery,
  showMobileMenu,
  setShowMobileMenu,
  setShowAuthModal,
  handleLogout
}) => {
  return (
    <header className="bg-slate-800 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 
              className="text-2xl font-bold text-orange-500 cursor-pointer flex items-center gap-2"
              onClick={() => setCurrentPage('home')}
            >
              <Package className="w-8 h-8" />
              StreetSource
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <button 
              onClick={() => setCurrentPage('home')}
              className={`hover:text-orange-500 transition-colors ${currentPage === 'home' ? 'text-orange-500' : ''}`}
            >
              Home
            </button>
            <button 
              onClick={() => setCurrentPage('products')}
              className={`hover:text-orange-500 transition-colors ${currentPage === 'products' ? 'text-orange-500' : ''}`}
            >
              Products
            </button>
            {user && (
              <button 
                onClick={() => setCurrentPage('messages')}
                className={`hover:text-orange-500 transition-colors ${currentPage === 'messages' ? 'text-orange-500' : ''}`}
              >
                Messages
              </button>
            )}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700 text-white placeholder-slate-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <button
                  onClick={() => setCurrentPage('cart')}
                  className="relative hover:text-orange-500 transition-colors"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </button>
                <div className="relative group">
                  <button className="flex items-center space-x-2 hover:text-orange-500 transition-colors">
                    <User className="w-6 h-6" />
                    <span className="hidden md:block">{user.name}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <button
                      onClick={() => setCurrentPage('profile')}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <User className="w-4 h-4 inline mr-2" />
                      Profile
                    </button>
                    <button
                      onClick={() => setCurrentPage('settings')}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Settings className="w-4 h-4 inline mr-2" />
                      Settings
                    </button>
                    {user.is_supplier && (
                      <>
                        <button
                          onClick={() => setCurrentPage('seller-dashboard')}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          <Package className="w-4 h-4 inline mr-2" />
                          Seller Dashboard
                        </button>
                        <button
                          onClick={() => setCurrentPage('my-products')}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          <Eye className="w-4 h-4 inline mr-2" />
                          My Products
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setCurrentPage('orders')}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Package className="w-4 h-4 inline mr-2" />
                      Orders
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="block px-4 py-2 text-sm text-red-700 hover:bg-gray-100 w-full text-left"
                    >
                      <LogOut className="w-4 h-4 inline mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg transition-colors"
              >
                Login
              </button>
            )}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-slate-700 px-4 py-2 space-y-2">
          <button 
            onClick={() => {setCurrentPage('home'); setShowMobileMenu(false);}}
            className="block w-full text-left hover:text-orange-500"
          >
            Home
          </button>
          <button 
            onClick={() => {setCurrentPage('products'); setShowMobileMenu(false);}}
            className="block w-full text-left hover:text-orange-500"
          >
            Products
          </button>
          {user && (
            <button 
              onClick={() => {setCurrentPage('messages'); setShowMobileMenu(false);}}
              className="block w-full text-left hover:text-orange-500"
            >
              Messages
            </button>
          )}
          <div className="pt-2">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-600 text-white placeholder-slate-400 rounded px-3 py-2"
            />
          </div>
        </div>
      )}
    </header>
  );
};
