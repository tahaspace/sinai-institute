"use client"

import Link from "next/link"
import { Heart } from "lucide-react"

interface DashboardFooterProps {
  className?: string
}

export function DashboardFooter({ className }: DashboardFooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={className}>
      <div className="border-t py-4 px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>© {currentYear} EduSaas.</span>
            <span>صُنع بـ</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span>في مصر</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/help" className="hover:text-foreground transition-colors">
              مركز المساعدة
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              الخصوصية
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              الشروط
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

