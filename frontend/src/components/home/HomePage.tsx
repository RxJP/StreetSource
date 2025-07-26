import React from 'react';
import { Package } from 'lucide-react';
import { ProductCard } from '../common/ProductCard';
import { mockCategories } from '../../data/mockData';
import type { User, Product } from '../../types';

interface HomePageProps {
  user: User | null;
  setCurrentPage: (page: string) => void;
  setSelectedCategory: (category: number) => void;
  products: Product[];
  addToCart: (product: Product, quantity?: number) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  setCurrentPage,
  setSelectedCategory,
  products,
  addToCart
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold mb-6">Premium Ingredients for Street Food Success</h2>
          <p className="text-xl mb-8 opacity-90">Connect with trusted suppliers and grow your street food business</p>
          <button 
            onClick={() => setCurrentPage('products')}
            className="bg-white text-orange-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors transform hover:scale-105"
          >
            Shop Ingredients
          </button>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-800">Browse by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {mockCategories.map(category => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setCurrentPage('products');
                }}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:scale-105 text-center"
              >
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-orange-600" />
                </div>
                <h4 className="font-semibold text-gray-800">{category.name}</h4>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-800">Featured Products</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.slice(0, 3).map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
