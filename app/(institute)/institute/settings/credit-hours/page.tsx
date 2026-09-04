import { redirect } from "next/navigation"

/**
 * DELETED SCREEN — «إعدادات الساعات المعتمدة».
 *
 * This page used to be a SECOND bylaw form: it wrote Setting key "institute.creditHours"
 * (minHours / maxHours / maxHonorsHours / maxWarnedHours / minPassGpa / firstWarningGpa /
 * secondWarningGpa / dismissalGpa / autoDropOnAbsence …) and printed a fixed A+…F ladder. Nothing
 * in the platform ever read that key — a repo-wide grep found exactly one hit, the page itself —
 * so every number an institute typed here was discarded, while the sidebar listed it directly
 * ABOVE the real bylaw screen. Its defaults also contradicted the regulation (a 1.50 dismissal GPA
 * and a 1.75 second-warning GPA the bylaw never mentions; a 14-hour cap for a warned student where
 * the bylaw says «ويخفض العب الدراسي الي 12 ساعة فصلية»), and its grade ladder contradicted جدول 3.
 *
 * Every value that HAS a home now lives in one place: the load limits and the GPA thresholds on
 * /institute/settings/regulations, the grade ladder on /institute/exams/result-states. The route
 * itself survives as a redirect so an admin's bookmark lands on the real screen instead of a 404.
 */
export default function CreditHoursSettingsRedirect() {
  redirect("/institute/settings/regulations")
}
