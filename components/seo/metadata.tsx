import { Metadata } from "next"

// Base metadata for the site
export const baseMetadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://edusaas.com"),
  title: {
    default: "EduSaas - منصة إدارة المؤسسات التعليمية",
    template: "%s | EduSaas",
  },
  description: "منصة SaaS متكاملة لإدارة المدارس والجامعات والمعاهد في مصر. نظام إدارة تعليمي شامل مع حسابات ونظام طلاب ومعلمين.",
  keywords: [
    "نظام إدارة المدارس",
    "نظام إدارة الجامعات", 
    "نظام إدارة المعاهد",
    "SaaS Education",
    "تعليم",
    "مصر",
    "برنامج إدارة مدرسة",
    "نظام حضور الطلاب",
    "نظام درجات",
    "منصة تعليمية",
  ],
  authors: [{ name: "EduSaas Team", url: "https://edusaas.com" }],
  creator: "EduSaas",
  publisher: "EduSaas",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: "https://edusaas.com",
    siteName: "EduSaas",
    title: "EduSaas - منصة إدارة المؤسسات التعليمية",
    description: "منصة SaaS متكاملة لإدارة المدارس والجامعات والمعاهد في مصر",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EduSaas - منصة إدارة المؤسسات التعليمية",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EduSaas - منصة إدارة المؤسسات التعليمية",
    description: "منصة SaaS متكاملة لإدارة المدارس والجامعات والمعاهد في مصر",
    images: ["/og-image.png"],
    creator: "@edusaas",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://edusaas.com",
    languages: {
      "ar-EG": "https://edusaas.com",
      "en-US": "https://edusaas.com/en",
    },
  },
}

// Generate page-specific metadata
interface PageMetadataOptions {
  title: string
  description: string
  path: string
  image?: string
  noIndex?: boolean
}

export function generatePageMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const url = `https://edusaas.com${path}`
  const ogImage = image || "/og-image.png"

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [{ url: ogImage }],
    },
    twitter: {
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: url,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  }
}

// Schema.org structured data generators
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "معهد سيناء العالي للدراسات النوعية",
    url: "https://www.sinai-institute.com",
    logo: "https://www.sinai-institute.com/logo-full.png",
    description: "منصة SaaS متكاملة لإدارة المدارس والجامعات والمعاهد في مصر",
    address: {
      "@type": "PostalAddress",
      addressCountry: "EG",
      addressLocality: "القاهرة",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+20-XXX-XXX-XXXX",
      contactType: "customer service",
      availableLanguage: ["Arabic", "English"],
    },
    sameAs: [
      "https://facebook.com/edusaas",
      "https://twitter.com/edusaas",
      "https://linkedin.com/company/edusaas",
    ],
  }
}

export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EduSaas",
    url: "https://edusaas.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://edusaas.com/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  }
}

export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "EduSaas",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EGP",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "150",
    },
  }
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

// JSON-LD Script Component
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}


