// src/services/api.ts
import type { 
  User, 
  Product, 
  CartItem, 
  Order, 
  AuthFormData,
  CreateProductRequest,
  UpdateProductRequest,
  Category 
} from '../types';

const API_BASE_URL = 'http://65.2.22.213/api';

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      credentials: 'include', // Include cookies for session
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An error occurred' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(credentials: AuthFormData): Promise<{ message: string; user: User }> {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });
  }

  async register(userData: AuthFormData): Promise<{ message: string; user_id: string }> {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        phone: userData.phone,
        is_supplier: userData.is_supplier,
      }),
    });
  }

  async logout(): Promise<{ message: string }> {
    return this.request('/logout', {
      method: 'POST',
    });
  }

  // User profile endpoints
  async getUserProfile(): Promise<User> {
    return this.request('/user/profile');
  }

  async updateUserProfile(profileData: Partial<User>): Promise<{ message: string }> {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getUserSettings(): Promise<{ is_supplier: boolean }> {
    return this.request('/user/settings');
  }

  async updateUserSettings(settings: { become_supplier: boolean }): Promise<{ message: string }> {
    return this.request('/user/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Categories endpoints
  async getCategories(): Promise<{ categories: Category[] }> {
    return this.request('/categories');
  }

  async getCategory(id: number): Promise<{
    id: number;
    name: string;
    product_count: number;
  }> {
    return this.request(`/categories/${id}`);
  }

  // Product endpoints
  async getProducts(params: {
    search?: string;
    category?: number;
    sort?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.append('search', params.search);
    if (params.category && params.category > 0) searchParams.append('category', params.category.toString());
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    
    return this.request(endpoint);
  }

  async getProduct(id: string): Promise<Product> {
    return this.request(`/products/${id}`);
  }

  async createProduct(productData: CreateProductRequest): Promise<{ message: string; product_id: string }> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id: string, productData: UpdateProductRequest): Promise<{ message: string }> {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Cart endpoints
  async getCart(): Promise<{
    items: CartItem[];
    total: number;
  }> {
    return this.request('/cart');
  }

  async addToCart(productId: string, quantity: number): Promise<{ message: string }> {
    return this.request('/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        quantity,
      }),
    });
  }

  async removeFromCart(productId: string, quantity?: number): Promise<{ message: string }> {
    const body: any = { product_id: productId };
    if (quantity !== undefined) {
      body.quantity = quantity;
    }
    
    return this.request('/cart/remove', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Order endpoints
  async getOrders(): Promise<{ orders: Order[] }> {
    return this.request('/orders');
  }

  async createOrder(): Promise<{ message: string; order_ids: string[] }> {
    return this.request('/orders', {
      method: 'POST',
    });
  }

  async getPendingOrders(): Promise<{ orders: Order[] }> {
    return this.request('/orders/seller/pending');
  }

  async updateOrderStatus(orderId: string, status: 'pending' | 'shipped' | 'delivered'): Promise<{ message: string }> {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Conversation endpoints
  async getConversations(): Promise<{
    conversations: Array<{
      id: string;
      other_user_id: string;
      other_user_name: string;
      last_message?: string;
      last_message_time?: string;
      last_updated: string;
    }>;
  }> {
    return this.request('/conversations');
  }

  async getMessages(convId: string): Promise<{
    messages: Array<{
      id: string;
      sender_id: string;
      sender_name: string;
      content: string;
      sent_at: string;
    }>;
  }> {
    return this.request(`/messages/${convId}`);
  }

  // File upload endpoints
  async uploadProfileImage(file: File): Promise<{ message: string; image_url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/upload/profile', {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  }

  async uploadProductImage(file: File): Promise<{ message: string; image_url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/upload/product', {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();