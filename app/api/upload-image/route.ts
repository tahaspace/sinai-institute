import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Upload request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('📁 File info:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
    });

    if (!file) {
      return NextResponse.json(
        { error: 'لم يتم رفع ملف' },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'نوع الملف غير مدعوم. يُسمح فقط بـ: JPG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'حجم الملف كبير جداً. الحد الأقصى: 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResponse = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'sinai-institute/news',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    // Return the public URL
    return NextResponse.json({
      success: true,
      imageUrl: uploadResponse.secure_url,
      message: 'تم رفع الصورة بنجاح',
    });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cloudinary_config: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
        api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing',
      }
    });
    return NextResponse.json(
      { 
        error: 'حدث خطأ أثناء رفع الصورة',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
