"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TrialBalanceAccount {
  id: string
  code: string
  name: string
  type: "asset" | "liability" | "equity" | "revenue" | "expense"
  debitBalance: number
  creditBalance: number
  level: number
}

interface TrialBalanceTableProps {
  accounts: TrialBalanceAccount[]
  period: {
    from: string
    to: string
  }
  onExport?: (format: "pdf" | "excel") => void
  onPrint?: () => void
}

export function TrialBalanceTable({
  accounts,
  period,
  onExport,
  onPrint,
}: TrialBalanceTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  const formatCurrency = (amount: number) => {
    if (amount === 0) return "-"
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
    }).format(amount)
  }

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.code.includes(searchTerm)
    const matchesType = filterType === "all" || account.type === filterType
    return matchesSearch && matchesType
  })

  const totals = filteredAccounts.reduce(
    (acc, account) => ({
      debit: acc.debit + account.debitBalance,
      credit: acc.credit + account.creditBalance,
    }),
    { debit: 0, credit: 0 }
  )

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01

  const typeLabels: Record<string, string> = {
    asset: "أصول",
    liability: "خصوم",
    equity: "حقوق ملكية",
    revenue: "إيرادات",
    expense: "مصروفات",
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              ميزان المراجعة
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
            </CardTitle>
            <CardDescription>
              الفترة من {period.from} إلى {period.to}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport?.("excel")}>
              <FileSpreadsheet className="h-4 w-4 ml-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport?.("pdf")}>
              <FileText className="h-4 w-4 ml-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* الفلاتر */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالكود أو الاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 ml-2" />
              <SelectValue placeholder="تصفية حسب النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="asset">أصول</SelectItem>
              <SelectItem value="liability">خصوم</SelectItem>
              <SelectItem value="equity">حقوق ملكية</SelectItem>
              <SelectItem value="revenue">إيرادات</SelectItem>
              <SelectItem value="expense">مصروفات</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* الجدول */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">الكود</TableHead>
                <TableHead>اسم الحساب</TableHead>
                <TableHead className="w-[100px] text-center">النوع</TableHead>
                <TableHead className="w-[150px] text-left">مدين</TableHead>
                <TableHead className="w-[150px] text-left">دائن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow
                  key={account.id}
                  className={cn(
                    account.level === 0 && "bg-muted/30 font-semibold",
                    account.level === 1 && "font-medium"
                  )}
                >
                  <TableCell className="font-mono text-muted-foreground">
                    {account.code}
                  </TableCell>
                  <TableCell
                    style={{ paddingRight: `${account.level * 20 + 16}px` }}
                  >
                    {account.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[account.type]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-left font-mono",
                      account.debitBalance > 0 && "text-blue-600"
                    )}
                  >
                    {formatCurrency(account.debitBalance)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-left font-mono",
                      account.creditBalance > 0 && "text-green-600"
                    )}
                  >
                    {formatCurrency(account.creditBalance)}
                  </TableCell>
                </TableRow>
              ))}

              {/* صف الإجمالي */}
              <TableRow className="bg-primary/5 font-bold border-t-2">
                <TableCell colSpan={3} className="text-center">
                  الإجمالي
                </TableCell>
                <TableCell className="text-left font-mono text-blue-600">
                  {formatCurrency(totals.debit)}
                </TableCell>
                <TableCell className="text-left font-mono text-green-600">
                  {formatCurrency(totals.credit)}
                </TableCell>
              </TableRow>

              {/* صف الفرق (إن وجد) */}
              {!isBalanced && (
                <TableRow className="bg-red-50 dark:bg-red-900/20">
                  <TableCell colSpan={3} className="text-center text-red-600">
                    الفرق (غير متوازن)
                  </TableCell>
                  <TableCell
                    colSpan={2}
                    className="text-center font-mono text-red-600"
                  >
                    {formatCurrency(Math.abs(totals.debit - totals.credit))}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ملخص إحصائي */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-muted-foreground">إجمالي الأصول</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(
                filteredAccounts
                  .filter((a) => a.type === "asset")
                  .reduce((sum, a) => sum + a.debitBalance, 0)
              )}
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-muted-foreground">إجمالي الخصوم</p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(
                filteredAccounts
                  .filter((a) => a.type === "liability")
                  .reduce((sum, a) => sum + a.creditBalance, 0)
              )}
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(
                filteredAccounts
                  .filter((a) => a.type === "revenue")
                  .reduce((sum, a) => sum + a.creditBalance, 0)
              )}
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(
                filteredAccounts
                  .filter((a) => a.type === "expense")
                  .reduce((sum, a) => sum + a.debitBalance, 0)
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
