"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Scale, Save, Loader2, RotateCcw, Search, Plus, Trash2, AlertTriangle, ExternalLink, BookOpen } from "lucide-react"

/**
 * شاشة اللائحة — the whole institute regulation, typed in by the institute itself.
 *
 * Owner requirement: «السيستم ده هايروح لكذا معهد وجامعة وكل معهد او جامعة بتبقي ليها لائحة خاصة
 * بيها ولازم هما يدخلوها بايديهم». So this screen may not expose a hand-picked SUBSET of the
 * bylaw: every key must be here, and a key added later must appear on its own.
 *
 * How that is achieved — and why there are no hand-written inputs below:
 *   · This file is "use client", so it cannot import lib/regulations.ts (Prisma would be pulled
 *     into the browser bundle and the production build fails on chunk generation). It used to keep
 *     a hand-copied mirror of DEFAULT_REGULATIONS instead — which drifted, and shipped a bug: the
 *     mirror said requireApprovedResult=true while the engine default was false, so the box looked
 *     ticked, nothing was written (it matched the mirror's "default"), and the engine did the
 *     opposite. There is now NO mirror: defaults, fields, groups and validation rules all arrive
 *     from GET /api/institute/settings/regulations, which reads lib/regulations.ts server-side.
 *   · Every control below is rendered from that schema by `kind`. A new key of a known shape
 *     (number / boolean / text / map-of-numbers / table-of-rows) gets a working editor with no
 *     change here; an unknown shape falls back to a JSON editor rather than disappearing.
 *
 * Saving writes ONLY the values that differ from the platform default, so an institute that
 * changes nothing keeps following the documented bylaw and inherits later corrections to it.
 */

const API = "/api/institute/settings/regulations"

/** Arabic wording for the two permission outcomes — «إعدادات المعهد» is the صلاحية to ask for. */
const VIEW_DENIED =
  "لا تملك صلاحية عرض اللائحة الأكاديمية لهذا المعهد. راجِع مدير المعهد لمنحك صلاحية «إعدادات المعهد» (institute.settings.view)."
const SAVE_DENIED =
  "لا تملك صلاحية تعديل اللائحة الأكاديمية. العرض متاح لك، أما الحفظ فيحتاج صلاحية «تعديل إعدادات المعهد» (institute.settings.edit)."

// ───────────────────────────── schema types (mirrors ./api schema.ts over the wire) ─────────────────────────────

type FieldKind = "number" | "boolean" | "text" | "components" | "numberMap" | "rowTable" | "json"

type ColumnSchema = {
  key: string
  label: string
  kind: "number" | "text"
  unit?: string
  min?: number
  max?: number
  step?: number
}

type FieldSchema = {
  key: string
  group: string
  kind: FieldKind
  label: string
  unit?: string
  hint: string
  bylaw?: string
  min?: number
  max?: number
  step?: number
  integer?: boolean
  options?: { value: string; label: string }[]
  mapKeyLabel?: string
  columns?: ColumnSchema[]
  documented: boolean
  default?: unknown
  hasDefault: boolean
}

type GroupSchema = { id: string; title: string; description: string }

type CrossRule =
  | { type: "lte"; a: string; b: string; message: string; zeroDisables?: boolean }
  | { type: "ascending"; keys: string[]; message: string }
  | { type: "mapAscending"; key: string; message: string }
  | { type: "mapValuesLte"; key: string; limit: string; message: string }
  | { type: "mapKeysInteger"; key: string; message: string }
  | { type: "complementLte"; a: string; b: string; message: string }
  | { type: "uniqueRows"; key: string; by: string; message: string }

type SchemaPayload = {
  groups: GroupSchema[]
  fields: FieldSchema[]
  defaults: Record<string, unknown>
  /** only what this institute overrode — used for nothing but the «مخصص» diff's fallback */
  stored: Record<string, unknown>
  /** the bylaw AS THE ENGINES READ IT (defaults ⊕ stored, then normalised server-side) */
  effective?: Record<string, unknown>
  rules: CrossRule[]
  componentOptions: { value: string; label: string }[]
}

// ───────────────────────────── draft model ─────────────────────────────
// Every field holds its EFFECTIVE value (default merged with what this institute stored), edited as
// strings so a half-typed number survives. "Overridden" is then a comparison against the default —
// which is what lets the screen show what the institute has actually changed.

