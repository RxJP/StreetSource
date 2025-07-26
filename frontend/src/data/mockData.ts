import type { Category, Product } from '../types';

export const mockCategories: Category[] = [
  { id: 1, name: 'Grains & Rice' },
  { id: 2, name: 'Fresh Vegetables' },
  { id: 3, name: 'Spices & Masalas' },
  { id: 4, name: 'Cooking Oils' },
  { id: 5, name: 'Meat & Poultry' },
  { id: 6, name: 'Dairy Products' }
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Basmati Rice',
    description: 'High-quality aged basmati rice perfect for biryani and pulao',
    price_per_unit: 85.50,
    stock_qty: 100,
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
    category_id: 1,
    category_name: 'Grains & Rice',
    seller_name: 'Rajesh Kumar',
    seller_company: 'Kumar Grains Ltd',
    seller_rating: 4.8,
    seller_deliveries: 156,
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Fresh Onions',
    description: 'Farm-fresh red onions, perfect for all cooking needs',
    price_per_unit: 25.00,
    stock_qty: 500,
    image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400',
    category_id: 2,
    category_name: 'Fresh Vegetables',
    seller_name: 'Priya Vegetables',
    seller_company: 'Fresh Farm Co',
    seller_rating: 4.6,
    seller_deliveries: 89,
    created_at: '2024-01-16T08:15:00Z'
  },
  {
    id: '3',
    name: 'Garam Masala Powder',
    description: 'Authentic blend of spices for traditional Indian cooking',
    price_per_unit: 180.00,
    stock_qty: 75,
    image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400',
    category_id: 3,
    category_name: 'Spices & Masalas',
    seller_name: 'Spice Master',
    seller_company: 'Traditional Spices',
    seller_rating: 4.9,
    seller_deliveries: 234,
    created_at: '2024-01-14T16:45:00Z'
  }
];
