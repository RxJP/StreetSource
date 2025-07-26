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

export interface Product {
  id: string;
  name: string;
  description: string;
  price_per_unit: number;
  stock_qty: number;
  image_url: string;
  category_id: number;
  category_name: string;
  seller_name: string;
  seller_company: string;
  seller_rating: number;
  seller_deliveries: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  price_per_unit: number;
  quantity: number;
  image_url: string;
  seller_name: string;
  available_stock: number;
}

export interface Order {
  id: string;
  seller_name: string;
  status: 'pending' | 'shipped' | 'delivered';
  total_price: number;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  image_url: string;
}

export interface Conversation {
  id: string;
  other_user_name: string;
  last_message: string;
  last_message_time: string;
}

export interface Message {
  id: string;
  sender_name: string;
  content: string;
  sent_at: string;
  type?: 'offer';
}

export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  is_supplier?: boolean;
}