type MapRow = { id: string; k: string; v: string }
type TableRow = { id: string; cells: Record<string, string> }
type DraftValue = string | boolean | MapRow[] | TableRow[]
type Draft = Record<string, DraftValue>

let rowSeq = 0
const nextId = () => `r${++rowSeq}`

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

/** Value (from the API) → the editable draft shape for this field's kind. */
function toDraft(f: FieldSchema, value: unknown): DraftValue {
  switch (f.kind) {
    case "boolean":
      return Boolean(value)
    case "number":
      return value == null ? "" : String(value)
    case "text":
    case "components":
      return value == null ? "" : String(value)
    case "numberMap": {
      const obj = isPlainObject(value) ? value : {}
      return Object.entries(obj).map(([k, v]) => ({ id: nextId(), k, v: String(v) }))
    }
    case "rowTable": {
      const arr = Array.isArray(value) ? value : []
      return arr.map((row) => {
        const cells: Record<string, string> = {}
        for (const col of f.columns ?? []) {
          const cell = isPlainObject(row) ? row[col.key] : undefined
          cells[col.key] = cell == null ? "" : String(cell)
        }
        return { id: nextId(), cells }
      })
    }
    case "json":
      return JSON.stringify(value ?? null, null, 2)
  }
}

/** Draft → the typed value the API expects. `undefined` = the draft cannot be parsed (JSON only). */
function fromDraft(f: FieldSchema, d: DraftValue): unknown {
  switch (f.kind) {
    case "boolean":
      return Boolean(d)
    case "number": {
      const n = Number(String(d).trim())
      return String(d).trim() !== "" && Number.isFinite(n) ? n : String(d).trim()
    }
    case "text":
    case "components":
      return String(d).trim()
    case "numberMap": {
      const out: Record<string, number> = {}
      for (const row of d as MapRow[]) {
        const key = row.k.trim()
        if (!key) continue
        out[key] = Number(row.v)
      }
      return out
    }
    case "rowTable":
      return (d as TableRow[]).map((row) => {
        const out: Record<string, unknown> = {}
        for (const col of f.columns ?? []) {
          const raw = row.cells[col.key] ?? ""
          out[col.key] = col.kind === "number" ? Number(raw) : raw.trim()
        }
        return out
      })
    case "json":
      try {
        return JSON.parse(String(d))
      } catch {
        return undefined
      }
  }
}

/** A canonical string per field, so "differs from the platform default" is one cheap comparison. */
function canon(f: FieldSchema, d: DraftValue): string {
  switch (f.kind) {
    case "number": {
      const n = Number(String(d).trim())
      return Number.isFinite(n) && String(d).trim() !== "" ? String(n) : String(d).trim()
    }
    case "boolean":
      return d ? "true" : "false"
    case "text":
    case "components":
      return String(d).trim()
    case "numberMap": {
      const rows = (d as MapRow[])
        .filter((r) => r.k.trim() !== "")
        .map((r) => [r.k.trim(), String(Number(r.v))] as const)
        .sort((a, b) => a[0].localeCompare(b[0]))
      return JSON.stringify(rows)
    }
    case "rowTable":
      return JSON.stringify(
        (d as TableRow[]).map((r) =>
          (f.columns ?? []).map((c) => (c.kind === "number" ? String(Number(r.cells[c.key])) : (r.cells[c.key] ?? "").trim())),
        ),
      )
    case "json":
      try {
        return JSON.stringify(JSON.parse(String(d)))
      } catch {
        return String(d)
      }
  }
}

// ───────────────────────────── validation (same rules as the server, evaluated early) ─────────────────────────────
// The server is the authority — it re-runs all of this on PATCH. This copy exists so the admin sees
// the problem next to the field instead of after a failed save. The RULES themselves are not
// duplicated: they arrive as data in `rules`.

