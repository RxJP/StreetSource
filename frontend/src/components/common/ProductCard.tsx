import React from 'react';
import { Star, MessageCircle, Phone } from 'lucide-react';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity?: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden">
      <div className="relative">
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 right-4 bg-white rounded-full px-2 py-1 text-sm font-semibold text-green-600">
          ₹{product.price_per_unit}/unit
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-gray-800">{product.name}</h3>
        <p className="text-gray-600 mb-4 text-sm">{product.description}</p>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800">{product.seller_name}</span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{product.seller_rating}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{product.seller_company}</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
              {product.seller_deliveries} deliveries
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onAddToCart(product)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Add to Cart
          </button>
          <button className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors">
            <MessageCircle className="w-5 h-5" />
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors">
            <Phone className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
