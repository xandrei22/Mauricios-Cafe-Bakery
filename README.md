# Coffee Shop POS System

A comprehensive Point of Sale (POS) system designed for coffee shops with advanced features including AI-powered recommendations, QR code integration, loyalty system, and real-time order management.

## 🌟 Features

### Customer-Facing Features
- **QR-Accessible Digital Menu**: Interactive menu browsing with ingredient-level customization
- **AI-Powered Recommendations**: Gemini-powered chatbot for drink suggestions and dietary assistance
- **Real-time Customization Preview**: See your drink customization in real-time
- **Multiple Payment Options**: Cash, GCash, PayMaya, and QR code payments
- **Loyalty Rewards System**: Earn and redeem points with comprehensive dashboard
- **Order Tracking**: Real-time order status updates with QR code tracking
- **Private Event Management**: Book special occasions with custom coffee requirements
- **Feedback System**: Collect and manage customer insights

### Staff/Admin Features
- **Integrated POS System**: Streamlined order processing and management
- **Real-time Synchronization**: Live updates between customer orders and staff interface
- **Inventory Management**: Automatic stock tracking and low-stock alerts
- **Sales Analytics**: Comprehensive reporting and analytics dashboard
- **Staff Management**: Role-based access control (Admin, Manager, Staff)
- **Payment Processing**: Support for multiple payment methods
- **Order Queue Management**: Efficient order monitoring and fulfillment

### Technical Features
- **Real-time Updates**: Socket.IO integration for live order and inventory updates
- **AI Integration**: Google Gemini API for intelligent recommendations
- **QR Code Generation**: Dynamic QR codes for menu access, payments, and tracking
- **Responsive Design**: Mobile-first approach for all interfaces
- **Secure Authentication**: Passport.js with multiple authentication strategies
- **Database Management**: MySQL with comprehensive data relationships

## 🏗️ Architecture

```
├── backend/                 # Node.js/Express API server
│   ├── config/             # Database and configuration
│   ├── controllers/        # Business logic controllers
│   ├── middleware/         # Custom middleware
│   ├── models/            # Database models
│   ├── routes/            # API route definitions
│   ├── services/          # Business services (AI, QR, etc.)
│   └── server.js          # Main server entry point
├── frontend/              # React/TypeScript frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service functions
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
└── docs/                  # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coffee-shop-pos
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Configuration**
   
   Create `.env` files in both `backend/` and `frontend/` directories:

   **Backend (.env)**
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=coffee_shop_pos
   
   # Server Configuration
   PORT=5001
   NODE_ENV=development
   
   # Session Configuration
   SESSION_SECRET=your-super-secret-session-key
   
   # AI Configuration
   GEMINI_API_KEY=your-gemini-api-key
   
   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   ```

   **Frontend (.env)**
   ```env
   VITE_API_URL=http://localhost:5001/api
   VITE_SOCKET_URL=http://localhost:5001
   ```

4. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE coffee_shop_pos;
   USE coffee_shop_pos;
   EXIT;
   
   # The database tables will be automatically created when you start the server
   ```

5. **Start the Application**
   ```bash
   # Start backend server (from backend directory)
   cd backend
   npm run dev
   
   # Start frontend development server (from frontend directory)
   cd frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001
   - API Documentation: http://localhost:5001/api/health

## 📱 Usage Guide

### For Customers

1. **Accessing the Menu**
   - Scan the QR code on your table
   - Browse the interactive digital menu
   - Customize your drinks with real-time preview

2. **AI Assistant**
   - Click the chat icon to open AI assistant
   - Ask for recommendations based on your preferences
   - Get dietary-specific suggestions

3. **Placing Orders**
   - Add items to your cart
   - Customize ingredients and quantities
   - Choose payment method (Cash, GCash, PayMaya)
   - Complete payment via QR code or at counter

4. **Loyalty Program**
   - Earn points with every purchase
   - Redeem points for rewards
   - Track your loyalty history

### For Staff

1. **POS Interface**
   - Login with staff credentials
   - View incoming orders in real-time
   - Process payments and update order status

2. **Order Management**
   - Monitor order queue
   - Update order status (pending → preparing → ready → completed)
   - Handle special requests and modifications

3. **Inventory Management**
   - Monitor ingredient stock levels
   - Receive low-stock alerts
   - Update inventory quantities

### For Administrators

1. **Dashboard Access**
   - Comprehensive sales analytics
   - Customer insights and feedback
   - Inventory and staff management

2. **System Configuration**
   - Menu item management
   - Pricing and ingredient configuration
   - Staff account management

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Menu Management
- `GET /api/menu/items` - Get all menu items
- `GET /api/menu/items/:id` - Get specific menu item
- `GET /api/menu/ingredients` - Get all ingredients
- `POST /api/menu/recommendations` - Get AI recommendations

### Order Management
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/payment` - Process payment

### Loyalty System
- `GET /api/loyalty/points/:customerId` - Get customer points
- `POST /api/loyalty/earn` - Earn points from order
- `POST /api/loyalty/redeem` - Redeem points
- `GET /api/loyalty/rewards` - Get rewards catalog

### AI Chat
- `POST /api/ai-chat/session/start` - Start chat session
- `POST /api/ai-chat/session/:id/message` - Send message
- `GET /api/ai-chat/recommendations` - Get AI recommendations

## 🛠️ Development

### Adding New Features

1. **Backend Development**
   ```bash
   cd backend
   # Create new route file in routes/
   # Add business logic in services/
   # Update database schema if needed
   ```

2. **Frontend Development**
   ```bash
   cd frontend
   # Create new components in src/components/
   # Add new pages in src/pages/
   # Update routing in App.tsx
   ```

### Database Schema

The system uses the following main tables:
- `customers` - Customer information and loyalty points
- `menu_items` - Menu items with pricing and categories
- `ingredients` - Available ingredients and stock levels
- `orders` - Order details and status tracking
- `loyalty_transactions` - Points earning and redemption history
- `ai_chat_sessions` - AI conversation history
- `inventory_logs` - Inventory change tracking

### Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🔒 Security Features

- **Authentication**: Passport.js with multiple strategies
- **Session Management**: Secure session handling
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Proper cross-origin resource sharing
- **Environment Variables**: Secure configuration management

## 📊 Analytics and Reporting

The system provides comprehensive analytics including:
- Sales performance metrics
- Customer behavior analysis
- Inventory usage patterns
- Staff performance tracking
- AI chat interaction analytics

## 🚀 Deployment

### Production Deployment

1. **Backend Deployment**
   ```bash
   cd backend
   npm run build
   # Deploy to your preferred hosting service
   ```

2. **Frontend Deployment**
   ```bash
   cd frontend
   npm run build
   # Deploy to your preferred hosting service
   ```

3. **Database Setup**
   - Set up production MySQL database
   - Configure environment variables
   - Run database migrations

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `/docs` folder

## 🔄 Updates and Maintenance

- Regular security updates
- Feature enhancements
- Bug fixes and performance improvements
- Database optimization
- API versioning support

---

**Built with ❤️ for coffee shops everywhere** 