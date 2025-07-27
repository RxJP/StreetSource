import React, { useEffect, useState } from 'react';
import { Plus, Package, DollarSign, Star, ShoppingBag } from 'lucide-react';
import { apiClient } from '../../services/api';
import type { User, Order } from '../../types';

interface SellerDashboardProps {
  user: User | null;
  setCurrentPage: (page: string) => void;
  setShowAuthModal: (show: boolean) => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  user,
  setCurrentPage,
  setShowAuthModal
}) => {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeListings: 0,
    totalSales: 0,
    averageRating: 0,
    totalOrders: 0
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user || !user.is_supplier) {
        setLoading(false);
        return;
      }

      try {
        // Load pending orders
        const ordersResponse = await apiClient.getPendingOrders();
        setPendingOrders(ordersResponse.orders);

        // Load products to get active listings count
        const productsResponse = await apiClient.getProducts();
        const myProducts = productsResponse.products.filter(p => p.seller_id === user.id);
        
        // Calculate stats
        setStats({
          activeListings: myProducts.length,
          totalSales: 45670, // Mock data - would be calculated from orders
          averageRating: user.rating || 4.7,
          totalOrders: user.total_deliveries || 156
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleOrderAction = async (orderId: string, action: 'shipped' | 'delivered') => {
    try {
      await apiClient.updateOrderStatus(orderId, action);
      // Update local state
      setPendingOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: action }
            : order
        ).filter(order => order.status === 'pending')
      );
      alert(`Order ${action} successfully!`);
    } catch (error: any) {
      alert(error.message || `Failed to update order status`);
    }
  };

  if (!user || !user.is_supplier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">Only suppliers can access this dashboard</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
          >
            Login as Supplier
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-lg">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Seller Dashboard</h1>
          <button
            onClick={() => setCurrentPage('add-product')}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeListings}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalSales.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => setCurrentPage('add-product')}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-400">Add New Product</h3>
                <p className="text-sm text-gray-300">List a new product for sale</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentPage('my-products')}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-400">Manage Products</h3>
                <p className="text-sm text-gray-300">Edit or remove your listings</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentPage('orders')}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-400">View Orders</h3>
                <p className="text-sm text-gray-300">Check pending and completed orders</p>
              </div>
            </div>
          </button>
        </div>

        {/* Pending Orders */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Pending Orders</h2>
          </div>
          <div className="p-6">
            {pendingOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending orders</p>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map(order => (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-800">Order #{order.id}</h3>
                        <p className="text-sm text-gray-600">
                          From: {order.buyer_name || 'Unknown Buyer'}
                        </p>
                        {order.buyer_phone && (
                          <p className="text-sm text-gray-600">
                            Phone: {order.buyer_phone}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800">₹{order.total_price.toFixed(2)}</p>
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-800">
                            {item.product_name} × {item.quantity}
                          </span>
                          <span className="text-sm font-medium">
                            ₹{(item.quantity * item.unit_price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleOrderAction(order.id, 'shipped')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                      >
                        Mark as Shipped
                      </button>
                      <button 
                        onClick={() => handleOrderAction(order.id, 'delivered')}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
                      >
                        Mark as Delivered
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};