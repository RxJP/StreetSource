# StreetSource

StreetSource is a full-stack online marketplace connecting vendors (buyers) with suppliers (sellers) of commodities. Built with React frontend and Rust/Actix-web backend, hosted on AWS.

## 🚀 Features

### User Management
- Registration and login for both vendors and suppliers
- Session-based authentication with secure cookies
- Password reset with OTP email verification
- User profile management with image upload
- Role switching (vendor ↔ supplier)

### Product Catalog
- Browse products by category with search and sorting
- Categories: Grains & Rice, Fresh Vegetables, Spices & Masalas, Cooking Oils, Meat & Poultry, Dairy Products
- Sorting options: Price (Low→High, High→Low), Highest Rated Supplier, Most Deliveries, Name A–Z
- Product images stored in AWS S3
- Stock quantity tracking

### Real-time Messaging
- WebSocket-based chat between buyers and sellers
- Message history persistence
- Special offer system - buyers can send custom price offers
- Real-time notifications

### Order Management
- Shopping cart functionality
- Order placement and tracking
- Order status updates (Pending → Shipped → Delivered)
- Seller dashboard for managing orders

### Supplier Ratings
- Rating system based on completed deliveries
- Average ratings displayed on product cards and profiles
- Delivery count tracking

### Mobile Responsive
- Responsive design for all screen sizes
- Mobile-first approach with collapsible navigation
- Touch-friendly interface

## 🛠 Tech Stack

### Backend
- **Framework**: Rust with Actix-web 4.11.0
- **Database**: PostgreSQL with SQLx
- **Authentication**: Session-based with actix-identity and actix-session
- **WebSockets**: actix-ws for real-time messaging
- **Storage**: AWS S3 for images
- **Security**: Argon2 password hashing
- **Additional Libraries**:
  - `serde/serde_json` for JSON serialization
  - `aws-config` & `aws-sdk-s3` for AWS integration
  - `uuid` & `nanoid` for unique ID generation
  - `chrono` for timestamps
  - `thiserror` for error handling
  - `dotenv` for environment variables

### Frontend
- **Framework**: React (latest stable)
- **Routing**: React Router
- **State Management**: React Context API
- **Styling**: Tailwind CSS or Bootstrap
- **Mobile**: Responsive design with CSS Flexbox/Grid

### Infrastructure
- **Hosting**: AWS EC2 instances
- **Database**: Amazon RDS PostgreSQL
- **Storage**: Amazon S3 buckets
- **Security**: HTTPS with TLS certificates
- **Monitoring**: Amazon CloudWatch

## 📋 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/password_reset/request` - Request password reset OTP
- `POST /api/password_reset/verify` - Verify OTP and reset password

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings

### Products
- `GET /api/products` - List products with search/filter/sort
- `GET /api/products/{id}` - Get product details
- `POST /api/products` - Create new product (suppliers only)
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

### Cart & Orders
- `POST /api/cart/add` - Add item to cart
- `GET /api/cart` - Get cart contents
- `POST /api/orders` - Create order from cart
- `GET /api/orders` - Get user's orders
- `GET /api/orders/seller/pending` - Get pending orders (sellers)
- `PUT /api/orders/{id}/status` - Update order status

### File Upload
- `POST /api/upload/profile` - Upload profile image
- `POST /api/upload/product` - Upload product image

### WebSocket
- `/ws/messages` - Real-time messaging

## 🗄 Database Schema

### Core Tables

**Users**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    phone VARCHAR,
    is_supplier BOOLEAN DEFAULT FALSE,
    rating FLOAT DEFAULT 0.0,
    total_deliveries INTEGER DEFAULT 0,
    profile_image_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Categories**
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL
);
```

**Products**
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    price_per_unit DECIMAL NOT NULL,
    stock_qty INTEGER NOT NULL,
    image_url VARCHAR,
    seller_id UUID REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Orders**
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    status VARCHAR DEFAULT 'Pending',
    total_price DECIMAL NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Order Items**
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL NOT NULL
);
```

**Conversations & Messages**
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    user1_id UUID REFERENCES users(id),
    user2_id UUID REFERENCES users(id),
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conv_id UUID REFERENCES conversations(id),
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Getting Started

### Prerequisites
- Rust (latest stable)
- Node.js and npm
- PostgreSQL
- AWS Account with S3 and RDS access

### Backend Setup

1. Clone the repository
```bash
git clone <repository-url>
cd streetsource/backend
```

2. Install dependencies
```bash
cargo build
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your database URL, AWS credentials, etc.
```

4. Run database migrations
```bash
sqlx migrate run
```

5. Start the server
```bash
cargo run
```

### Frontend Setup

1. Navigate to frontend directory
```bash
cd streetsource/frontend
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm start
```

## 🏗 AWS Deployment

### Infrastructure Components

1. **EC2 Instance**: Hosts both frontend build and backend API
2. **RDS PostgreSQL**: Managed database service
3. **S3 Bucket**: Stores product and profile images
4. **IAM Roles**: Secure access between services
5. **Load Balancer**: (Optional) For high availability

### Deployment Steps

1. **Set up EC2 instance** with appropriate security groups
2. **Create RDS PostgreSQL** instance in private subnet
3. **Create S3 bucket** with public read access for images
4. **Configure IAM roles** for EC2 to access RDS and S3
5. **Deploy application** with HTTPS enabled
6. **Set up monitoring** with CloudWatch

## 🔐 Security Features

- **Password Security**: Argon2 hashing
- **Session Management**: Secure HTTP-only cookies
- **HTTPS**: TLS encryption for all traffic
- **Input Validation**: Parameterized queries prevent SQL injection
- **CORS Configuration**: Secure cross-origin requests
- **OTP Password Reset**: Time-limited one-time passwords

## 📱 User Interface

### Pages & Components

**Public Pages**
- Homepage with featured products
- Login/Registration forms
- Product search and category browsing

**Buyer (Vendor) Pages**
- Product catalog with filtering and sorting
- Shopping cart and checkout
- Order history and tracking
- Real-time messaging with suppliers
- User profile and settings

**Seller (Supplier) Pages**
- Product listing management
- Seller dashboard with metrics
- Pending orders management
- Real-time messaging with buyers
- Profile with ratings display

## 🔄 Real-Time Features

### WebSocket Messaging
- Instant message delivery
- Online/offline status
- Message history
- Special offer system
- Typing indicators (future enhancement)

### Special Offers
- Buyers can propose custom prices
- Real-time offer notifications
- Accept/reject functionality
- Automatic order creation on acceptance

## 📊 Business Logic

### Rating System
- Post-delivery rating (1-5 stars)
- Average rating calculation
- Rating display on profiles and products
- Delivery count tracking

### Search & Filtering
- Full-text search on product names/descriptions
- Category-based filtering
- Multiple sorting options
- Pagination for large result sets