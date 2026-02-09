"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Trash2,
  Save,
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface JournalLine {
  id: string
  accountId: string
  accountName: string
  debit: number
  credit: number
  description: string
}

interface Account {
  id: string
  code: string
  name: string
}

interface JournalEntryFormProps {
  accounts: Account[]
  onSave: (entry: {
    date: string
    reference: string
    description: string
    lines: JournalLine[]
  }) => void
  onCancel: () => void
  initialData?: {
    date: string
    reference: string
    description: string
    lines: JournalLine[]
  }
}

export function JournalEntryForm({
  accounts,
  onSave,
  onCancel,
  initialData,
}: JournalEntryFormProps) {
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split("T")[0])
  const [reference, setReference] = useState(initialData?.reference || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [lines, setLines] = useState<JournalLine[]>(
    initialData?.lines || [
      { id: "1", accountId: "", accountName: "", debit: 0, credit: 0, description: "" },
      { id: "2", accountId: "", accountName: "", debit: 0, credit: 0, description: "" },
    ]
  )

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
    }).format(amount)
  }

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: Date.now().toString(),
        accountId: "",
        accountName: "",
        debit: 0,
        credit: 0,
        description: "",
      },
    ])
  }

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter((line) => line.id !== id))
    }
  }

  const updateLine = (id: string, field: keyof JournalLine, value: string | number) => {
    setLines(
      lines.map((line) => {
        if (line.id === id) {
          if (field === "accountId") {
            const account = accounts.find((a) => a.id === value)
            return {
              ...line,
              accountId: value as string,
              accountName: account ? `${account.code} - ${account.name}` : "",
            }
          }
          // إذا أدخل مدين، أفرغ الدائن والعكس
          if (field === "debit" && (value as number) > 0) {
            return { ...line, debit: value as number, credit: 0 }
          }
          if (field === "credit" && (value as number) > 0) {
            return { ...line, credit: value as number, debit: 0 }
          }
          return { ...line, [field]: value }
        }
        return line
      })
    )
  }

  const handleSave = () => {
    if (!isBalanced) return
    onSave({
      date,
      reference,
      description,
      lines: lines.filter((line) => line.accountId && (line.debit > 0 || line.credit > 0)),
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {initialData ? "تعديل قيد محاسبي" : "قيد محاسبي جديد"}
        </CardTitle>
        <CardDescription>
          أدخل بيانات القيد المحاسبي. يجب أن يتساوى إجمالي المدين مع إجمالي الدائن.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* بيانات القيد الأساسية */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">التاريخ</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">رقم المرجع</Label>
            <Input
              id="reference"
              placeholder="JV-001"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">البيان</Label>
            <Input
              id="description"
              placeholder="وصف القيد"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* جدول القيود */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 grid grid-cols-12 gap-4 text-sm font-medium">
            <div className="col-span-4">الحساب</div>
            <div className="col-span-3 text-center">مدين</div>
            <div className="col-span-3 text-center">دائن</div>
            <div className="col-span-2">الإجراءات</div>
          </div>

          <div className="divide-y">
            {lines.map((line, index) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="px-4 py-3 grid grid-cols-12 gap-4 items-center"
              >
                <div className="col-span-4">
                  <Select
                    value={line.accountId}
                    onValueChange={(value) => updateLine(line.id, "accountId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <span className="font-mono text-muted-foreground ml-2">
                            {account.code}
                          </span>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={line.debit || ""}
                    onChange={(e) =>
                      updateLine(line.id, "debit", parseFloat(e.target.value) || 0)
                    }
                    className="text-center"
                    dir="ltr"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={line.credit || ""}
                    onChange={(e) =>
                      updateLine(line.id, "credit", parseFloat(e.target.value) || 0)
                    }
                    className="text-center"
                    dir="ltr"
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* إجماليات */}
          <div className="bg-muted/30 px-4 py-3 grid grid-cols-12 gap-4 font-medium border-t-2">
            <div className="col-span-4 flex items-center gap-2">
              <span>الإجمالي</span>
              {isBalanced ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 ml-1" />
                  متوازن
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 ml-1" />
                  غير متوازن
                </Badge>
              )}
            </div>
            <div className="col-span-3 text-center font-mono">
              {formatCurrency(totalDebit)}
            </div>
            <div className="col-span-3 text-center font-mono">
              {formatCurrency(totalCredit)}
            </div>
            <div className="col-span-2" />
          </div>

          {/* الفرق */}
          {!isBalanced && (
            <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm text-red-600 dark:text-red-400">
              الفرق: {formatCurrency(Math.abs(totalDebit - totalCredit))}
              {totalDebit > totalCredit
                ? " (المدين أكبر)"
                : " (الدائن أكبر)"}
            </div>
          )}
        </div>

        {/* إضافة سطر */}
        <Button variant="outline" onClick={addLine} className="w-full">
          <Plus className="h-4 w-4 ml-2" />
          إضافة سطر
        </Button>

        {/* ملاحظات ومرفقات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>ملاحظات إضافية</Label>
            <Textarea placeholder="أي ملاحظات على هذا القيد..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>المرفقات</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                اسحب الملفات هنا أو
              </p>
              <Button variant="link" size="sm">
                اختر ملفات
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 ml-2" />
          إلغاء
        </Button>
        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="h-4 w-4 ml-2" />
            حفظ كمسودة
          </Button>
          <Button onClick={handleSave} disabled={!isBalanced}>
            <CheckCircle className="h-4 w-4 ml-2" />
            ترحيل القيد
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
