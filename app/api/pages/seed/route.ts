import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Seed default pages for the website
export async function POST(request: NextRequest) {
  try {
    const defaultPages = [
      {
        titleAr: 'الرئيسية',
        titleEn: 'Home',
        slug: 'home',
        contentAr: '<h1>مرحباً بكم في معهد سيناء العالي للدراسات النوعية</h1><p>نحن معهد رائد في التعليم...</p>',
        contentEn: '<h1>Welcome to Sinai Higher Institute</h1><p>We are a leading institute...</p>',
        level: 1,
        order: 1,
        showInHeader: true,
        showInFooter: true,
        isPublished: true,
      },
      {
        titleAr: 'عن المعهد',
        titleEn: 'About',
        slug: 'about',
        contentAr: `
<section style="padding: 50px 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
    <h2 style="text-align: center; margin-bottom: 30px; color: #0B69D4; font-size: 2.5rem;">نبذة عن المعهد</h2>
    
    <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 30px;">
      <h3 style="color: #0B69D4; margin-bottom: 15px;">معهد سيناء العالي للدراسات النوعية</h3>
      <p style="line-height: 1.8; color: #333;">
        معهد سيناء العالي للدراسات النوعية هو مؤسسة تعليمية معتمدة من وزارة التعليم العالي المصرية، 
        يقع في المدينة التعليمية بالإسماعيلية. تأسس المعهد بهدف تقديم تعليم عالي الجودة في مجالات 
        متخصصة تلبي احتياجات سوق العمل المحلي والإقليمي.
      </p>
    </div>

    <div style="background: #f5f5f5; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
      <h3 style="color: #0B69D4; margin-bottom: 15px;">التخصصات الأكاديمية</h3>
      <p style="line-height: 1.8; color: #333;">
        نقدم 6 تخصصات أكاديمية متميزة: إدارة الضيافة، الإرشاد السياحي، الدراسات السياحية، 
        اللغة الإنجليزية، اللغة الفرنسية، والعلوم الإدارية. جميع برامجنا معتمدة ومصممة لتزويد 
        الطلاب بالمعرفة النظرية والمهارات العملية اللازمة للنجاح في مجالاتهم.
      </p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 30px;">
      <div style="background: #DBEAFE; padding: 20px; border-radius: 8px; text-align: center;">
        <h4 style="color: #0B69D4; margin-bottom: 10px;">🎯 الهدف</h4>
        <p style="color: #333;">إعداد كوادر مؤهلة للمنافسة في سوق العمل</p>
      </div>
      <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; text-align: center;">
        <h4 style="color: #F59E0B; margin-bottom: 10px;">👁️ الرؤية</h4>
        <p style="color: #333;">أن نكون المعهد الأول في التعليم النوعي بمصر</p>
      </div>
      <div style="background: #DBEAFE; padding: 20px; border-radius: 8px; text-align: center;">
        <h4 style="color: #0B69D4; margin-bottom: 10px;">🏆 الجودة</h4>
        <p style="color: #333;">الالتزام بأعلى معايير الجودة الأكاديمية</p>
      </div>
    </div>
  </div>
</section>
        `,
        contentEn: '<section><h2>About the Institute</h2><p>Content here...</p></section>',
        level: 1,
        order: 2,
        showInHeader: true,
        showInFooter: true,
        isPublished: true,
      },
      {
        titleAr: 'التسجيل والالتحاق',
        titleEn: 'Admission',
        slug: 'admission',
        contentAr: `
<section style="padding: 50px 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
    <h2 style="text-align: center; margin-bottom: 30px; color: #0B69D4; font-size: 2.5rem;">التسجيل والالتحاق</h2>
    
    <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 30px;">
      <h3 style="color: #0B69D4; margin-bottom: 20px;">📋 شروط القبول</h3>
      <ul style="list-style: disc; padding-right: 30px; line-height: 2;">
        <li>الحصول على شهادة الثانوية العامة أو ما يعادلها</li>
        <li>استيفاء الحد الأدنى للمجموع المطلوب للتخصص المرغوب</li>
        <li>اجتياز المقابلة الشخصية بنجاح</li>
        <li>الكشف الطبي وإثبات اللياقة الصحية</li>
        <li>تقديم جميع الأوراق المطلوبة كاملة</li>
      </ul>
    </div>

    <div style="background: #f5f5f5; padding: 30px; border-radius: 8px;">
      <h3 style="color: #0B69D4; margin-bottom: 20px;">📄 الأوراق المطلوبة</h3>
      <ul style="list-style: disc; padding-right: 30px; line-height: 2;">
        <li>أصل شهادة الثانوية العامة + 4 صور</li>
        <li>شهادة الميلاد الأصلية (كمبيوتر) + 6 صور</li>
        <li>8 صور شخصية حديثة (4×6)</li>
        <li>بطاقة الرقم القومي (سارية) + 4 صور</li>
      </ul>
    </div>
  </div>
</section>
        `,
        contentEn: '<section><h2>Admission</h2><p>Requirements...</p></section>',
        level: 1,
        order: 3,
        showInHeader: true,
        showInFooter: false,
        isPublished: true,
      },
      {
        titleAr: 'الأقسام',
        titleEn: 'Departments',
        slug: 'departments',
        contentAr: `
<section style="padding: 50px 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
    <h2 style="text-align: center; margin-bottom: 30px; color: #0B69D4; font-size: 2.5rem;">الأقسام الدراسية</h2>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 4px solid #0B69D4;">
        <div style="text-align: center; font-size: 3rem; margin-bottom: 15px;">🏨</div>
        <h3 style="text-align: center; color: #0B69D4; margin-bottom: 15px;">إدارة الضيافة</h3>
        <p style="text-align: center; line-height: 1.8;">برنامج شامل لإعداد متخصصين في إدارة الفنادق والمنتجعات السياحية</p>
      </div>

      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 4px solid #FFC700;">
        <div style="text-align: center; font-size: 3rem; margin-bottom: 15px;">🗺️</div>
        <h3 style="text-align: center; color: #FFC700; margin-bottom: 15px;">الإرشاد السياحي</h3>
        <p style="text-align: center; line-height: 1.8;">تدريب المرشدين السياحيين على إدارة الرحلات والتواصل الفعال</p>
      </div>

      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 4px solid #0B69D4;">
        <div style="text-align: center; font-size: 3rem; margin-bottom: 15px;">✈️</div>
        <h3 style="text-align: center; color: #0B69D4; margin-bottom: 15px;">الدراسات السياحية</h3>
        <p style="text-align: center; line-height: 1.8;">دراسة شاملة لصناعة السياحة وإدارة الشركات السياحية</p>
      </div>

      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 4px solid #FFC700;">
        <div style="text-align: center; font-size: 3rem; margin-bottom: 15px;">🇬🇧</div>
        <h3 style="text-align: center; color: #FFC700; margin-bottom: 15px;">اللغة الإنجليزية</h3>
        <p style="text-align: center; line-height: 1.8;">إتقان اللغة الإنجليزية للأغراض الأكاديمية والمهنية</p>
      </div>

      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 4px solid #0B69D4;">
        <div style="text-align: center; font-size: 3rem; margin-bottom: 15px;">🇫🇷</div>
        <h3 style="text-align: center; color: #0B69D4; margin-bottom: 15px;">اللغة الفرنسية</h3>
        <p style="text-align: center; line-height: 1.8;">دراسة اللغة والثقافة الفرنسية للتواصل الدولي</p>
      </div>

      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 4px solid #FFC700;">
        <div style="text-align: center; font-size: 3rem; margin-bottom: 15px;">💼</div>
        <h3 style="text-align: center; color: #FFC700; margin-bottom: 15px;">العلوم الإدارية</h3>
        <p style="text-align: center; line-height: 1.8;">إعداد الكوادر الإدارية المؤهلة لسوق العمل</p>
      </div>
    </div>
  </div>
</section>
        `,
        contentEn: '<section><h2>Departments</h2><p>Our programs...</p></section>',
        level: 1,
        order: 4,
        showInHeader: true,
        showInFooter: false,
        isPublished: true,
      },
      {
        titleAr: 'النتائج',
        titleEn: 'Results',
        slug: 'results',
        contentAr: `
<section style="padding: 50px 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
    <h2 style="text-align: center; margin-bottom: 30px; color: #0B69D4; font-size: 2.5rem;">نتائج الطلاب</h2>
    
    <div style="background: #DBEAFE; padding: 30px; border-radius: 8px; border-right: 4px solid #0B69D4; margin-bottom: 30px;">
      <h3 style="color: #0B69D4; margin-bottom: 15px;">📢 إعلان هام</h3>
      <p style="line-height: 1.8;">تم الإعلان عن نتائج الفصل الدراسي الأول للعام الأكاديمي 2025/2026.</p>
    </div>

    <div style="display: grid; gap: 20px;">
      <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-right: 4px solid #0B69D4;">
        <h3 style="color: #0B69D4; margin-bottom: 10px;">📚 نتائج الفرقة الأولى</h3>
        <p style="color: #666;">الفصل الدراسي الأول - 2025/2026</p>
        <a href="#" style="display: inline-block; background: #0B69D4; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 15px;">📥 تحميل PDF</a>
      </div>

      <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-right: 4px solid #FFC700;">
        <h3 style="color: #FFC700; margin-bottom: 10px;">📚 نتائج الفرقة الثانية</h3>
        <p style="color: #666;">الفصل الدراسي الأول - 2025/2026</p>
        <a href="#" style="display: inline-block; background: #FFC700; color: #000; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 15px;">📥 تحميل PDF</a>
      </div>
    </div>
  </div>
</section>
        `,
        contentEn: '<section><h2>Results</h2><p>Student results...</p></section>',
        level: 1,
        order: 5,
        showInHeader: true,
        showInFooter: false,
        isPublished: true,
      },
      {
        titleAr: 'الجداول',
        titleEn: 'Schedules',
        slug: 'schedules',
        contentAr: `
<section style="padding: 50px 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
    <h2 style="text-align: center; margin-bottom: 30px; color: #0B69D4; font-size: 2.5rem;">جداول المحاضرات</h2>
    
    <div style="background: #DBEAFE; padding: 30px; border-radius: 8px; border-right: 4px solid #0B69D4; margin-bottom: 30px;">
      <h3 style="color: #0B69D4; margin-bottom: 15px;">📅 العام الأكاديمي 2025/2026</h3>
      <p style="line-height: 1.8;">تم نشر جداول المحاضرات للفصل الدراسي الأول.</p>
    </div>

    <div style="display: grid; gap: 20px;">
      <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="color: #0B69D4; margin-bottom: 10px;">📚 جدول الفرقة الأولى</h3>
        <p style="color: #666; margin-bottom: 15px;">الفصل الدراسي الأول - 2025/2026</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin-top: 15px;">
          <p style="color: #666; font-size: 14px;"><strong>مواعيد الدراسة:</strong> السبت إلى الخميس | <strong>الفترة:</strong> 9:00 ص - 4:00 م</p>
        </div>
        <a href="#" style="display: inline-block; background: #0B69D4; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 15px;">📥 تحميل PDF</a>
      </div>
    </div>
  </div>
</section>
        `,
        contentEn: '<section><h2>Schedules</h2><p>Class schedules...</p></section>',
        level: 1,
        order: 6,
        showInHeader: true,
        showInFooter: false,
        isPublished: true,
      },
      {
        titleAr: 'التقديم',
        titleEn: 'Apply',
        slug: 'apply',
        contentAr: `
<section style="padding: 50px 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
    <h2 style="text-align: center; margin-bottom: 30px; color: #0B69D4; font-size: 2.5rem;">التقديم أونلاين</h2>
    
    <div style="background: linear-gradient(135deg, #0B69D4 0%, #0857b0 100%); color: white; padding: 40px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
      <h3 style="font-size: 2rem; margin-bottom: 15px;">🎓 انضم إلى معهد سيناء العالي</h3>
      <p style="font-size: 1.125rem; line-height: 1.8; margin-bottom: 25px;">املأ استمارة التقديم الإلكترونية وابدأ رحلتك التعليمية معنا</p>
      <a href="#" style="display: inline-block; background: #FFC700; color: #000; padding: 15px 40px; border-radius: 4px; text-decoration: none; font-weight: bold;">📝 ابدأ التقديم الآن</a>
    </div>

    <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h3 style="color: #0B69D4; margin-bottom: 20px;">📋 خطوات التقديم الإلكتروني</h3>
      <ol style="list-style: decimal; padding-right: 30px; line-height: 2.5;">
        <li><strong>تعبئة الاستمارة الإلكترونية:</strong> قم بملء جميع البيانات المطلوبة</li>
        <li><strong>رفع المستندات:</strong> قم برفع صور المستندات المطلوبة</li>
        <li><strong>مراجعة البيانات:</strong> تأكد من صحة جميع البيانات</li>
        <li><strong>إرسال الطلب:</strong> اضغط على زر "إرسال الطلب"</li>
        <li><strong>متابعة الحالة:</strong> يمكنك متابعة حالة طلبك</li>
      </ol>
    </div>
  </div>
</section>
        `,
        contentEn: '<section><h2>Apply Online</h2><p>Application form...</p></section>',
        level: 1,
        order: 7,
        showInHeader: true,
        showInFooter: false,
        isPublished: true,
      },
      {
        titleAr: 'اتصل بنا',
        titleEn: 'Contact',
        slug: 'contact',
        contentAr: `
<section style="padding: 50px 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
    <h2 style="text-align: center; margin-bottom: 30px; color: #0B69D4; font-size: 2.5rem;">اتصل بنا</h2>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-bottom: 30px;">
      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="color: #0B69D4; margin-bottom: 20px; text-align: center;">📞 معلومات الاتصال</h3>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 4px; margin-bottom: 15px;">
          <h4 style="color: #333; margin-bottom: 10px;">📱 الهاتف</h4>
          <p style="color: #666; direction: ltr; text-align: right;">+20 122 082 2224</p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 4px; margin-bottom: 15px;">
          <h4 style="color: #333; margin-bottom: 10px;">📧 البريد الإلكتروني</h4>
          <p style="color: #666; direction: ltr; text-align: right;">info@sainaiinstitute.com</p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 4px;">
          <h4 style="color: #333; margin-bottom: 10px;">📍 العنوان</h4>
          <p style="color: #666; line-height: 1.8;">المدينة التعليمية، الإسماعيلية، جمهورية مصر العربية</p>
        </div>
      </div>

      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="color: #0B69D4; margin-bottom: 20px; text-align: center;">⏰ أوقات العمل</h3>
        
        <div style="background: #DBEAFE; padding: 20px; border-radius: 4px; border-right: 4px solid #0B69D4; margin-bottom: 15px;">
          <h4 style="color: #1E40AF; margin-bottom: 10px;">أيام الدراسة</h4>
          <p style="color: #1E40AF;">السبت - الخميس</p>
          <p style="color: #1E40AF; font-weight: bold; margin-top: 5px;">9:00 ص - 4:00 م</p>
        </div>

        <div style="background: #FEF3C7; padding: 20px; border-radius: 4px; border-right: 4px solid #F59E0B;">
          <h4 style="color: #92400E; margin-bottom: 10px;">يوم الجمعة</h4>
          <p style="color: #92400E; font-weight: bold;">إجازة رسمية</p>
        </div>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="tel:+201220822224" style="display: inline-block; background: #0B69D4; color: white; padding: 15px 30px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 5px;">📱 اتصل الآن</a>
      <a href="mailto:info@sainaiinstitute.com" style="display: inline-block; background: #FFC700; color: #000; padding: 15px 30px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 5px;">📧 أرسل بريد</a>
    </div>
  </div>
</section>
        `,
        contentEn: '<section><h2>Contact Us</h2><p>Get in touch...</p></section>',
        level: 1,
        order: 8,
        showInHeader: true,
        showInFooter: true,
        isPublished: true,
      },
    ];

    const results = {
      created: [] as string[],
      skipped: [] as string[],
      errors: [] as { slug: string; error: string }[],
    };

    for (const pageData of defaultPages) {
      try {
        // Check if page already exists
        const existing = await prisma.page.findUnique({
          where: { slug: pageData.slug },
        });

        if (existing) {
          results.skipped.push(pageData.slug);
          continue;
        }

        // Create page
        await prisma.page.create({
          data: pageData,
        });

        results.created.push(pageData.slug);
      } catch (error: any) {
        results.errors.push({
          slug: pageData.slug,
          error: error.message,
        });
      }
    }

    return NextResponse.json(
      {
        message: 'تمت عملية البذر بنجاح',
        results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error seeding pages:', error);
    return NextResponse.json(
      { error: 'فشلت عملية البذر', details: error.message },
      { status: 500 }
    );
  }
}
