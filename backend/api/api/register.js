// This file handles the double /api/api/register path issue
// It's a workaround for the frontend deployment problem

const registerHandler = require('../register.js');

module.exports = async (req, res) => {
  // Enable CORS for the double /api path
  const allowedOrigins = [
    'http://localhost:3000',
    'https://cardmarketfrontend.vercel.app',
    'https://pokemon-card-marketplace.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Delegate to the actual register handler
  return await registerHandler(req, res);
};
