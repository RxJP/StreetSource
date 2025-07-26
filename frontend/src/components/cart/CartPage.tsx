import React from 'react';
import { ShoppingCart, Trash2 } from 'lucide-react';
import type { User, CartItem, Order } from '../../types';

interface CartPageProps {
  user: User | null;
  cart: CartItem[];
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setCurrentPage: (page: string) => void;
  setShowAuthModal: (show: boolean) => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  user,
  cart,
  removeFromCart,
  updateCartQuantity,
  setCart,
  setOrders,
  setCurrentPage,
  setShowAuthModal
}) => {
  const total = cart.reduce((sum, item) => sum + (item.price_per_unit * item.quantity), 0);

  const handleCheckout = () => {
    // Mock checkout
    setOrders(prev => [...prev, {
      id: Date.now().toString(),
      seller_name: 'Various Sellers', // In real app, group by seller
      status: 'pending',
      total_price: total,
      created_at: new Date().toISOString(),
      items: cart.map(item => ({
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price_per_unit,
        image_url: item.image_url
      }))
    }]);
    setCart([]);
    alert('Order placed successfully!');
    setCurrentPage('orders');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to view your cart</h2>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Shopping Cart</h1>
        
        {cart.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-600 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add some products to get started</p>
            <button
              onClick={() => setCurrentPage('products')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
            >
              Shop Products
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {cart.map(item => (
              <div key={item.product_id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-4">
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="text-gray-600">by {item.seller_name}</p>
                    <p className="text-lg font-bold text-orange-600">₹{item.price_per_unit}/unit</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{(item.price_per_unit * item.quantity).toFixed(2)}</p>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-red-500 hover:text-red-700 mt-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-2xl font-bold">Total: ₹{total.toFixed(2)}</span>
                <button
                  onClick={handleCheckout}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold"
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
