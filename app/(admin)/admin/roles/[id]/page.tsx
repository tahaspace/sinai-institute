"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  ShieldCheck,
  ChevronRight,
  Save,
  Lock,
  Globe,
  Search,
  CheckCheck,
  Square,
} from "lucide-react"

interface PermissionItem {
  id: string
  key: string
  resource: string
  action: string
  descriptionAr: string | null
}

interface PermissionGroup {
  resource: string
  permissions: PermissionItem[]
}

interface RoleMeta {
  id: string
  key: string
  nameAr: string
  nameEn: string
  isSystem: boolean
}

export default function RolePermissionsPage() {
  const params = useParams<{ id: string }>()
  const roleId = params.id
  const router = useRouter()

  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [role, setRole] = useState<RoleMeta | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [permsRes, rolePermsRes] = await Promise.all([
          fetch(`/api/admin/platform/permissions`),
          fetch(`/api/admin/platform/roles/${roleId}/permissions`),
        ])
        if (!permsRes.ok) throw new Error((await permsRes.json().catch(() => ({}))).error || "فشل في جلب الصلاحيات")
        if (!rolePermsRes.ok) throw new Error((await rolePermsRes.json().catch(() => ({}))).error || "فشل في جلب صلاحيات الدور")
        const permsJson = await permsRes.json()
        const rolePermsJson = await rolePermsRes.json()
        if (!cancelled) {
          setGroups(permsJson.groups ?? [])
          setRole(rolePermsJson.role ?? null)
          setSelected(new Set<string>(rolePermsJson.keys ?? []))
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [roleId])

  const allKeys = useMemo(() => groups.flatMap((g) => g.permissions.map((p) => p.key)), [groups])

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({
        resource: g.resource,
        permissions: g.permissions.filter(
          (p) =>
            p.key.toLowerCase().includes(q) ||
            (p.descriptionAr ?? "").toLowerCase().includes(q) ||
            p.resource.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.permissions.length > 0)
  }, [groups, search])

  function toggle(key: string, on: boolean) {
    setSaveMsg(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function toggleGroup(group: PermissionGroup, on: boolean) {
    setSaveMsg(null)
    setSelected((prev) => {
      const next = new Set(prev)
      for (const p of group.permissions) {
        if (on) next.add(p.key)
        else next.delete(p.key)
      }
      return next
    })
  }

  function selectAll(on: boolean) {
    setSaveMsg(null)
    setSelected(on ? new Set(allKeys) : new Set())
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    setError(null)
    try {
      const res = await fetch(`/api/admin/platform/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [...selected] }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في حفظ الصلاحيات")
      const json = await res.json()
      setSelected(new Set<string>(json.keys ?? []))
      setSaveMsg("تم حفظ الصلاحيات بنجاح")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -mr-2">
            <Link href="/admin/roles">
              <ChevronRight className="w-4 h-4 ml-1" />
              العودة إلى الأدوار
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            مصفوفة صلاحيات الدور
          </h1>
          {role && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">{role.nameAr}</p>
              <code className="text-xs bg-muted px-2 py-0.5 rounded">{role.key}</code>
              {role.isSystem && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  <Lock className="w-3 h-3 ml-1" />
                  نظامي
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {selected.size} / {allKeys.length} صلاحية
          </Badge>
          <Button onClick={handleSave} disabled={saving || loading || !role}>
            <Save className="w-4 h-4 ml-2" />
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
      </div>

      {role?.isSystem && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 text-sm text-amber-800 flex items-center gap-2">
            <Globe className="w-4 h-4 shrink-0" />
            هذا دور نظامي — يمكن تعديل صلاحياته، لكن لا يمكن تغيير مفتاحه أو حذفه.
          </CardContent>
        </Card>
      )}

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {saveMsg && <Card className="border-green-200 bg-green-50/50"><CardContent className="p-4 text-center text-green-700">{saveMsg}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل مصفوفة الصلاحيات...</CardContent></Card>}

      {!loading && !error && role && (
        <>
          {/* Toolbar */}
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في الصلاحيات..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectAll(true)}>
                  <CheckCheck className="w-4 h-4 ml-2" />
                  تحديد الكل
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectAll(false)}>
                  <Square className="w-4 h-4 ml-2" />
                  إلغاء الكل
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Matrix grouped by resource */}
          {visibleGroups.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد صلاحيات مطابقة</CardContent></Card>
          )}
          {visibleGroups.map((group) => {
            const groupKeys = group.permissions.map((p) => p.key)
            const checkedInGroup = groupKeys.filter((k) => selected.has(k)).length
            const allChecked = checkedInGroup === groupKeys.length && groupKeys.length > 0
            return (
              <Card key={group.resource}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-mono">{group.resource}</CardTitle>
                      <CardDescription>{checkedInGroup} / {groupKeys.length} مفعّلة</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGroup(group, !allChecked)}
                    >
                      {allChecked ? "إلغاء المجموعة" : "تحديد المجموعة"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.permissions.map((perm) => {
                      const checked = selected.has(perm.key)
                      return (
                        <label
                          key={perm.id}
                          htmlFor={`perm-${perm.id}`}
                          className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={`perm-${perm.id}`}
                            checked={checked}
                            onCheckedChange={(v) => toggle(perm.key, v === true)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{perm.action}</p>
                            <p className="text-xs text-muted-foreground truncate" dir="ltr">{perm.key}</p>
                            {perm.descriptionAr && (
                              <p className="text-xs text-muted-foreground mt-0.5">{perm.descriptionAr}</p>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}
