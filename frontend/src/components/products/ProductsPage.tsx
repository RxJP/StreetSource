import React, { useEffect, useState } from "react";
import { ProductCard } from "../common/ProductCard";
import { apiClient } from "../../services/api";
import type { User, Product, Category } from "../../types";

interface ProductsPageProps {
  user: User | null;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  searchQuery: string;
  selectedCategory: number;
  setSelectedCategory: (category: number) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  addToCart: (product: Product, quantity?: number) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  setProducts,
  searchQuery,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
  addToCart,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        // Use the dedicated categories API endpoint
        const response = await apiClient.getCategories();
        setCategories(response.categories);
        setCategoriesError(null);
      } catch (error) {
        console.error('Failed to load categories from API:', error);
        setCategoriesError('Failed to load categories from API');
        
        // Fallback: try extracting categories from a sample of products
        try {
          const response = await apiClient.getProducts({ limit: 100 });
          
          // Extract unique categories from products
          const uniqueCategories = response.products.reduce((acc: Category[], product) => {
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
          setCategoriesError('Categories unavailable');
        }
      }
    };

    loadCategories();
  }, []);

  // Load products when filters change
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getProducts({
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
          sort: sortBy || undefined,
          page: currentPage,
          limit: 20,
        });
        
        setProducts(response.products);
        setTotalPages(response.pagination.pages);
      } catch (error) {
        console.error('Failed to load products:', error);
        // Set empty state on error
        setProducts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [searchQuery, selectedCategory, sortBy, currentPage, setProducts]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleCategoryClick = async (categoryId: number) => {
    if (categoryId > 0) {
      try {
        // Optional: Get category details to show product count
        const categoryDetails = await apiClient.getCategory(categoryId);
        console.log(`Selected category: ${categoryDetails.name} (${categoryDetails.product_count} products)`);
      } catch (error) {
        console.error('Failed to get category details:', error);
      }
    }
    setSelectedCategory(categoryId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-300 to-orange-600 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-stone-800 text-center">
          Quality Ingredients from Trusted Vendors
        </h1>

        {/* Filters */}
        <div className="bg-transparent p-6 rounded-lg mb-8 text-gray-800">
          {categoriesError && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
              <p className="text-yellow-800 text-sm">{categoriesError}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryClick(Number(e.target.value))}
              className="border border-zinc-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-700 text-gray-800"
            >
              <option value={0}>All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-zinc-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-700 text-gray-800"
            >
              <option value="">Sort By</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated Supplier</option>
              <option value="deliveries">Most Deliveries</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
            <p className="mt-2 text-gray-800">Loading products...</p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                />
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-800 text-lg">
                  No products found matching your criteria.
                </p>
                {selectedCategory > 0 && (
                  <button
                    onClick={() => handleCategoryClick(0)}
                    className="mt-4 bg-white text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Show All Categories
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                
                <span className="text-gray-800 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white text-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};