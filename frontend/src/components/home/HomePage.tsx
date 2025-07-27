import React, { useState, useEffect } from "react";
import { Package } from "lucide-react";
import { ProductCard } from "../common/ProductCard";
import { apiClient } from "../../services/api";
import type { User, Product, Category } from "../../types";

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
  addToCart,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load categories from the dedicated API endpoint
        const [categoriesResponse, productsResponse] = await Promise.all([
          apiClient.getCategories(),
          apiClient.getProducts({ limit: 50 })
        ]);
        
        setCategories(categoriesResponse.categories);
        
        // Get featured products (first 3 products)
        setFeaturedProducts(productsResponse.products.slice(0, 3));
      } catch (error) {
        console.error('Failed to load homepage data:', error);
        setError('Failed to load homepage data. Please try again later.');
        
        // Fallback: try to load at least products if categories fail
        try {
          const productsResponse = await apiClient.getProducts({ limit: 50 });
          setFeaturedProducts(productsResponse.products.slice(0, 3));
          
          // Extract unique categories from products as fallback
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
        } catch (fallbackError) {
          console.error('Failed to load even fallback data:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && categories.length === 0 && featuredProducts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-300 to-orange-600 text-white py-20">
        <div className="max-w-screen-2xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold mb-6">
            Premium Ingredients for Street Food Success
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Connect with trusted suppliers and grow your street food business
          </p>
          <button
            onClick={() => setCurrentPage("products")}
            className="bg-red-900 text-white py-3 px-8 rounded-lg font-semibold hover:bg-red-800 transition-all duration-300 shadow-lg"
          >
            Shop Ingredients
          </button>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="bg-gradient-to-br from-zinc-50 to-zinc-100 py-16">
        <div className="max-w-screen-2xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Browse by Category
          </h2>
          {error && (
            <div className="text-center mb-8">
              <p className="text-orange-600">{error}</p>
            </div>
          )}
          {categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setCurrentPage("products");
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
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No categories available</p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-gradient-to-br from-orange-50 to-orange-300 py-16 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Featured Products
          </h3>
          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No featured products available</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};