import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/api";
import type { User } from "../../types";

interface SettingsPageProps {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setShowAuthModal: (show: boolean) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  setUser,
  setShowAuthModal,
}) => {
  const [settings, setSettings] = useState({
    become_supplier: user?.is_supplier || false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.getUserSettings();
        setSettings({ become_supplier: response.is_supplier });
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleToggleSupplier = async () => {
    if (!user) return;

    const newSupplierStatus = !settings.become_supplier;
    
    try {
      await apiClient.updateUserSettings({ become_supplier: newSupplierStatus });
      setSettings({ become_supplier: newSupplierStatus });
      setUser(prev => prev ? { ...prev, is_supplier: newSupplierStatus } : null);
      alert(
        `Successfully ${
          newSupplierStatus ? "enabled" : "disabled"
        } supplier mode!`
      );
    } catch (error: any) {
      alert(error.message || 'Failed to update settings');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-gray-600 font-bold mb-4">
            Please log in to view settings
          </h2>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-lg">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-950">Settings</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-6">
            <div className="border-b pb-6">
              <h3 className="text-lg text-gray-600 font-semibold mb-4">
                Account Settings
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-gray-600 font-medium">Supplier Mode</h4>
                  <p className="text-sm text-gray-600">
                    Enable to sell products on the marketplace
                  </p>
                </div>
                <button
                  onClick={handleToggleSupplier}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 shadow-sm ${
                    settings.become_supplier
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${
                      settings.become_supplier
                        ? "translate-x-5"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="border-b pb-6">
              <h3 className="text-lg text-gray-600 font-semibold mb-4">
                Notifications
              </h3>
              <div className="space-y-3 text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Order updates</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 shadow-sm bg-green-500">
                    <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-5 transition-transform duration-300" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>New messages</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 shadow-sm bg-green-500">
                    <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-5 transition-transform duration-300" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>Marketing emails</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 shadow-sm bg-gray-300">
                    <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-1 transition-transform duration-300" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg text-gray-600 font-semibold mb-4">
                Danger Zone
              </h3>
              <button 
                onClick={() => alert('Account deletion is not implemented in this demo')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};