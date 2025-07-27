import React, { useState } from 'react';
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

// Hooks and Data
import { useAuth } from './hooks/useAuth';
import { mockProducts } from './data/mockData';

// Types
import type { Product, CartItem, Order } from './types';

const StreetSourceApp: React.FC = () => {
  const { user, setUser, handleLogin, handleRegister, handleLogout } = useAuth();
  
  const [currentPage, setCurrentPage] = useState('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [sortBy, setSortBy] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  // Cart Functions
  const addToCart = (product: Product, quantity = 1) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price_per_unit: product.price_per_unit,
        quantity: quantity,
        image_url: product.image_url,
        seller_name: product.seller_name,
        available_stock: product.stock_qty
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.product_id === productId
        ? { ...item, quantity: quantity }
        : item
    ));
  };

  const onLogout = () => {
    handleLogout();
    setCurrentPage('home');
    setCart([]);
  };

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
            setOrders={setOrders}
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
        onLogin={async (credentials) => { await handleLogin(credentials); }}
        onRegister={async (userData) => { await handleRegister(userData); }}
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
