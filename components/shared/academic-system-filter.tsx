"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ACADEMIC_SYSTEM_LABELS } from "@/lib/academic-system-shared"

/**
 * The one «النظام الأكاديمي» filter used across every module that lists students.
 *
 * Two rules it exists to enforce, in one place:
 *  1. It NARROWS a view; it never hides rows on its own. "all" is the value it starts on, and
 *     callers must treat "all" as "no filtering" — so a screen that forgets to wire it still shows
 *     everything rather than silently dropping half the students.
 *  2. It has no bearing on how a student is COMPUTED. The academic system always comes from the
 *     student's own Program.academicSystem, resolved server-side. This control is display only,
 *     which is why it is a filter and deliberately not a mode switch.
 *
 * Modules with no student dimension (HR, payroll, vendors, library stock, the general ledger) must
 * not render this at all.
 */
export const ACADEMIC_SYSTEM_ALL = "all"

export function AcademicSystemFilter({
  value,
  onChange,
  className = "w-full md:w-56",
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="النظام الأكاديمي" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ACADEMIC_SYSTEM_ALL}>كل الأنظمة</SelectItem>
        <SelectItem value="CREDIT_HOURS">{ACADEMIC_SYSTEM_LABELS.CREDIT_HOURS}</SelectItem>
        <SelectItem value="ANNUAL">{ACADEMIC_SYSTEM_LABELS.ANNUAL}</SelectItem>
      </SelectContent>
    </Select>
  )
}

/** Predicate helper so every screen filters identically. "all" (or anything unknown) keeps the row. */
export function matchesSystem(rowSystem: string | null | undefined, filter: string): boolean {
  if (filter !== "CREDIT_HOURS" && filter !== "ANNUAL") return true
  return (rowSystem === "ANNUAL" ? "ANNUAL" : "CREDIT_HOURS") === filter
}

/**
 * Array variant, for entities that can legitimately belong to BOTH systems — a course shared by a
 * credit-hour and an annual programme, for instance. An entity with no known system (a course on no
 * study plan yet) is kept, on the same "narrow, never hide" rule.
 */
export function matchesAnySystem(systems: string[] | null | undefined, filter: string): boolean {
  if (filter !== "CREDIT_HOURS" && filter !== "ANNUAL") return true
  if (!systems || systems.length === 0) return true
  return systems.includes(filter)
}
