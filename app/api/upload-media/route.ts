import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'لم يتم رفع ملف' },
        { status: 400 }
      );
    }

    // Check file type (images and videos)
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime', // .mov files
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'نوع الملف غير مدعوم. يُسمح فقط بـ: JPG, PNG, WebP, GIF, MP4, WebM, OGG, MOV' 
        },
        { status: 400 }
      );
    }

    // Check file size (max 50MB for videos, 5MB for images)
    const maxSize = file.type.startsWith('video/') 
      ? 50 * 1024 * 1024  // 50MB for videos
      : 5 * 1024 * 1024;   // 5MB for images

    if (file.size > maxSize) {
      const maxSizeLabel = file.type.startsWith('video/') ? '50MB' : '5MB';
      return NextResponse.json(
        { error: `حجم الملف كبير جداً. الحد الأقصى: ${maxSizeLabel}` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine resource type
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    const mediaType = resourceType;

    // Upload to Cloudinary
    const uploadResponse = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'sinai-institute/general-news',
          resource_type: resourceType,
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
      url: uploadResponse.secure_url,
      type: mediaType,
      message: `تم رفع ${mediaType === 'video' ? 'الفيديو' : 'الصورة'} بنجاح`,
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء رفع الملف' },
      { status: 500 }
    );
  }
}
