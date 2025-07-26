import React, { useState } from 'react';
import type { User, Product } from '../../types';
import { mockCategories } from '../../data/mockData';

interface AddProductPageProps {
  user: User | null;
  setCurrentPage: (page: string) => void;
  setShowAuthModal: (show: boolean) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

interface ProductFormData {
  name: string;
  description: string;
  price_per_unit: string;
  stock_qty: string;
  category_id: string;
  image_url: string;
}

export const AddProductPage: React.FC<AddProductPageProps> = ({
  user,
  setCurrentPage,
  setShowAuthModal,
  products,
  setProducts
}) => {
  const [productData, setProductData] = useState<ProductFormData>({
    name: '',
    description: '',
    price_per_unit: '',
    stock_qty: '',
    category_id: '',
    image_url: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Mock product creation
    const newProduct: Product = {
      id: Date.now().toString(),
      name: productData.name,
      description: productData.description,
      price_per_unit: parseFloat(productData.price_per_unit),
      stock_qty: parseInt(productData.stock_qty),
      image_url: productData.image_url,
      category_id: parseInt(productData.category_id),
      category_name: mockCategories.find(c => c.id === parseInt(productData.category_id))?.name || '',
      seller_name: user.name,
      seller_company: user.name + ' Co.',
      seller_rating: user.rating || 4.5,
      seller_deliveries: user.total_deliveries,
      created_at: new Date().toISOString()
    };
    
    setProducts(prev => [...prev, newProduct]);
    alert('Product added successfully!');
    setCurrentPage('my-products');
  };

  if (!user || !user.is_supplier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">Only suppliers can add products</p>
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
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Add New Product</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                required
                value={productData.name}
                onChange={(e) => setProductData({...productData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={productData.description}
                onChange={(e) => setProductData({...productData, description: e.target.value})}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={productData.price_per_unit}
                  onChange={(e) => setProductData({...productData, price_per_unit: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  required
                  value={productData.stock_qty}
                  onChange={(e) => setProductData({...productData, stock_qty: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                value={productData.category_id}
                onChange={(e) => setProductData({...productData, category_id: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select Category</option>
                {mockCategories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="url"
                value={productData.image_url}
                onChange={(e) => setProductData({...productData, image_url: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold"
              >
                Add Product
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('seller-dashboard')}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};