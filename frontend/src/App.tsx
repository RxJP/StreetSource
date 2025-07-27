import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';

// Components
import { Navigation } from './components/common/Navigation';
import { AuthModal } from './components/auth/AuthModal';
import { HomePage } from './components/home/HomePage';
import { ProductsPage } from './components/products/ProductsPage';
import { CartPage } from './components/cart/CartPage';
import { MessagesPage } from './components/messages/MessagesPage';
import { OrdersPage } from './components/orders/OrdersPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { SettingsPage } from './components/profile/SettingsPage';
import { SellerDashboard } from './components/seller/SellerDashboard';
import { AddProductPage } from './components/seller/AddProductPage';
import { MyProductsPage } from './components/seller/MyProductsPage';

// Hooks and Services
import { useAuth } from './hooks/useAuth';
import { apiClient } from './services/api';

// Types
import type { Product, CartItem } from './types';

const StreetSourceApp: React.FC = () => {
  const { user, setUser, loading, handleLogin, handleRegister, handleLogout } = useAuth();
  
  const [currentPage, setCurrentPage] = useState('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [sortBy, setSortBy] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Load products on app start
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await apiClient.getProducts();
        setProducts(response.products);
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };

    loadProducts();
  }, []);

  // Load cart when user logs in
  useEffect(() => {
    const loadCart = async () => {
      if (user) {
        try {
          const response = await apiClient.getCart();
          setCart(response.items);
        } catch (error) {
          console.error('Failed to load cart:', error);
          setCart([]);
        }
      } else {
        setCart([]);
      }
    };

    loadCart();
  }, [user]);

  // Cart Functions
  const addToCart = async (product: Product, quantity = 1) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    try {
      await apiClient.addToCart(product.id, quantity);
      // Reload cart after adding item
      const response = await apiClient.getCart();
      setCart(response.items);
    } catch (error: any) {
      alert(error.message || 'Failed to add item to cart');
    }
  };

  const removeFromCart = async (productId: string) => {
    try {
      await apiClient.removeFromCart(productId);
      // Reload cart after removing item
      const response = await apiClient.getCart();
      setCart(response.items);
    } catch (error: any) {
      alert(error.message || 'Failed to remove item from cart');
    }
  };

  const updateCartQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    
    try {
      // Remove all items first, then add the new quantity
      await apiClient.removeFromCart(productId);
      await apiClient.addToCart(productId, quantity);
      // Reload cart
      const response = await apiClient.getCart();
      setCart(response.items);
    } catch (error: any) {
      alert(error.message || 'Failed to update cart');
    }
  };

  const onLogout = async () => {
    await handleLogout();
    setCurrentPage('home');
    setCart([]);
  };

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Package className="w-8 h-8 text-orange-400 animate-spin" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  const renderCurrentPage = () => {
    const commonProps = {
      user,
      setUser,
      currentPage,
      setCurrentPage,
      setShowAuthModal
    };

    switch (currentPage) {
      case 'home':
        return (
          <HomePage 
            {...commonProps}
            setSelectedCategory={setSelectedCategory}
            products={products}
            addToCart={addToCart}
          />
        );
      case 'products':
        return (
          <ProductsPage
            {...commonProps}
            products={products}
            setProducts={setProducts}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            sortBy={sortBy}
            setSortBy={setSortBy}
            addToCart={addToCart}
          />
        );
      case 'cart':
        return (
          <CartPage
            {...commonProps}
            cart={cart}
            removeFromCart={removeFromCart}
            updateCartQuantity={updateCartQuantity}
            setCart={setCart}
          />
        );
      case 'messages':
        return <MessagesPage {...commonProps} />;
      case 'orders':
        return <OrdersPage {...commonProps} />;
      case 'profile':
        return <ProfilePage {...commonProps} />;
      case 'settings':
        return <SettingsPage {...commonProps} />;
      case 'seller-dashboard':
        return <SellerDashboard {...commonProps} />;
      case 'add-product':
        return (
          <AddProductPage
            {...commonProps}
            products={products}
            setProducts={setProducts}
          />
        );
      case 'my-products':
        return (
          <MyProductsPage
            {...commonProps}
            products={products}
            setProducts={setProducts}
          />
        );
      default:
        return (
          <HomePage 
            {...commonProps}
            setSelectedCategory={setSelectedCategory}
            products={products}
            addToCart={addToCart}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        user={user}
        cart={cart}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        setShowAuthModal={setShowAuthModal}
        handleLogout={onLogout}
      />
      
      {renderCurrentPage()}
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={async (credentials) => { 
          try {
            await handleLogin(credentials);
            setShowAuthModal(false);
          } catch (error: any) {
            alert(error.message);
          }
        }}
        onRegister={async (userData) => { 
          try {
            await handleRegister(userData);
            setShowAuthModal(false);
          } catch (error: any) {
            alert(error.message);
          }
        }}
      />
      
      {/* Footer */}
      <footer className="bg-slate-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Package className="w-8 h-8 text-orange-400" />
            <h3 className="text-2xl font-bold text-orange-400">StreetSource</h3>
          </div>
          <p className="text-gray-400">
            © 2024 StreetSource. Empowering street food vendors with quality ingredients.
          </p>
          <div className="flex justify-center space-x-6 mt-4">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">About</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StreetSourceApp;