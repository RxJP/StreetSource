import React from 'react';
import { Package } from 'lucide-react';
import type { User } from '../../types';

interface OrdersPageProps {
  user: User | null;
  setCurrentPage: (page: string) => void;
  setShowAuthModal: (show: boolean) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  user,
  setCurrentPage,
  setShowAuthModal
}) => {
  const mockOrders = [
    {
      id: '1',
      seller_name: 'Rajesh Kumar',
      status: 'delivered' as const,
      total_price: 427.50,
      created_at: '2024-01-15T10:30:00Z',
      items: [
        {
          product_name: 'Premium Basmati Rice',
          quantity: 5,
          unit_price: 85.50,
          image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400'
        }
      ]
    },
    {
      id: '2',
      seller_name: 'Spice Master',
      status: 'shipped' as const,
      total_price: 360.00,
      created_at: '2024-01-18T14:20:00Z',
      items: [
        {
          product_name: 'Garam Masala Powder',
          quantity: 2,
          unit_price: 180.00,
          image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400'
        }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to view orders</h2>
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
        <h1 className="text-3xl font-bold mb-8 text-gray-800">My Orders</h1>
        
        {mockOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-600 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
            <button
              onClick={() => setCurrentPage('products')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
            >
              Shop Products
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {mockOrders.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-600">Order #{order.id}</h3>
                    <p className="text-gray-600">From {order.seller_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <p className="text-lg font-bold text-gray-800 mt-2">₹{order.total_price}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 mb-2">
                      <img 
                        src={item.image_url} 
                        alt={item.product_name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-600">{item.product_name}</p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity} × ₹{item.unit_price} = ₹{(item.quantity * item.unit_price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
