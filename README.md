# Pokemon Card Marketplace

A full-stack web application for buying, selling, and trading Pokemon cards. Built with React frontend and Node.js backend.

## Features

- **User Authentication**: Secure login and registration system
- **Card Management**: Submit, view, and manage Pokemon cards
- **Vendor Dashboard**: Special interface for card vendors
- **Customer Dashboard**: Interface for buyers and collectors
- **Offer System**: Make and manage offers on cards
- **Payment Integration**: Secure payment processing
- **Image Upload**: Support for card image uploads
- **Responsive Design**: Modern UI built with Tailwind CSS and Shadcn/UI

## Tech Stack

### Frontend
- React 18
- Vite (Build tool)
- Tailwind CSS
- Shadcn/UI Components
- React Router for navigation

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads
- Vercel deployment ready

## Project Structure

```
pokemon-card-marketplace/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts (Auth)
│   │   └── services/       # API service functions
│   └── public/             # Static assets
├── backend/                 # Node.js backend API
│   ├── api/                # API endpoint handlers
│   ├── models/             # MongoDB models
│   ├── routes/             # Express routes
│   ├── middleware/         # Custom middleware
│   └── config/             # Configuration files
└── README.md               # This file
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-github-repo-url>
   cd pokemon-card-marketplace
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Environment Setup**
   
   Create `.env.local` files in both frontend and backend directories:
   
   **Backend (.env.local)**
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```
   
   **Frontend (.env.local)**
   ```env
   REACT_APP_API_URL=http://localhost:5000
   ```

4. **Start the application**
   
   **Terminal 1 - Backend**
   ```bash
   cd backend
   npm start
   ```
   
   **Terminal 2 - Frontend**
   ```bash
   cd frontend
   npm start
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Cards
- `GET /api/cards` - Get all cards
- `GET /api/cards/:id` - Get specific card
- `POST /api/cards` - Submit new card (vendor only)
- `PUT /api/cards/:id` - Update card (vendor only)
- `DELETE /api/cards/:id` - Delete card (vendor only)

### Offers
- `GET /api/offers` - Get offers for user
- `POST /api/offers` - Create new offer
- `PUT /api/offers/:id` - Update offer status

### Vendors
- `GET /api/vendors` - Get vendor information
- `POST /api/vendors` - Create vendor profile

## Deployment

### Vercel (Recommended)
Both frontend and backend are configured for Vercel deployment with `vercel.json` files.

### Manual Deployment
1. Build the frontend: `cd frontend && npm run build`
2. Deploy backend to your preferred hosting service
3. Update frontend environment variables with production API URL

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
