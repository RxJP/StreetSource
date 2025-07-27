// src/types/index.ts
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  is_supplier: boolean;
  rating?: number;
  total_deliveries: number;
  profile_image_url?: string;
}

export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  is_supplier: boolean;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price_per_unit: number;
  stock_qty: number;
  image_url?: string;
  seller_id: string;
  category_id: number;
  category_name: string;
  seller_name: string;
  seller_company: string;
  seller_rating?: number;
  seller_deliveries: number;
  created_at: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price_per_unit: number;
  stock_qty: number;
  category_id: number;
  image_url?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price_per_unit?: number;
  stock_qty?: number;
  category_id?: number;
  image_url?: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  price_per_unit: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
  seller_name: string;
  available_stock: number;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  image_url?: string;
}

export interface Order {
  id: string;
  seller_id: string;
  seller_name: string;
  buyer_id?: string;
  buyer_name?: string;
  buyer_phone?: string;
  status: 'pending' | 'shipped' | 'delivered';
  total_price: number;
  created_at: string;
  items: OrderItem[];
}

export interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  last_message?: string;
  last_message_time?: string;
  last_updated: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  sent_at: string;
}

export interface WebSocketMessage {
  type: 'message' | 'offer' | 'error';
  id: string;
  conv_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  sent_at: string;
}

export interface Category {
  id: number;
  name: string;
}