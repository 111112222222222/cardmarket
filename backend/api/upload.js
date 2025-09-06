nd offconst upload = require('../middleware/upload');

// Vercel API handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Use multer to handle file upload
    const uploadSingle = upload.single('image');
    
    uploadSingle(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ 
          message: err.message || 'File upload failed' 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          message: 'No file uploaded' 
        });
      }

      // Return the Cloudinary URL
      res.json({
        message: 'Image uploaded successfully',
        imageUrl: req.file.path, // This is the Cloudinary URL
        publicId: req.file.filename,
        secureUrl: req.file.path
      });
    });

  } catch (error) {
    console.error('Upload API error:', error);
    res.status(500).json({ message: 'Error processing upload' });
  }
};
