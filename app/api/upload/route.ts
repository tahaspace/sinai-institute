import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // results, schedules, news, etc.

    if (!file) {
      return NextResponse.json(
        { error: 'لم يتم تحديد ملف' },
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
          folder: `sinai-institute/${type || 'general'}`,
          resource_type: 'auto',
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
      filename: uploadResponse.original_filename,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'فشل في رفع الملف' },
      { status: 500 }
    );
  }
}
