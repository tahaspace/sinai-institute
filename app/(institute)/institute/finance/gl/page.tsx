"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Plus, Trash2, CheckCircle2, RotateCcw, Lock, Unlock, Landmark } from "lucide-react"

interface Account { id: string; code: string; nameAr: string; type: string; normalSide: string; isPostable: boolean; isActive: boolean }
interface JLine { account: string; debit: number; credit: number; memo: string | null }
interface JEntry { id: string; entryNo: string; entryDate: string; memo: string | null; sourceType: string; status: string; period: string; debit: number; lines: JLine[] }
interface Period { id: string; code: string; status: string }
interface FY { id: string; code: string; status: string; periods: Period[] }
type DraftLine = { accountCode: string; debit: string; credit: string; memo: string }

const STATUS_CLS: Record<string, string> = { POSTED: "bg-green-100 text-green-700", DRAFT: "bg-amber-100 text-amber-700", REVERSED: "bg-gray-100 text-gray-500" }

export default function GeneralLedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<JEntry[]>([])
  const [years, setYears] = useState<FY[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [draftDate, setDraftDate] = useState(new Date().toISOString().slice(0, 10))
  const [draftMemo, setDraftMemo] = useState("")
  const [draftLines, setDraftLines] = useState<DraftLine[]>([{ accountCode: "", debit: "", credit: "", memo: "" }, { accountCode: "", debit: "", credit: "", memo: "" }])

  const load = useCallback(async () => {
    setError(null)
    try {
      const [a, j, p] = await Promise.all([
        fetch("/api/institute/finance/gl/accounts"),
        fetch("/api/institute/finance/gl/journal"),
        fetch("/api/institute/finance/periods"),
      ])
      if (a.ok) setAccounts((await a.json()).accounts ?? [])
      if (j.ok) setEntries((await j.json()).entries ?? [])
      if (p.ok) setYears((await p.json()).fiscalYears ?? [])
    } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  const postable = accounts.filter((a) => a.isPostable && a.isActive)
  const draftDebit = draftLines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const draftCredit = draftLines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const balanced = draftDebit > 0 && Math.abs(draftDebit - draftCredit) < 0.005

  async function act(url: string, opts: RequestInit, okMsg: string) {
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch(url, opts)
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "فشل تنفيذ الإجراء")
      setNotice(okMsg)
      await load()
      return j
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  const seedDefault = () => act("/api/institute/finance/gl/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "seed-default" }) }, "تم إنشاء دليل الحسابات الافتراضي")
  const createYear = () => act("/api/institute/finance/periods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year: new Date().getFullYear() }) }, "تم إنشاء السنة المالية")
  const closePeriod = (id: string, reopen: boolean) => act(`/api/institute/finance/periods/${id}/close`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: reopen ? "reopen" : "close" }) }, reopen ? "تم فتح الفترة" : "تم إغلاق الفترة")
  const postEntry = (id: string) => act(`/api/institute/finance/gl/journal/${id}/post`, { method: "POST" }, "تم ترحيل القيد")
  const reverseEntry = (id: string) => act(`/api/institute/finance/gl/journal/${id}/reverse`, { method: "POST" }, "تم عكس القيد")

  async function createDraft() {
    const lines = draftLines.filter((l) => l.accountCode && (Number(l.debit) || Number(l.credit)))
      .map((l) => ({ accountCode: l.accountCode, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, memo: l.memo || undefined }))
    const r = await act("/api/institute/finance/gl/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryDate: draftDate, memo: draftMemo, lines }) }, "تم إنشاء القيد (مسودة)")
    if (r?.ok) { setDraftMemo(""); setDraftLines([{ accountCode: "", debit: "", credit: "", memo: "" }, { accountCode: "", debit: "", credit: "", memo: "" }]) }
  }
  const setLine = (i: number, k: keyof DraftLine, v: string) => setDraftLines((p) => p.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="w-7 h-7 text-institute-gold" /> الأستاذ العام (القيود المحاسبية)</h1>
        <p className="text-muted-foreground">دليل الحسابات · قيود اليومية بنظام القيد المزدوج · الفترات المحاسبية</p>
      </div>
      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}
      {notice && <Card><CardContent className="p-4 text-center text-green-700">{notice}</CardContent></Card>}

      <Tabs defaultValue="journal">
        <TabsList>
          <TabsTrigger value="journal"><BookOpen className="w-4 h-4 ml-1" /> القيود</TabsTrigger>
          <TabsTrigger value="accounts">دليل الحسابات</TabsTrigger>
          <TabsTrigger value="periods">الفترات</TabsTrigger>
        </TabsList>

        {/* Journal */}
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>قيد يومية جديد</CardTitle>
              <CardDescription>أضف سطورًا مدينة ودائنة متوازنة، ثم احفظ كمسودة ورحّلها.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 items-end">
                <div><label className="text-xs text-muted-foreground">التاريخ</label><Input type="date" className="w-40" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} /></div>
                <div className="flex-1 min-w-48"><label className="text-xs text-muted-foreground">البيان</label><Input value={draftMemo} onChange={(e) => setDraftMemo(e.target.value)} placeholder="وصف القيد" /></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>الحساب</TableHead><TableHead className="text-center w-32">مدين</TableHead><TableHead className="text-center w-32">دائن</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {draftLines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Select value={l.accountCode} onValueChange={(v) => setLine(i, "accountCode", v)}>
                          <SelectTrigger><SelectValue placeholder="اختر حساب" /></SelectTrigger>
                          <SelectContent>{postable.map((a) => <SelectItem key={a.id} value={a.code}>{a.code} — {a.nameAr}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" className="text-center" value={l.debit} onChange={(e) => setLine(i, "debit", e.target.value)} /></TableCell>
                      <TableCell><Input type="number" className="text-center" value={l.credit} onChange={(e) => setLine(i, "credit", e.target.value)} /></TableCell>
                      <TableCell><Button size="sm" variant="ghost" className="text-red-500" disabled={draftLines.length <= 2} onClick={() => setDraftLines((p) => p.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={() => setDraftLines((p) => [...p, { accountCode: "", debit: "", credit: "", memo: "" }])}><Plus className="w-4 h-4 ml-1" /> سطر</Button>
                <div className="flex items-center gap-3 text-sm">
                  <span>مدين: <b>{draftDebit.toFixed(2)}</b></span>
                  <span>دائن: <b>{draftCredit.toFixed(2)}</b></span>
                  <Badge className={balanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{balanced ? "متوازن" : "غير متوازن"}</Badge>
                  <Button onClick={createDraft} disabled={busy || !balanced}>حفظ مسودة</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>دفتر اليومية</CardTitle><CardDescription>{entries.length} قيد</CardDescription></CardHeader>
            <CardContent>
              {entries.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا توجد قيود بعد</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>رقم</TableHead><TableHead>التاريخ</TableHead><TableHead>البيان</TableHead><TableHead className="text-center">القيمة</TableHead><TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">إجراء</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.entryNo}</TableCell>
                        <TableCell>{e.entryDate.slice(0, 10)}</TableCell>
                        <TableCell>{e.memo || <span className="text-muted-foreground">—</span>}<div className="text-[11px] text-muted-foreground">{e.lines.map((l) => l.account.split(" ")[0]).join(" / ")}</div></TableCell>
                        <TableCell className="text-center font-bold">{e.debit.toFixed(2)}</TableCell>
                        <TableCell className="text-center"><Badge className={STATUS_CLS[e.status]}>{e.status}</Badge></TableCell>
                        <TableCell className="text-center">
                          {e.status === "DRAFT" && <Button size="sm" onClick={() => postEntry(e.id)} disabled={busy}><CheckCircle2 className="w-4 h-4 ml-1" /> ترحيل</Button>}
                          {e.status === "POSTED" && <Button size="sm" variant="outline" onClick={() => reverseEntry(e.id)} disabled={busy}><RotateCcw className="w-4 h-4 ml-1" /> عكس</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>دليل الحسابات</CardTitle><CardDescription>{accounts.length} حساب</CardDescription></div>
              {accounts.length === 0 && <Button onClick={seedDefault} disabled={busy}><Plus className="w-4 h-4 ml-1" /> إنشاء الدليل الافتراضي</Button>}
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا يوجد دليل حسابات — أنشئ الدليل الافتراضي للبدء</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">النوع</TableHead><TableHead className="text-center">الطبيعة</TableHead><TableHead className="text-center">قابل للترحيل</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {accounts.map((a) => (
                      <TableRow key={a.id} className={a.isPostable ? "" : "bg-muted/40 font-medium"}>
                        <TableCell className="font-mono">{a.code}</TableCell>
                        <TableCell style={{ paddingRight: `${(a.code.length - 1) * 12}px` }}>{a.nameAr}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{a.type}</Badge></TableCell>
                        <TableCell className="text-center text-xs">{a.normalSide === "DEBIT" ? "مدين" : "دائن"}</TableCell>
                        <TableCell className="text-center">{a.isPostable ? "✓" : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Periods */}
        <TabsContent value="periods">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>الفترات المحاسبية</CardTitle><CardDescription>إغلاق الفترة يمنع الترحيل إليها</CardDescription></div>
              <Button onClick={createYear} disabled={busy}><Plus className="w-4 h-4 ml-1" /> سنة مالية جديدة</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {years.length === 0 ? <p className="p-6 text-center text-muted-foreground">لا توجد سنوات مالية</p> : years.map((y) => (
                <div key={y.id}>
                  <p className="font-medium mb-1">السنة المالية {y.code} <Badge variant="outline">{y.status}</Badge></p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {y.periods.map((p) => (
                      <div key={p.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                        <span className="font-mono">{p.code}</span>
                        <div className="flex items-center gap-1">
                          <Badge className={p.status === "CLOSED" ? "bg-gray-200 text-gray-600" : "bg-green-100 text-green-700"}>{p.status === "CLOSED" ? "مغلقة" : "مفتوحة"}</Badge>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => closePeriod(p.id, p.status === "CLOSED")} disabled={busy} title={p.status === "CLOSED" ? "فتح" : "إغلاق"}>
                            {p.status === "CLOSED" ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
