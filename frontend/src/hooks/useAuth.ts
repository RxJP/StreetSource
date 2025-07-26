import { useState } from 'react';
import type { User, AuthFormData } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = async (credentials: AuthFormData) => {
    // Mock login - replace with actual API call
    const mockUser: User = {
      id: '1',
      email: credentials.email,
      name: credentials.email.split('@')[0],
      is_supplier: credentials.email.includes('supplier'),
      rating: 4.7,
      total_deliveries: 45,
      profile_image_url: undefined
    };
    setUser(mockUser);
    return mockUser;
  };

  const handleRegister = async (userData: AuthFormData) => {
    // Mock registration - replace with actual API call
    const newUser: User = {
      id: Date.now().toString(),
      email: userData.email,
      name: userData.name || userData.email.split('@')[0],
      phone: userData.phone,
      is_supplier: userData.is_supplier || false,
      rating: undefined,
      total_deliveries: 0,
      profile_image_url: undefined
    };
    setUser(newUser);
    return newUser;
  };

  const handleLogout = () => {
    setUser(null);
  };

  return {
    user,
    setUser,
    handleLogin,
    handleRegister,
    handleLogout
  };
};
