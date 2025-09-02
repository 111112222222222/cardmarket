# 🚀 Vercel Deployment Guide

This guide will help you deploy your Pokemon Card Marketplace on Vercel.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm i -g vercel`
3. **MongoDB Atlas**: Set up a cloud database
4. **Stripe Account**: For payment processing

## 🔧 Step 1: Environment Setup

### Backend Environment Variables
Create a `.env.local` file in the backend directory:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pokemon-marketplace
JWT_SECRET=your_super_secret_jwt_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

### Frontend Environment Variables
Create a `.env.local` file in the frontend directory:

```env
REACT_APP_API_URL=https://your-backend-domain.vercel.app
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
```

## 🚀 Step 2: Deploy Backend

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard:**
   - Go to your project settings
   - Add the environment variables from your `.env.local` file

4. **Note your backend URL** (e.g., `https://your-backend.vercel.app`)

## 🌐 Step 3: Deploy Frontend

1. **Update frontend environment:**
   - Set `REACT_APP_API_URL` to your backend URL

2. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

3. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

4. **Set environment variables in Vercel dashboard:**
   - Add `REACT_APP_API_URL` and `REACT_APP_STRIPE_PUBLISHABLE_KEY`

## 🔄 Step 4: Update API URLs

After deployment, update your frontend environment variables with the actual backend URL.

## 📱 Step 5: Test Your Deployment

1. **Test authentication flow**
2. **Test card submission**
3. **Test bidding system**
4. **Test payment integration**

## 🛠 Alternative: Deploy Both at Once

From the root directory, you can use:

```bash
npm run deploy:all
```

## 🔍 Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure your backend allows requests from your frontend domain
2. **Database Connection**: Check MongoDB Atlas network access settings
3. **Environment Variables**: Verify all variables are set in Vercel dashboard
4. **Build Errors**: Check build logs in Vercel dashboard

### Vercel Dashboard Features:

- **Function Logs**: Monitor API performance
- **Analytics**: Track user engagement
- **Domains**: Configure custom domains
- **Environment Variables**: Manage configuration

## 🌍 Production Considerations

1. **Use MongoDB Atlas** for production database
2. **Set up Stripe webhooks** for production payments
3. **Configure custom domains** if needed
4. **Set up monitoring** and error tracking
5. **Enable Vercel Analytics** for insights

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/)
- [Stripe Integration Guide](https://stripe.com/docs)

## 🎉 Success!

Your Pokemon Card Marketplace is now live on Vercel! 

- **Frontend**: `https://your-frontend.vercel.app`
- **Backend**: `https://your-backend.vercel.app`

Share your marketplace with the world! 🎮✨
