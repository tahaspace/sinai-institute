"use client"

import { useActiveProgramSystem } from "@/lib/use-active-program-system"
import { Card, CardContent } from "@/components/ui/card"
import { Info } from "lucide-react"

/**
 * Shows a notice on credit-hour-specific screens (academic standing / graduation / grade entry)
 * when the active program context is the traditional/annual system — where GPA/hours don't apply.
 * Renders nothing in credit-hour mode. (Dual-system Phase 4.)
 */
export function AcademicModeBanner() {
  const sys = useActiveProgramSystem()
  if (sys !== "ANNUAL") return null
  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 no-print">
      <CardContent className="p-3 flex items-start gap-2 text-sm">
        <Info className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
        <span>
          البرنامج النشط بالنظام السنوي (العادي): التقييم بالنِّسَب المئوية والنتيجة سنوية
          (منقول / له دور ثانٍ / باقٍ للإعادة) — لا يُحتسب معدل تراكمي (GPA). استخدم فئة «النتائج السنوية»
          في مركز التقارير. المؤشرات المعتمدة على الساعات/المعدل في هذه الشاشة تخص برامج الساعات المعتمدة.
        </span>
      </CardContent>
    </Card>
  )
}
