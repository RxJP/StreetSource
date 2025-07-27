import React from "react";
import { ProductCard } from "../common/ProductCard";
import { mockCategories } from "../../data/mockData";
import type { User, Product } from "../../types";

interface ProductsPageProps {
  user: User | null;
  products: Product[];
  searchQuery: string;
  selectedCategory: number;
  setSelectedCategory: (category: number) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  addToCart: (product: Product, quantity?: number) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  searchQuery,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
  addToCart,
}) => {
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 0 || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price_asc":
        return a.price_per_unit - b.price_per_unit;
      case "price_desc":
        return b.price_per_unit - a.price_per_unit;
      case "rating":
        return b.seller_rating - a.seller_rating;
      case "deliveries":
        return b.seller_deliveries - a.seller_deliveries;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-300 to-orange-600 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-stone-800 text-center">
          Quality Ingredients from Trusted Vendors
        </h1>

        {/* Filters */}
        <div className="bg-transparent p-6 rounded-lg mb-8 text-gray-800">

          <div className="flex flex-wrap gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(Number(e.target.value))}
              className="border border-zinc-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-700 text-gray-800"
            >
              <option value={0}>All Categories</option>
              {mockCategories.map((category) => (
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

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
            />
          ))}
        </div>

        {sortedProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No products found matching your criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
