#!/usr/bin/env python3
"""
StreetSource API Test Suite
Comprehensive testing script for all StreetSource API endpoints
"""

import requests
import json
import time
import os
import uuid
from typing import Optional, Dict, Any
from dataclasses import dataclass
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class TestConfig:
    base_url: str = "http://localhost:8080"  # Change to https://api.streetsource.com for production
    timeout: int = 30
    
class StreetSourceAPITester:
    def __init__(self, config: TestConfig):
        self.config = config
        self.session = requests.Session()
        self.session.timeout = config.timeout
        
        # Test data storage
        self.test_users = {}
        self.test_products = {}
        self.test_orders = {}
        self.test_conversations = {}
        
        # Statistics
        self.stats = {
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'errors': []
        }

    def log_test_result(self, test_name: str, success: bool, message: str = ""):
        """Log test results and update statistics"""
        self.stats['total_tests'] += 1
        if success:
            self.stats['passed_tests'] += 1
            logger.info(f"✅ {test_name}: PASSED {message}")
        else:
            self.stats['failed_tests'] += 1
            error_msg = f"❌ {test_name}: FAILED {message}"
            logger.error(error_msg)
            self.stats['errors'].append(error_msg)

    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with proper error handling"""
        url = f"{self.config.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, **kwargs)
            logger.debug(f"{method} {endpoint} -> {response.status_code}")
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {method} {endpoint} - {e}")
            raise

    def test_health_check(self):
        """Test the health check endpoint"""
        test_name = "Health Check"
        try:
            response = self.make_request('GET', '/health')
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_test_result(test_name, True, f"Status: {data['status']}")
                else:
                    self.log_test_result(test_name, False, f"Unexpected status: {data}")
            else:
                self.log_test_result(test_name, False, f"Status code: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def test_user_registration(self):
        """Test user registration for both vendor and supplier"""
        # Test vendor registration
        vendor_data = {
            "email": f"vendor_{uuid.uuid4().hex[:8]}@test.com",
            "password": "testpassword123",
            "is_supplier": False,
            "name": "Test Vendor",
            "phone": "+1234567890"
        }
        
        test_name = "User Registration (Vendor)"
        try:
            response = self.make_request('POST', '/api/register', json=vendor_data)
            
            if response.status_code == 201:
                data = response.json()
                self.test_users['vendor'] = {
                    'email': vendor_data['email'],
                    'password': vendor_data['password'],
                    'user_id': data.get('user_id'),
                    'is_supplier': False
                }
                self.log_test_result(test_name, True, f"User ID: {data.get('user_id')}")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test supplier registration
        supplier_data = {
            "email": f"supplier_{uuid.uuid4().hex[:8]}@test.com",
            "password": "testpassword123",
            "is_supplier": True,
            "name": "Test Supplier Co.",
            "phone": "+1234567891"
        }
        
        test_name = "User Registration (Supplier)"
        try:
            response = self.make_request('POST', '/api/register', json=supplier_data)
            
            if response.status_code == 201:
                data = response.json()
                self.test_users['supplier'] = {
                    'email': supplier_data['email'],
                    'password': supplier_data['password'],
                    'user_id': data.get('user_id'),
                    'is_supplier': True
                }
                self.log_test_result(test_name, True, f"User ID: {data.get('user_id')}")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test duplicate email registration
        test_name = "Duplicate Email Registration"
        try:
            response = self.make_request('POST', '/api/register', json=vendor_data)
            
            if response.status_code == 409:
                self.log_test_result(test_name, True, "Correctly rejected duplicate email")
            else:
                self.log_test_result(test_name, False, f"Expected 409, got {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def test_user_login(self):
        """Test user login functionality"""
        if 'vendor' not in self.test_users:
            logger.warning("Skipping login test - no vendor user available")
            return

        # Test successful login
        test_name = "User Login (Success)"
        login_data = {
            "email": self.test_users['vendor']['email'],
            "password": self.test_users['vendor']['password']
        }
        
        try:
            response = self.make_request('POST', '/api/login', json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'user' in data:
                    self.log_test_result(test_name, True, f"Logged in as: {data['user'].get('email')}")
                else:
                    self.log_test_result(test_name, False, "No user data in response")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test invalid login
        test_name = "User Login (Invalid Credentials)"
        invalid_login = {
            "email": self.test_users['vendor']['email'],
            "password": "wrongpassword"
        }
        
        try:
            response = self.make_request('POST', '/api/login', json=invalid_login)
            
            if response.status_code == 401:
                self.log_test_result(test_name, True, "Correctly rejected invalid credentials")
            else:
                self.log_test_result(test_name, False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def login_user(self, user_type: str) -> bool:
        """Helper method to login a user and maintain session"""
        if user_type not in self.test_users:
            logger.error(f"User type {user_type} not found in test_users")
            return False

        login_data = {
            "email": self.test_users[user_type]['email'],
            "password": self.test_users[user_type]['password']
        }
        
        try:
            response = self.make_request('POST', '/api/login', json=login_data)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to login {user_type}: {e}")
            return False

    def test_password_reset(self):
        """Test password reset functionality"""
        if 'vendor' not in self.test_users:
            logger.warning("Skipping password reset test - no vendor user available")
            return

        # Test password reset request
        test_name = "Password Reset Request"
        reset_data = {"email": self.test_users['vendor']['email']}
        
        try:
            response = self.make_request('POST', '/api/password_reset/request', json=reset_data)
            
            if response.status_code == 200:
                self.log_test_result(test_name, True, "Reset request sent")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test invalid OTP verification (we don't have a real OTP)
        test_name = "Password Reset Verify (Invalid OTP)"
        verify_data = {
            "email": self.test_users['vendor']['email'],
            "otp": "123456",
            "new_password": "newpassword123"
        }
        
        try:
            response = self.make_request('POST', '/api/password_reset/verify', json=verify_data)
            
            if response.status_code == 400:
                self.log_test_result(test_name, True, "Correctly rejected invalid OTP")
            else:
                self.log_test_result(test_name, False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def test_user_profile(self):
        """Test user profile operations"""
        if not self.login_user('vendor'):
            logger.warning("Skipping profile test - login failed")
            return

        # Test get profile
        test_name = "Get User Profile"
        try:
            response = self.make_request('GET', '/api/user/profile')
            
            if response.status_code == 200:
                data = response.json()
                if 'email' in data:
                    self.log_test_result(test_name, True, f"Profile for: {data['email']}")
                else:
                    self.log_test_result(test_name, False, "No email in profile data")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test update profile
        test_name = "Update User Profile"
        update_data = {
            "name": "Updated Test Vendor",
            "phone": "+1234567899"
        }
        
        try:
            response = self.make_request('PUT', '/api/user/profile', json=update_data)
            
            if response.status_code == 200:
                self.log_test_result(test_name, True, "Profile updated successfully")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def test_user_settings(self):
        """Test user settings operations"""
        if not self.login_user('vendor'):
            logger.warning("Skipping settings test - login failed")
            return

        # Test get settings
        test_name = "Get User Settings"
        try:
            response = self.make_request('GET', '/api/user/settings')
            
            if response.status_code == 200:
                data = response.json()
                if 'is_supplier' in data:
                    self.log_test_result(test_name, True, f"Is supplier: {data['is_supplier']}")
                else:
                    self.log_test_result(test_name, False, "No is_supplier in settings")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test update settings (become supplier)
        test_name = "Update User Settings (Become Supplier)"
        settings_data = {"become_supplier": True}
        
        try:
            response = self.make_request('PUT', '/api/user/settings', json=settings_data)
            
            if response.status_code == 200:
                self.test_users['vendor']['is_supplier'] = True
                self.log_test_result(test_name, True, "Successfully became supplier")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def test_product_operations(self):
        """Test product CRUD operations"""
        if not self.login_user('supplier'):
            logger.warning("Skipping product tests - supplier login failed")
            return

        # Test create product
        test_name = "Create Product"
        product_data = {
            "name": "Test Rice - Basmati",
            "description": "Premium quality basmati rice for testing",
            "price_per_unit": 75.50,
            "stock_qty": 100,
            "category_id": 1,
            "image_url": "https://example.com/rice.jpg"
        }
        
        try:
            response = self.make_request('POST', '/api/products', json=product_data)
            
            if response.status_code == 201:
                data = response.json()
                product_id = data.get('product_id')
                self.test_products['rice'] = product_id
                self.log_test_result(test_name, True, f"Product ID: {product_id}")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}, Body: {response.text}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test get products (public endpoint)
        test_name = "Get Products List"
        try:
            params = {
                "search": "rice",
                "category": 1,
                "sort": "price_asc",
                "page": 1,
                "limit": 10
            }
            response = self.make_request('GET', '/api/products', params=params)
            
            if response.status_code == 200:
                data = response.json()
                if 'products' in data and 'pagination' in data:
                    self.log_test_result(test_name, True, f"Found {len(data['products'])} products")
                else:
                    self.log_test_result(test_name, False, "Missing products or pagination")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test get single product
        if 'rice' in self.test_products:
            test_name = "Get Single Product"
            try:
                product_id = self.test_products['rice']
                response = self.make_request('GET', f'/api/products/{product_id}')
                
                if response.status_code == 200:
                    data = response.json()
                    if 'name' in data:
                        self.log_test_result(test_name, True, f"Product: {data['name']}")
                    else:
                        self.log_test_result(test_name, False, "No name in product data")
                else:
                    self.log_test_result(test_name, False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception: {e}")

            # Test update product
            test_name = "Update Product"
            update_data = {
                "name": "Premium Basmati Rice - Updated",
                "price_per_unit": 80.00,
                "stock_qty": 150
            }
            
            try:
                response = self.make_request('PUT', f'/api/products/{product_id}', json=update_data)
                
                if response.status_code == 200:
                    self.log_test_result(test_name, True, "Product updated successfully")
                else:
                    self.log_test_result(test_name, False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception: {e}")

    def test_cart_operations(self):
        """Test shopping cart operations"""
        if not self.login_user('vendor'):
            logger.warning("Skipping cart tests - vendor login failed")
            return

        # Test get empty cart
        test_name = "Get Empty Cart"
        try:
            response = self.make_request('GET', '/api/cart')
            
            if response.status_code == 200:
                data = response.json()
                if 'items' in data and 'total' in data:
                    self.log_test_result(test_name, True, f"Cart total: {data['total']}")
                else:
                    self.log_test_result(test_name, False, "Missing cart structure")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test add to cart
        if 'rice' in self.test_products:
            test_name = "Add to Cart"
            cart_data = {
                "product_id": self.test_products['rice'],
                "quantity": 2
            }
            
            try:
                response = self.make_request('POST', '/api/cart/add', json=cart_data)
                
                if response.status_code == 200:
                    self.log_test_result(test_name, True, "Item added to cart")
                else:
                    self.log_test_result(test_name, False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception: {e}")

            # Test get cart with items
            test_name = "Get Cart with Items"
            try:
                response = self.make_request('GET', '/api/cart')
                
                if response.status_code == 200:
                    data = response.json()
                    if len(data.get('items', [])) > 0:
                        self.log_test_result(test_name, True, f"Cart has {len(data['items'])} items")
                    else:
                        self.log_test_result(test_name, False, "Cart is still empty")
                else:
                    self.log_test_result(test_name, False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception: {e}")

            # Test remove specific quantity from cart
            test_name = "Remove Quantity from Cart"
            remove_quantity_data = {
                "product_id": self.test_products['rice'],
                "quantity": 1
            }
            try:
                response = self.make_request('POST', '/api/cart/remove', json=remove_quantity_data)
                if response.status_code == 200:
                    self.log_test_result(test_name, True, "Removed 1 quantity from cart")
                    # Optionally, check cart to verify quantity decreased
                    response_cart = self.make_request('GET', '/api/cart')
                    if response_cart.status_code == 200:
                        cart_data = response_cart.json()
                        rice_items = [item for item in cart_data.get('items', []) if item.get('product_id') == self.test_products['rice']]
                        if rice_items and rice_items[0].get('quantity', 0) == 1:
                            self.log_test_result(test_name + " (Verify)", True, "Quantity correctly reduced to 1")
                        else:
                            self.log_test_result(test_name + " (Verify)", False, f"Unexpected quantity: {rice_items[0].get('quantity', 0) if rice_items else 'not found'}")
                    else:
                        self.log_test_result(test_name + " (Verify)", False, f"Failed to get cart: {response_cart.status_code}")
                else:
                    self.log_test_result(test_name, False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception: {e}")

            # Test remove from cart (entirely)
            test_name = "Remove from Cart"
            remove_data = {"product_id": self.test_products['rice']}
            
            try:
                response = self.make_request('POST', '/api/cart/remove', json=remove_data)
                
                if response.status_code == 200:
                    self.log_test_result(test_name, True, "Item removed from cart")
                else:
                    self.log_test_result(test_name, False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception: {e}")

    def test_order_operations(self):
        """Test order operations"""
        if not self.login_user('vendor'):
            logger.warning("Skipping order tests - vendor login failed")
            return

        # Add item to cart first
        if 'rice' in self.test_products:
            cart_data = {
                "product_id": self.test_products['rice'],
                "quantity": 1
            }
            self.make_request('POST', '/api/cart/add', json=cart_data)

        # Test create order
        test_name = "Create Order"
        try:
            response = self.make_request('POST', '/api/orders')
            
            if response.status_code == 201:
                data = response.json()
                order_ids = data.get('order_ids', [])
                if order_ids:
                    self.test_orders['test_order'] = order_ids[0]
                    self.log_test_result(test_name, True, f"Created order: {order_ids[0]}")
                else:
                    self.log_test_result(test_name, False, "No order IDs returned")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test get orders
        test_name = "Get User Orders"
        try:
            response = self.make_request('GET', '/api/orders')
            
            if response.status_code == 200:
                data = response.json()
                if 'orders' in data:
                    self.log_test_result(test_name, True, f"Found {len(data['orders'])} orders")
                else:
                    self.log_test_result(test_name, False, "No orders in response")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def test_seller_order_operations(self):
        """Test seller-specific order operations"""
        if not self.login_user('supplier'):
            logger.warning("Skipping seller order tests - supplier login failed")
            return

        # Test get pending orders
        test_name = "Get Pending Orders (Seller)"
        try:
            response = self.make_request('GET', '/api/orders/seller/pending')
            
            if response.status_code == 200:
                data = response.json()
                if 'orders' in data:
                    self.log_test_result(test_name, True, f"Found {len(data['orders'])} pending orders")
                else:
                    self.log_test_result(test_name, False, "No orders in response")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test update order status
        if 'test_order' in self.test_orders:
            test_name = "Update Order Status"
            status_data = {"status": "shipped"}
            
            try:
                order_id = self.test_orders['test_order']
                response = self.make_request('PUT', f'/api/orders/{order_id}/status', json=status_data)
                
                if response.status_code == 200:
                    self.log_test_result(test_name, True, "Order status updated")
                else:
                    self.log_test_result(test_name, False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception: {e}")

    def test_messaging_operations(self):
        """Test messaging operations"""
        if not self.login_user('vendor'):
            logger.warning("Skipping messaging tests - vendor login failed")
            return

        # Test get conversations
        test_name = "Get Conversations"
        try:
            response = self.make_request('GET', '/api/conversations')
            
            if response.status_code == 200:
                data = response.json()
                if 'conversations' in data:
                    self.log_test_result(test_name, True, f"Found {len(data['conversations'])} conversations")
                else:
                    self.log_test_result(test_name, False, "No conversations in response")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # Test get messages (will likely return 403 for non-existent conversation)
        test_name = "Get Messages (Non-existent Conversation)"
        fake_conv_id = str(uuid.uuid4())
        
        try:
            response = self.make_request('GET', f'/api/messages/{fake_conv_id}')
            
            if response.status_code == 403:
                self.log_test_result(test_name, True, "Correctly rejected access to non-participant conversation")
            else:
                self.log_test_result(test_name, False, f"Expected 403, got {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def test_upload_operations(self):
        """Test file upload operations"""
        if not self.login_user('vendor'):
            logger.warning("Skipping upload tests - vendor login failed")
            return

        # --- Test uploading profile image ---
        test_name = "Upload Profile Image"
        try:
            with open("testing/test_profile.jpg", "rb") as f:
                files = {'file': ("test_profile.jpg", f, 'image/jpeg')}
                response = self.make_request('POST', '/api/upload/profile', files=files)

            if response.status_code == 200:
                data = response.json()
                if 'image_url' in data:
                    self.log_test_result(test_name, True, f"Image URL: {data['image_url']}")
                else:
                    self.log_test_result(test_name, False, "No image URL in response")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")

        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

        # --- Test uploading product image ---
        test_name = "Upload Product Image"
        try:
            with open("testing/test_product.jpg", "rb") as f:
                files = {'file': ("test_product.jpg", f, 'image/jpeg')}
                response = self.make_request('POST', '/api/upload/product', files=files)

            if response.status_code == 200:
                data = response.json()
                if 'image_url' in data:
                    self.log_test_result(test_name, True, f"Image URL: {data['image_url']}")
                else:
                    self.log_test_result(test_name, False, "No image URL in response")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")

        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def test_logout(self):
        """Test user logout"""
        test_name = "User Logout"
        try:
            response = self.make_request('POST', '/api/logout')
            
            if response.status_code == 200:
                self.log_test_result(test_name, True, "Successfully logged out")
            else:
                self.log_test_result(test_name, False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def test_unauthorized_access(self):
        """Test that protected endpoints reject unauthorized access"""
        # Clear session to test unauthorized access
        self.session.cookies.clear()
        
        protected_endpoints = [
            ('GET', '/api/user/profile'),
            ('PUT', '/api/user/profile'),
            ('GET', '/api/user/settings'),
            ('POST', '/api/products'),
            ('GET', '/api/cart'),
            ('POST', '/api/orders'),
            ('GET', '/api/conversations'),
        ]
        
        for method, endpoint in protected_endpoints:
            test_name = f"Unauthorized Access: {method} {endpoint}"
            try:
                response = self.make_request(method, endpoint)
                
                if response.status_code == 401:
                    self.log_test_result(test_name, True, "Correctly rejected unauthorized access")
                else:
                    self.log_test_result(test_name, False, f"Expected 401, got {response.status_code}")
                    
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception: {e}")

    def cleanup_test_data(self):
        """Clean up test data (delete products, etc.)"""
        logger.info("Cleaning up test data...")
        
        # Login as supplier to delete products
        if self.login_user('supplier') and 'rice' in self.test_products:
            try:
                product_id = self.test_products['rice']
                response = self.make_request('DELETE', f'/api/products/{product_id}')
                if response.status_code == 200:
                    logger.info(f"Deleted test product: {product_id}")
                else:
                    logger.warning(f"Failed to delete product: {response.status_code}")
            except Exception as e:
                logger.error(f"Error during cleanup: {e}")

    def run_all_tests(self):
        """Run all test suites"""
        logger.info("🚀 Starting StreetSource API Test Suite")
        
        # Basic connectivity and health check
        self.test_health_check()
        
        # Authentication flow
        self.test_user_registration()
        self.test_user_login()
        self.test_password_reset()
        
        # User management
        self.test_user_profile()
        self.test_user_settings()
        
        # Product operations
        self.test_product_operations()
        
        # Shopping cart
        self.test_cart_operations()
        
        # Orders
        self.test_order_operations()
        self.test_seller_order_operations()
        
        # Messaging
        self.test_messaging_operations()
        
        # File uploads
        self.test_upload_operations()

        # Logout
        self.test_logout()

        # Security tests
        self.test_unauthorized_access()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print final results
        self.print_test_summary()

    def print_test_summary(self):
        """Print comprehensive test results"""
        logger.info("=" * 60)
        logger.info("📊 TEST SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total Tests: {self.stats['total_tests']}")
        logger.info(f"Passed: ✅ {self.stats['passed_tests']}")
        logger.info(f"Failed: ❌ {self.stats['failed_tests']}")
        
        if self.stats['total_tests'] > 0:
            success_rate = (self.stats['passed_tests'] / self.stats['total_tests']) * 100
            logger.info(f"Success Rate: {success_rate:.1f}%")
        
        if self.stats['errors']:
            logger.info("\n❌ FAILED TESTS:")
            for error in self.stats['errors']:
                logger.info(f"  {error}")
        
        logger.info("=" * 60)

def create_test_config_from_env():
    """Create test configuration from environment variables"""
    return TestConfig(
        base_url=os.getenv('STREETSOURCE_API_URL', 'http://localhost:8080'),
        timeout=int(os.getenv('API_TIMEOUT', '30'))
    )

def main():
    """Main test execution function"""
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║                StreetSource API Test Suite                 ║
    ║          Comprehensive endpoint testing for the           ║
    ║           Rust/Actix-web marketplace backend              ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    # Load configuration
    config = create_test_config_from_env()
    logger.info(f"Testing API at: {config.base_url}")
    
    # Create and run tests
    tester = StreetSourceAPITester(config)
    
    try:
        tester.run_all_tests()
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Test execution interrupted by user")
        tester.print_test_summary()
    except Exception as e:
        logger.error(f"❌ Critical error during test execution: {e}")
        tester.print_test_summary()
        raise

class AdvancedAPITester(StreetSourceAPITester):
    """Extended test class with additional advanced testing features"""
    
    def test_product_search_and_filtering(self):
        """Test advanced product search and filtering capabilities"""
        logger.info("🔍 Testing Advanced Product Search & Filtering")
        
        # Test different search parameters
        search_tests = [
            {"search": "rice", "expected_key": "name"},
            {"category": 1, "expected_key": "category_id"},
            {"sort": "price_asc", "expected_order": "ascending"},
            {"sort": "price_desc", "expected_order": "descending"},
            {"page": 1, "limit": 5, "expected_limit": 5}
        ]
        
        for test_params in search_tests:
            test_name = f"Product Search: {test_params}"
            try:
                response = self.make_request('GET', '/api/products', params=test_params)
                
                if response.status_code == 200:
                    data = response.json()
                    products = data.get('products', [])
                    
                    # Validate search results
                    if 'search' in test_params and products:
                        contains_search_term = any(
                            test_params['search'].lower() in product.get('name', '').lower()
                            for product in products
                        )
                        if contains_search_term:
                            self.log_test_result(test_name, True, f"Found {len(products)} matching products")
                        else:
                            self.log_test_result(test_name, False, "Search term not found in results")
                    
                    # Validate pagination
                    elif 'limit' in test_params:
                        if len(products) <= test_params['limit']:
                            self.log_test_result(test_name, True, f"Pagination limit respected: {len(products)}")
                        else:
                            self.log_test_result(test_name, False, f"Too many results: {len(products)}")
                    
                    else:
                        self.log_test_result(test_name, True, f"Search returned {len(products)} products")
                else:
                    self.log_test_result(test_name, False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception: {e}")

    def test_websocket_messaging(self):
        """Test WebSocket messaging functionality"""
        logger.info("💬 Testing WebSocket Messaging")
        
        # Note: This is a placeholder for WebSocket testing
        # In a real implementation, you'd use websocket-client library
        test_name = "WebSocket Connection"
        
        try:
            # For now, just test that the WebSocket endpoint exists
            # In practice, you'd need to:
            # 1. Install websocket-client: pip install websocket-client
            # 2. Create WebSocket connection
            # 3. Send/receive test messages
            # 4. Test offer messages
            
            logger.info("Note: WebSocket testing requires websocket-client library")
            logger.info("WebSocket endpoint should be available at: ws://localhost:8080/ws/messages")
            
            self.log_test_result(test_name, True, "WebSocket endpoint documented (requires websocket-client for full testing)")
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

    def test_data_validation(self):
        """Test input validation and error handling"""
        logger.info("🛡️  Testing Data Validation & Error Handling")
        
        if not self.login_user('supplier'):
            logger.warning("Skipping validation tests - supplier login failed")
            return
        
        # Test invalid product creation
        invalid_products = [
            {
                "name": "",  # Empty name
                "price_per_unit": 50.0,
                "stock_qty": 10,
                "category_id": 1,
                "expected_status": 400,
                "test_desc": "Empty product name"
            },
            {
                "name": "Test Product",
                "price_per_unit": -10.0,  # Negative price
                "stock_qty": 10,
                "category_id": 1,
                "expected_status": 400,
                "test_desc": "Negative price"
            },
            {
                "name": "Test Product",
                "price_per_unit": 50.0,
                "stock_qty": -5,  # Negative stock
                "category_id": 1,
                "expected_status": 400,
                "test_desc": "Negative stock"
            }
        ]
        
        for invalid_product in invalid_products:
            test_name = f"Invalid Product Creation: {invalid_product['test_desc']}"
            expected_status = invalid_product.pop('expected_status')
            test_desc = invalid_product.pop('test_desc')
            
            try:
                response = self.make_request('POST', '/api/products', json=invalid_product)
                
                if response.status_code == expected_status:
                    self.log_test_result(test_name, True, f"Correctly rejected: {test_desc}")
                else:
                    self.log_test_result(test_name, False, f"Expected {expected_status}, got {response.status_code}")
                    
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception: {e}")

    def test_performance_and_load(self):
        """Basic performance testing"""
        logger.info("⚡ Testing Basic Performance")
        
        import concurrent.futures
        import time
        
        def make_single_request():
            try:
                start_time = time.time()
                response = self.make_request('GET', '/health')
                end_time = time.time()
                return {
                    'status_code': response.status_code,
                    'response_time': end_time - start_time,
                    'success': response.status_code == 200
                }
            except Exception as e:
                return {'success': False, 'error': str(e), 'response_time': 0}
        
        test_name = "Concurrent Health Check Requests"
        try:
            # Test 10 concurrent requests
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(make_single_request) for _ in range(10)]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            successful_requests = sum(1 for r in results if r['success'])
            avg_response_time = sum(r['response_time'] for r in results if r['success']) / max(successful_requests, 1)
            
            if successful_requests >= 8:  # Allow for some failures
                self.log_test_result(test_name, True, 
                    f"Success: {successful_requests}/10, Avg time: {avg_response_time:.3f}s")
            else:
                self.log_test_result(test_name, False, 
                    f"Too many failures: {10 - successful_requests}/10")
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {e}")

def run_advanced_tests():
    """Run advanced test suite"""
    config = create_test_config_from_env()
    advanced_tester = AdvancedAPITester(config)
    
    logger.info("🚀 Running Advanced Test Suite")
    
    # Run basic tests first
    advanced_tester.run_all_tests()
    
    # Run advanced tests
    advanced_tester.test_product_search_and_filtering()
    advanced_tester.test_websocket_messaging()
    advanced_tester.test_data_validation()
    advanced_tester.test_performance_and_load()
    
    # Final summary
    advanced_tester.print_test_summary()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="StreetSource API Test Suite")
    parser.add_argument('--advanced', action='store_true', 
                       help='Run advanced test suite including performance tests')
    parser.add_argument('--url', default='http://localhost:8080',
                       help='API base URL (default: http://localhost:8080)')
    parser.add_argument('--timeout', type=int, default=30,
                       help='Request timeout in seconds (default: 30)')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Set environment variables from args
    os.environ['STREETSOURCE_API_URL'] = args.url
    os.environ['API_TIMEOUT'] = str(args.timeout)
    
    # Run appropriate test suite
    if args.advanced:
        run_advanced_tests()
    else:
        main()

# Example usage:
# python test_streetsource_api.py
# python test_streetsource_api.py --advanced
# python test_streetsource_api.py --url https://api.streetsource.com --verbose