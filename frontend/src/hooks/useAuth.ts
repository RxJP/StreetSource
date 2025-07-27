// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import type { User, AuthFormData } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const userData = await apiClient.getUserProfile();
        setUser(userData);
      } catch (error) {
        // User is not logged in
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLogin = async (credentials: AuthFormData) => {
    try {
      const response = await apiClient.login(credentials);
      setUser(response.user);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const handleRegister = async (userData: AuthFormData) => {
    try {
      const response = await apiClient.register(userData);
      // After successful registration, log the user in
      await handleLogin({
        email: userData.email,
        password: userData.password,
        is_supplier: userData.is_supplier,
      });
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear user state even if logout API call fails
      setUser(null);
    }
  };

  return {
    user,
    setUser,
    loading,
    handleLogin,
    handleRegister,
    handleLogout,
  };
};