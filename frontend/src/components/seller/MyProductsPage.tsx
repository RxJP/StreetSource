import React from 'react';
import { Plus, Package, Edit, Trash2 } from 'lucide-react';
import type { User, Product } from '../../types';

interface MyProductsPageProps {
  user: User | null;
  setCurrentPage: (page: string) => void;
  setShowAuthModal: (show: boolean) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export const MyProductsPage: React.FC<MyProductsPageProps> = ({
  user,
  setCurrentPage,
  setShowAuthModal,
  products,
  setProducts
}) => {
  const myProducts = products.filter(product => 
    user && user.is_supplier && product.seller_name === user.name
  );

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setProducts(prev => prev.filter(product => product.id !== productId));
      alert('Product deleted successfully!');
    }
  };

  if (!user || !user.is_supplier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">Only suppliers can view this page</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Products</h1>
          <button
            onClick={() => setCurrentPage('add-product')}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
        
        {myProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-600 mb-2">No products listed</h2>
            <p className="text-gray-500 mb-6">Start by adding your first product</p>
            <button
              onClick={() => setCurrentPage('add-product')}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg"
            >
              Add Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myProducts.map(product => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2 text-gray-600">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-orange-600">₹{product.price_per_unit}/unit</span>
                    <span className="text-sm text-gray-500">Stock: {product.stock_qty}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center justify-center gap-2">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};