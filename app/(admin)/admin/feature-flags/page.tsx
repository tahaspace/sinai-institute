"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleRight, Building2, Loader2 } from "lucide-react"

interface FlagDef {
  key: string
  nameAr: string
}
interface UniversityRow {
  id: string
  nameAr: string
}
interface FlagValue {
  universityId: string
  key: string
  enabled: boolean
}

export default function FeatureFlagsPage() {
  const [universities, setUniversities] = useState<UniversityRow[]>([])
  const [flags, setFlags] = useState<FlagDef[]>([])
  const [values, setValues] = useState<FlagValue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // tracks the (universityId|key) cells that are mid-flight so we disable + spin them
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/platform/feature-flags`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب مفاتيح الميزات")
        const json = await res.json()
        if (!cancelled) {
          setUniversities(json.universities ?? [])
          setFlags(json.flags ?? [])
          setValues(json.values ?? [])
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const cellKey = (universityId: string, key: string) => `${universityId}|${key}`

  const isEnabled = (universityId: string, key: string): boolean =>
    values.find((v) => v.universityId === universityId && v.key === key)?.enabled ?? false

  async function toggle(universityId: string, key: string, next: boolean) {
    const ck = cellKey(universityId, key)
    setSaving((s) => ({ ...s, [ck]: true }))
    // optimistic update
    setValues((prev) => {
      const others = prev.filter((v) => !(v.universityId === universityId && v.key === key))
      return [...others, { universityId, key, enabled: next }]
    })
    try {
      const res = await fetch(`/api/admin/platform/feature-flags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universityId, key, enabled: next }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في تحديث المفتاح")
      const json = await res.json()
      // reconcile with the server-confirmed value
      setValues((prev) => {
        const others = prev.filter((v) => !(v.universityId === universityId && v.key === key))
        return [...others, { universityId: json.universityId, key: json.key, enabled: json.enabled }]
      })
    } catch (e) {
      // roll back the optimistic change on failure
      setValues((prev) => {
        const others = prev.filter((v) => !(v.universityId === universityId && v.key === key))
        return [...others, { universityId, key, enabled: !next }]
      })
      setError((e as Error).message)
    } finally {
      setSaving((s) => {
        const copy = { ...s }
        delete copy[ck]
        return copy
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ToggleRight className="w-7 h-7 text-indigo-600" />
          مفاتيح الميزات
        </h1>
        <p className="text-muted-foreground">
          تفعيل أو تعطيل وحدات المنصة لكل جامعة على حدة
        </p>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}

      {loading ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل مفاتيح الميزات...</CardContent></Card>
      ) : universities.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">لا توجد جامعات مسجّلة</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>مصفوفة الميزات</CardTitle>
            <CardDescription>
              {universities.length} جامعة × {flags.length} ميزة
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right sticky right-0 bg-background min-w-[180px]">الجامعة</TableHead>
                  {flags.map((flag) => (
                    <TableHead key={flag.key} className="text-center whitespace-nowrap">
                      <span className="font-medium">{flag.nameAr}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {universities.map((uni) => (
                  <TableRow key={uni.id}>
                    <TableCell className="sticky right-0 bg-background">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{uni.nameAr}</span>
                      </div>
                    </TableCell>
                    {flags.map((flag) => {
                      const ck = cellKey(uni.id, flag.key)
                      const enabled = isEnabled(uni.id, flag.key)
                      const busy = !!saving[ck]
                      return (
                        <TableCell key={flag.key} className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                            <Switch
                              checked={enabled}
                              disabled={busy}
                              onCheckedChange={(next) => toggle(uni.id, flag.key, next)}
                              aria-label={`${flag.nameAr} — ${uni.nameAr}`}
                            />
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Flag legend */}
      {!loading && flags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الميزات المتاحة</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {flags.map((flag) => (
              <Badge key={flag.key} variant="secondary" className="font-normal">
                {flag.nameAr}
                <span className="text-muted-foreground mr-1 text-[10px]" dir="ltr">({flag.key})</span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
