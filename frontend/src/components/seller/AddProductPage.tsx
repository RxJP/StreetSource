import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { apiClient } from '../../services/api';
import type { User, Product, CreateProductRequest, Category } from '../../types';

interface AddProductPageProps {
  user: User | null;
  setCurrentPage: (page: string) => void;
  setShowAuthModal: (show: boolean) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export const AddProductPage: React.FC<AddProductPageProps> = ({
  user,
  setCurrentPage,
  setShowAuthModal,
  products,
  setProducts
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productData, setProductData] = useState<CreateProductRequest>({
    name: '',
    description: '',
    price_per_unit: 0,
    stock_qty: 0,
    category_id: 0,
    image_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      setCategoriesError(null);
      try {
        // Use the dedicated categories API endpoint
        const response = await apiClient.getCategories();
        setCategories(response.categories);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategoriesError('Failed to load categories from API');
        
        // Fallback: try extracting categories from products
        try {
          const productsResponse = await apiClient.getProducts({ limit: 100 });
          
          // Extract unique categories from products
          const uniqueCategories = productsResponse.products.reduce((acc: Category[], product) => {
            if (!acc.find(cat => cat.id === product.category_id)) {
              acc.push({
                id: product.category_id,
                name: product.category_name
              });
            }
            return acc;
          }, []);
          
          setCategories(uniqueCategories);
          setCategoriesError('Using categories from products (API unavailable)');
        } catch (fallbackError) {
          console.error('Failed to load categories from products:', fallbackError);
          // If both API and fallback fail, provide default categories
          setCategoriesError('Using default categories (API unavailable)');
          setCategories([
            { id: 1, name: 'Grains & Rice' },
            { id: 2, name: 'Fresh Vegetables' },
            { id: 3, name: 'Spices & Masalas' },
            { id: 4, name: 'Cooking Oils' },
            { id: 5, name: 'Meat & Poultry' },
            { id: 6, name: 'Dairy Products' }
          ]);
        }
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !user.is_supplier) {
      setShowAuthModal(true);
      return;
    }

    if (productData.category_id === 0) {
      alert('Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.createProduct(productData);
      
      // Reload products to get the new product
      const productsResponse = await apiClient.getProducts();
      setProducts(productsResponse.products);
      
      alert('Product added successfully!');
      setCurrentPage('my-products');
    } catch (error: any) {
      alert(error.message || 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const response = await apiClient.uploadProductImage(file);
      setProductData(prev => ({ ...prev, image_url: response.image_url }));
      alert('Image uploaded successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
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

  if (loadingCategories) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Add New Product</h1>
        
        {categoriesError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">{categoriesError}</p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                required
                value={productData.name}
                onChange={(e) => setProductData({...productData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={productData.description}
                onChange={(e) => setProductData({...productData, description: e.target.value})}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={productData.price_per_unit || ''}
                  onChange={(e) => setProductData({...productData, price_per_unit: parseFloat(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={productData.stock_qty || ''}
                  onChange={(e) => setProductData({...productData, stock_qty: parseInt(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                value={productData.category_id}
                onChange={(e) => setProductData({...productData, category_id: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-800"
              >
                <option value={0}>Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="text-sm text-red-600 mt-1">No categories available. Please try refreshing the page.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  <span className="text-sm text-gray-500">Or enter URL below</span>
                </div>
                <input
                  type="url"
                  value={productData.image_url}
                  onChange={(e) => setProductData({...productData, image_url: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-800"
                  placeholder="https://example.com/image.jpg"
                />
                {productData.image_url && (
                  <div className="mt-2">
                    <img 
                      src={productData.image_url} 
                      alt="Product preview" 
                      className="w-32 h-32 object-cover rounded-lg border"
                      onError={() => setProductData(prev => ({...prev, image_url: ''}))}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting || isUploading || categories.length === 0}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold"
              >
                {isSubmitting ? 'Adding Product...' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('seller-dashboard')}
                disabled={isSubmitting}
                className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold"
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