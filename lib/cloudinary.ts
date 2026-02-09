import { v2 as cloudinary } from 'cloudinary';

// Log configuration for debugging
console.log('🔍 Cloudinary Config Check:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? `Set (${process.env.CLOUDINARY_CLOUD_NAME.substring(0, 3)}...)` : '❌ Missing',
  api_key: process.env.CLOUDINARY_API_KEY ? `Set (${process.env.CLOUDINARY_API_KEY.substring(0, 3)}...)` : '❌ Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set (****)' : '❌ Missing',
  NODE_ENV: process.env.NODE_ENV,
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