function num(v: unknown): number | null {
  // A blank cell must read as "no value", not as zero: Number("") === 0, which let an emptied
  // «ساعات المستوى 2» box pass every min-0 check and save as 0 — promoting level-1 students.
  if (typeof v === "string" && v.trim() === "") return null
  if (v == null) return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function fieldError(f: FieldSchema, d: DraftValue, componentCount: number, componentTotal: number): string | null {
  const unit = f.unit ? ` ${f.unit}` : ""
  switch (f.kind) {
    case "number": {
      const raw = String(d).trim()
      if (raw === "") return `«${f.label}» مطلوب.`
      const n = Number(raw)
      if (!Number.isFinite(n)) return `قيمة «${f.label}» يجب أن تكون رقماً.`
      if (f.integer && !Number.isInteger(n)) return `قيمة «${f.label}» يجب أن تكون رقماً صحيحاً بلا كسور.`
      if (f.min != null && n < f.min) return `قيمة «${f.label}» يجب ألا تقل عن ${f.min}${unit}.`
      if (f.max != null && n > f.max) return `قيمة «${f.label}» يجب ألا تزيد عن ${f.max}${unit}.`
      return null
    }
    case "text": {
      const raw = String(d)
      if (raw.length > 200) return `قيمة «${f.label}» أطول من المسموح (200 حرف).`
      return null
    }
    case "components":
      // the number of components is data (schema.componentOptions), never a literal here: it is
      // lib/grade-components.ts that decides how many there are, and the server checks the same way
      return componentTotal > 0 && componentCount >= componentTotal
        ? `لا يمكن إعفاء الطالب العايد من كل مكونات الدرجة في «${f.label}» — اترك مكوّناً واحداً على الأقل.`
        : null
    case "numberMap": {
      const rows = d as MapRow[]
      for (const r of rows) {
        if (!r.k.trim()) return `«${f.label}»: يوجد صف بلا ${f.mapKeyLabel ?? "مفتاح"}.`
        const n = num(r.v)
        if (n === null) return `«${f.label}» — ${f.mapKeyLabel ?? "المفتاح"} ${r.k}: القيمة يجب أن تكون رقماً.`
        if (f.min != null && n < f.min) return `«${f.label}» — ${f.mapKeyLabel ?? "المفتاح"} ${r.k}: القيمة يجب ألا تقل عن ${f.min}.`
        if (f.max != null && n > f.max) return `«${f.label}» — ${f.mapKeyLabel ?? "المفتاح"} ${r.k}: القيمة يجب ألا تزيد عن ${f.max}.`
      }
      const keys = rows.map((r) => r.k.trim())
      if (new Set(keys).size !== keys.length) return `«${f.label}»: ${f.mapKeyLabel ?? "المفتاح"} مكرر.`
      return null
    }
    case "rowTable": {
      const rows = d as TableRow[]
      if (rows.length === 0) return `«${f.label}» لا يمكن أن يكون فارغاً — أضف صفاً واحداً على الأقل.`
      for (const [i, row] of rows.entries()) {
        for (const col of f.columns ?? []) {
          const cell = row.cells[col.key] ?? ""
          if (col.kind === "number") {
            const n = num(cell)
            if (cell.trim() === "" || n === null) return `«${f.label}» — الصف ${i + 1}: «${col.label}» يجب أن يكون رقماً.`
            if (col.min != null && n < col.min) return `«${f.label}» — الصف ${i + 1}: «${col.label}» يجب ألا يقل عن ${col.min}.`
            if (col.max != null && n > col.max) return `«${f.label}» — الصف ${i + 1}: «${col.label}» يجب ألا يزيد عن ${col.max}.`
          } else if (!cell.trim()) {
            return `«${f.label}» — الصف ${i + 1}: «${col.label}» مطلوب.`
          }
        }
      }
      return null
    }
    case "json":
      try {
        JSON.parse(String(d))
        return null
      } catch {
        return `«${f.label}»: صيغة JSON غير صحيحة.`
      }
    default:
      return null
  }
}

function crossErrors(rules: CrossRule[], effective: Record<string, unknown>, labelOf: (k: string) => string): Record<string, string> {
  const out: Record<string, string> = {}
  const put = (k: string, m: string) => {
    if (!out[k]) out[k] = m
  }
  for (const rule of rules) {
    switch (rule.type) {
      case "lte": {
        const a = num(effective[rule.a])
        const b = num(effective[rule.b])
        if (a === null || b === null) break
        if (rule.zeroDisables && (a === 0 || b === 0)) break // 0 = «الشرط معطَّل» on this pair only
        if (a > b) put(rule.a, rule.message)
        break
      }
      case "ascending": {
        for (let i = 1; i < rule.keys.length; i++) {
          const prev = num(effective[rule.keys[i - 1]])
          const cur = num(effective[rule.keys[i]])
          if (prev === null || cur === null) continue
          if (prev > cur) {
            put(rule.keys[i], rule.message)
            break
          }
        }
        break
      }
      case "complementLte": {
        const a = num(effective[rule.a])
        const b = num(effective[rule.b])
        if (a === null || b === null) break
        if (100 - a > b) put(rule.a, rule.message)
        break
      }
      case "mapAscending": {
        const map = effective[rule.key]
        if (!isPlainObject(map)) break
        const rows = Object.entries(map)
          .map(([k, v]) => ({ k: Number(k), v: num(v) }))
          .filter((r) => Number.isFinite(r.k) && r.v !== null)
          .sort((x, y) => x.k - y.k)
        for (let i = 1; i < rows.length; i++) {
          if ((rows[i].v as number) < (rows[i - 1].v as number)) {
            put(rule.key, rule.message)
            break
          }
        }
        break
      }
      case "mapValuesLte": {
        const map = effective[rule.key]
        const limit = num(effective[rule.limit])
        if (!isPlainObject(map) || limit === null) break
        if (Object.values(map).some((v) => (num(v) ?? 0) > limit)) put(rule.key, `${rule.message} (${labelOf(rule.limit)}: ${limit})`)
        break
      }
      case "mapKeysInteger": {
        const map = effective[rule.key]
        if (!isPlainObject(map)) break
        if (Object.keys(map).some((k) => k.trim() === "" || !Number.isInteger(Number(k.trim())))) put(rule.key, rule.message)
        break
      }
      case "uniqueRows": {
        const rows = effective[rule.key]
        if (!Array.isArray(rows)) break
        const seen = new Set<string>()
        for (const row of rows) {
          if (!isPlainObject(row)) continue
          const id = String(num(row[rule.by]) ?? row[rule.by])
          if (seen.has(id)) {
            put(rule.key, rule.message)
            break
          }
          seen.add(id)
        }
        break
      }
    }
  }
  return out
}

// ───────────────────────────── display helpers ─────────────────────────────

/** The platform default, printed the way it is edited, for the «الافتراضي: …» line. */
function describeDefault(f: FieldSchema): string {
  if (!f.hasDefault) return "—"
  const v = f.default
  switch (f.kind) {
    case "boolean":
      return v ? "مُفعَّل" : "متوقف"
    case "components":
      return String(v ?? "").trim() === "" ? "بدون إعفاء" : String(v)
    case "numberMap":
      return isPlainObject(v)
        ? Object.entries(v)
            .map(([k, n]) => `${k}: ${n}`)
            .join(" · ")
        : "—"
    case "rowTable":
      // «5 صفوف» told an admin nothing about WHAT he overrode — print the rows themselves.
      return Array.isArray(v)
        ? v
            .map((r) => (f.columns ?? []).map((c) => String((r as Record<string, unknown>)[c.key] ?? "")).join(" "))
            .join(" · ")
        : "—"
    case "json":
      return "قيمة مركّبة"
    default:
      return `${v}`
  }
}

/** أبواب اللائحة التي لها محرّك ومحرّر خاص بها — تُدار من شاشتها لا من هنا (حتى لا يكتب مكانان نفس القيمة). */
const RELATED_SCREENS: { title: string; href: string; note: string }[] = [
  { title: "سُلَّم التقديرات وحالات النتائج (جدول 3)", href: "/institute/exams/result-states", note: "الرموز والنقاط وحدود النسب المئوية لكل تقدير، وحالات: غائب بعذر، غير مكتمل، منسحب، راسب لائحة، محروم." },
  { title: "الرأفة ورفع التقدير", href: "/institute/exams/grade-adjustments", note: "حدود الرأفة (الإجمالي وللمادة) وشروط رفع التقدير — لائحة مستقلة لها إعداداتها." },
  { title: "الخطط الدراسية والمقررات", href: "/institute/departments/plans", note: "جداول الخطة لكل مستوى وفصل وتخصص: المقررات وساعاتها وتوزيع درجاتها والمتطلبات السابقة." },
  { title: "السنوات والفصول الدراسية", href: "/institute/settings/academic-years", note: "تقسيم العام: فصول الدراسة والصيفي وتواريخها." },
  { title: "حجب الطلاب", href: "/institute/students/holds", note: "قواعد حجب النتيجة وأسبابها." },
  { title: "ترحيل الطلاب الناجحين", href: "/institute/students/promotion", note: "قواعد الترقي بين المستويات وتنفيذ دفعة الترحيل." },
]

// ───────────────────────────── page ─────────────────────────────

export default function RegulationsSettingsPage() {
  const [schema, setSchema] = useState<SchemaPayload | null>(null)
  const [draft, setDraft] = useState<Draft>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [query, setQuery] = useState("")
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [showBylaw, setShowBylaw] = useState(true)

  /**
   * Build the draft from a schema payload. The value shown is the one the ENGINES read: the API
   * ships `effective` = getRegulations() (defaults ⊕ this institute's overrides, then normalised —
   * bands sorted, a nameless band dropped, an all-components exemption reset). Falling back to the
   * raw stored blob would show the admin a table the engines had already rewritten behind him.
   */
  const hydrate = useCallback((payload: SchemaPayload) => {
    const next: Draft = {}
    for (const f of payload.fields) {
      const engine = payload.effective?.[f.key]
      const stored = payload.stored[f.key]
      let value = engine !== undefined ? engine : stored !== undefined ? stored : f.default
      // A map is MERGED over its default, exactly as getRegulations() merges levelMinHours: the
      // screen must show the ladder the engines actually read, not the partial blob on disk.
      if (f.kind === "numberMap" && isPlainObject(f.default) && isPlainObject(value)) {
        value = { ...f.default, ...value }
      }
      next[f.key] = toDraft(f, value)
    }
    setDraft(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(API)
        // A denial is not an outage. The bylaw API answers only «إعدادات المعهد»; without that
        // permission the screen used to render an empty form under «فشل في جلب اللائحة», which
        // reads as a broken system rather than as a missing صلاحية.
        if (res.status === 401 || res.status === 403) {
          if (!cancelled) setDenied(true)
          return
        }
        if (!res.ok) throw new Error("load failed")
        const data: SchemaPayload = await res.json()
        if (cancelled) return
        setSchema(data)
        hydrate(data)
      } catch {
        if (!cancelled) setError("فشل في جلب اللائحة")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [hydrate])

  const fields = useMemo(() => schema?.fields ?? [], [schema])
  const fieldByKey = useMemo(() => new Map(fields.map((f) => [f.key, f] as [string, FieldSchema])), [fields])
  const labelOf = useCallback((k: string) => fieldByKey.get(k)?.label ?? k, [fieldByKey])

  /** Keys whose current value differs from the platform default — the institute's own bylaw. */
  const changedKeys = useMemo(() => {
    const out = new Set<string>()
    for (const f of fields) {
      const d = draft[f.key]
      if (d === undefined) continue
      if (!f.hasDefault) {
        out.add(f.key)
        continue
      }
      if (canon(f, d) !== canon(f, toDraft(f, f.default))) out.add(f.key)
    }
    return out
  }, [fields, draft])

  /** The bylaw as the engines would read it, used for the cross-field rules. */
  const effective = useMemo(() => {
    const out: Record<string, unknown> = { ...(schema?.defaults ?? {}) }
    for (const f of fields) {
      const d = draft[f.key]
      if (d === undefined) continue
      const v = fromDraft(f, d)
      if (v === undefined) continue
      // Deleting «المستوى 4» from the ladder does NOT delete it — getRegulations() (and the server
      // validator) merge the map back over its default. Cross-checking the un-merged map here would
      // pass a ladder the server then rejects, or worse, hide a ladder that is no longer ascending.
      out[f.key] =
        f.kind === "numberMap" && isPlainObject(f.default) && isPlainObject(v) ? { ...f.default, ...v } : v
    }
    return out
  }, [schema, fields, draft])

  const errors = useMemo(() => {
    const out: Record<string, string> = {}
    for (const f of fields) {
      const d = draft[f.key]
      if (d === undefined) continue
      const componentCount = f.kind === "components" ? String(d).split(",").filter((x) => x.trim()).length : 0
      const e = fieldError(f, d, componentCount, schema?.componentOptions.length ?? 0)
      if (e) out[f.key] = e
    }
    const cross = crossErrors(schema?.rules ?? [], effective, labelOf)
    for (const [k, m] of Object.entries(cross)) if (!out[k]) out[k] = m
    return out
  }, [fields, draft, schema, effective, labelOf])

  const errorList = useMemo(
    () => Object.entries(errors).map(([key, message]) => ({ key, label: labelOf(key), message })),
    [errors, labelOf],
  )

  const setValue = (key: string, value: DraftValue) => setDraft((prev) => ({ ...prev, [key]: value }))

  const resetField = (f: FieldSchema) => {
    if (!f.hasDefault) return
    setValue(f.key, toDraft(f, f.default))
  }

  const resetGroup = (groupId: string) => {
    setDraft((prev) => {
      const next = { ...prev }
      for (const f of fields) if (f.group === groupId && f.hasDefault) next[f.key] = toDraft(f, f.default)
      return next
    })
  }

  const resetAll = () => {
    setDraft((prev) => {
      const next = { ...prev }
      for (const f of fields) if (f.hasDefault) next[f.key] = toDraft(f, f.default)
      return next
    })
  }

  async function handleSave() {
    if (!schema || errorList.length > 0) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      // Only the overrides are persisted: an untouched key keeps falling back to the platform
      // default, so a later correction to the documented bylaw still reaches this institute.
      const value: Record<string, unknown> = {}
      for (const key of changedKeys) {
        const f = fieldByKey.get(key)
        if (!f) continue
        const v = fromDraft(f, draft[key])
        if (v !== undefined) value[key] = v
      }
      const res = await fetch(API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 401 || res.status === 403) {
        throw new Error(SAVE_DENIED)
      }
      if (!res.ok) throw new Error(data?.error || "save failed")
      setSaved(true)
      setSchema((prev) => (prev ? { ...prev, stored: (data?.stored as Record<string, unknown>) ?? value } : prev))
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error && e.message !== "save failed" ? e.message : "فشل في حفظ اللائحة")
    } finally {
      setSaving(false)
    }
  }

  const matchesQuery = (f: FieldSchema) => {
    const q = query.trim()
    if (!q) return true
    return `${f.label} ${f.hint} ${f.bylaw ?? ""} ${f.key}`.toLowerCase().includes(q.toLowerCase())
  }

  const visibleGroups = useMemo(() => {
    const groups = schema?.groups ?? []
    return groups
      .map((g) => ({
        group: g,
        fields: fields.filter((f) => f.group === g.id && matchesQuery(f) && (!onlyChanged || changedKeys.has(f.key))),
        totalInGroup: fields.filter((f) => f.group === g.id).length,
        changedInGroup: fields.filter((f) => f.group === g.id && changedKeys.has(f.key)).length,
      }))
      .filter((g) => g.fields.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, fields, query, onlyChanged, changedKeys])

  // ───────── field renderer ─────────

  function renderControl(f: FieldSchema) {
    const d = draft[f.key]
    if (d === undefined) return null
    const invalid = Boolean(errors[f.key])
    const ring = invalid ? "border-red-500 focus-visible:ring-red-500" : ""

    switch (f.kind) {
      case "boolean":
        return (
          <div className="flex items-center gap-3 pt-1">
            <Switch checked={Boolean(d)} onCheckedChange={(v) => setValue(f.key, v)} />
            <span className="text-sm">{d ? "مُفعَّل" : "متوقف"}</span>
          </div>
        )

      case "number":
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step={f.step ?? 1}
              value={String(d)}
              onChange={(e) => setValue(f.key, e.target.value)}
              className={ring}
            />
            {f.unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{f.unit}</span>}
          </div>
        )

      case "text":
        if (f.options?.length) {
          return (
            <Select value={String(d)} onValueChange={(v) => setValue(f.key, v)}>
              <SelectTrigger className={ring}>
                <SelectValue placeholder="اختر…" />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        return <Input value={String(d)} onChange={(e) => setValue(f.key, e.target.value)} className={ring} />

      case "components": {
        const selected = String(d).split(",").map((x) => x.trim()).filter(Boolean)
        const options = schema?.componentOptions ?? []
        return (
          <div className="grid sm:grid-cols-2 gap-2 pt-1">
            {options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(o.value)}
                  onCheckedChange={(v) => {
                    const next = v === true ? [...selected, o.value] : selected.filter((k) => k !== o.value)
                    // keep the canonical order of the options so the CSV is stable
                    setValue(f.key, options.filter((x) => next.includes(x.value)).map((x) => x.value).join(","))
                  }}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        )
      }

      case "numberMap": {
        const rows = d as MapRow[]
        const update = (id: string, patch: Partial<MapRow>) =>
          setValue(f.key, rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
        return (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16 shrink-0">{f.mapKeyLabel}</span>
                <Input value={r.k} onChange={(e) => update(r.id, { k: e.target.value })} className="w-20" />
                <Input
                  type="number"
                  step={f.step ?? 1}
                  value={r.v}
                  onChange={(e) => update(r.id, { v: e.target.value })}
                  className="flex-1"
                />
                {f.unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{f.unit}</span>}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setValue(f.key, rows.filter((x) => x.id !== r.id))}
                  aria-label="حذف الصف"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue(f.key, [...rows, { id: nextId(), k: "", v: "" }])}
            >
              <Plus className="w-4 h-4 ml-1" />
              إضافة صف
            </Button>
          </div>
        )
      }

      case "rowTable": {
        const rows = d as TableRow[]
        const cols = f.columns ?? []
        const update = (id: string, colKey: string, val: string) =>
          setValue(f.key, rows.map((r) => (r.id === id ? { ...r, cells: { ...r.cells, [colKey]: val } } : r)))
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {cols.map((c) => (
                <span key={c.key} className="flex-1">
                  {c.label}
                  {c.unit ? ` (${c.unit})` : ""}
                </span>
              ))}
              <span className="w-9 shrink-0" />
            </div>
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                {cols.map((c) => (
                  <Input
                    key={c.key}
                    type={c.kind === "number" ? "number" : "text"}
                    step={c.step ?? 1}
                    value={r.cells[c.key] ?? ""}
                    onChange={(e) => update(r.id, c.key, e.target.value)}
                    className="flex-1"
                  />
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setValue(f.key, rows.filter((x) => x.id !== r.id))}
                  aria-label="حذف الصف"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setValue(f.key, [
                  ...rows,
                  { id: nextId(), cells: Object.fromEntries(cols.map((c) => [c.key, ""] as [string, string])) },
                ])
              }
            >
              <Plus className="w-4 h-4 ml-1" />
              إضافة صف
            </Button>
          </div>
        )
      }

      case "json":
        return (
          <textarea
            dir="ltr"
            rows={6}
            value={String(d)}
            onChange={(e) => setValue(f.key, e.target.value)}
            className={`w-full rounded-md border bg-background p-2 font-mono text-xs ${invalid ? "border-red-500" : "border-input"}`}
          />
        )
    }
  }

  function renderField(f: FieldSchema) {
    const wide = f.kind === "numberMap" || f.kind === "rowTable" || f.kind === "json" || f.kind === "components"
    const changed = changedKeys.has(f.key)
    return (
      <div key={f.key} className={`rounded-lg border p-3 ${wide ? "md:col-span-2" : ""} ${changed ? "border-institute-blue/40 bg-institute-blue/5" : "border-transparent"}`}>
        <div className="flex items-start justify-between gap-2">
          <Label className="text-sm font-medium leading-6">{f.label}</Label>
          <div className="flex items-center gap-1 shrink-0">
            {changed && <Badge variant="secondary" className="text-[10px]">مخصص</Badge>}
            {!f.documented && (
              <Badge variant="outline" className="text-[10px]">
                بند غير موصوف
              </Badge>
            )}
            {changed && f.hasDefault && (
              <Button type="button" variant="ghost" size="icon" onClick={() => resetField(f)} aria-label="استعادة الافتراضي">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-1">{renderControl(f)}</div>

        <p className="text-xs text-muted-foreground mt-1.5 leading-5">{f.hint}</p>

        {showBylaw && f.bylaw && (
          <p className="text-[11px] text-muted-foreground/90 mt-1.5 border-r-2 border-institute-blue/40 pr-2 leading-5">
            <BookOpen className="w-3 h-3 inline-block ml-1 align-[-1px]" />
            نص اللائحة: {f.bylaw}
          </p>
        )}

        <p className="text-[11px] text-muted-foreground mt-1">
          الافتراضي في المنصة: <span className="font-medium">{describeDefault(f)}</span>
        </p>

        {errors[f.key] && <p className="text-xs text-red-600 mt-1.5">{errors[f.key]}</p>}
      </div>
    )
  }

  // ───────── render ─────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-7 h-7 text-institute-blue" />
            اللائحة الأكاديمية للمعهد
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            هذه الشاشة تحتوي لائحة المعهد كاملة: كل قيمة تقرأها محركات النظام (التسجيل، الحضور، النتائج،
            الإنذار، الترقي، التخرج) تُدخَل من هنا بيد إدارة المعهد. القيمة التي لا تُعدَّل تبقى على الافتراضي
            الموثَّق في المنصة.
          </p>
        </div>
        {!denied && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-3">
              {saved && <span className="text-sm text-green-600">تم الحفظ</span>}
              <Button onClick={handleSave} disabled={saving || loading || errorList.length > 0}>
                <Save className="w-4 h-4 ml-2" />
                {saving ? "جارٍ الحفظ..." : "حفظ اللائحة"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              القيم المختلفة عن الافتراضي: <span className="font-semibold">{changedKeys.size}</span> من {fields.length}
            </div>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>تعذّر الحفظ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {errorList.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>راجِع {errorList.length} قيمة قبل الحفظ</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pr-5 space-y-1 mt-1">
              {errorList.map((e) => (
                <li key={e.key}>{e.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {denied && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>صلاحية غير متاحة</AlertTitle>
          <AlertDescription>{VIEW_DENIED}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جارٍ تحميل اللائحة...</span>
        </div>
      ) : denied ? null : (
        <>
          <Card>
            <CardContent className="pt-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث في بنود اللائحة (مثال: غياب، ساعات، شرف، تخرج)"
                  className="pr-9"
                />
              </div>
              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <Switch checked={onlyChanged} onCheckedChange={setOnlyChanged} />
                إظهار المُعدَّل فقط
              </label>
              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <Switch checked={showBylaw} onCheckedChange={setShowBylaw} />
                إظهار نص اللائحة
              </label>
              <Button type="button" variant="outline" size="sm" onClick={resetAll} disabled={changedKeys.size === 0}>
                <RotateCcw className="w-4 h-4 ml-1" />
                استعادة الافتراضي للكل
              </Button>
            </CardContent>
          </Card>

          {visibleGroups.length === 0 && (
            <p className="text-sm text-muted-foreground py-10 text-center">لا توجد بنود مطابقة للبحث.</p>
          )}

          {visibleGroups.map(({ group, fields: groupFields, totalInGroup, changedInGroup }) => (
            <Card key={group.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {group.title}
                    {changedInGroup > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{changedInGroup} مخصص</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {group.description} — {totalInGroup} بنداً.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => resetGroup(group.id)}
                  disabled={changedInGroup === 0}
                >
                  <RotateCcw className="w-4 h-4 ml-1" />
                  استعادة الافتراضي لهذا القسم
                </Button>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">{groupFields.map(renderField)}</CardContent>
            </Card>
          ))}

          {/* أبواب اللائحة التي لها شاشة خاصة. تُذكر هنا حتى تبقى اللائحة كاملة أمام المراجِع، ولا تُحرَّر
              من مكانين فيختلف ما يقرؤه المحرك عمّا تعرضه الشاشة. */}
          <Card>
            <CardHeader>
              <CardTitle>أبواب أخرى من اللائحة</CardTitle>
              <CardDescription>
                هذه الأبواب لها جداولها الخاصة وتُدخَل من شاشاتها — وهي جزء من لائحة المعهد ويجب مراجعتها معها.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {RELATED_SCREENS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="rounded-lg border p-3 hover:bg-muted/50 transition-colors block"
                >
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    {s.title}
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </span>
                  <span className="text-xs text-muted-foreground block mt-1 leading-5">{s.note}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
