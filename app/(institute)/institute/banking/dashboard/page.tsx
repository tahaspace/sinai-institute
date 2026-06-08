"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  FileText,
  RefreshCw,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface BankAccount {
  id: string
  bankName: string
  accountNo: string
  accountType: string
  balance: number
  lastUpdated: string
}

interface BankTransaction {
  id: string
  date: string
  description: string
  type: "credit" | "debit"
  amount: number
  bank: string
  reference: string
}

interface BankingStats {
  totalBalance: number
  accounts: number
  credits: number
  debits: number
}

export default function InstituteBankingDashboardPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [recentTransactions, setRecentTransactions] = useState<BankTransaction[]>([])
  const [apiStats, setApiStats] = useState<BankingStats>({ totalBalance: 0, accounts: 0, credits: 0, debits: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/banking`)
        if (!res.ok) throw new Error("فشل في جلب البيانات البنكية")
        const json = await res.json()
        if (!cancelled) {
          setBankAccounts(json.bankAccounts ?? [])
          setRecentTransactions(json.recentTransactions ?? [])
          setApiStats(json.stats ?? { totalBalance: 0, accounts: 0, credits: 0, debits: 0 })
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG")
  }

  const totalBalance = apiStats.totalBalance
  const todayCredits = apiStats.credits
  const todayDebits = apiStats.debits

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-institute-blue" />
            لوحة متابعة البنوك
          </h1>
          <p className="text-muted-foreground">
            إدارة ومتابعة الحسابات البنكية للمعهد
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث الأرصدة
          </Button>
          <Button className="bg-institute-blue hover:bg-institute-blue">
            <FileText className="h-4 w-4 ml-2" />
            تسوية بنكية
          </Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل البيانات البنكية...</CardContent></Card>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-institute-blue to-institute-blue dark:from-institute-blue/20 dark:to-institute-blue/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأرصدة</p>
                <p className="text-2xl font-bold text-institute-blue font-mono">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إيداعات اليوم</p>
                <p className="text-2xl font-bold text-green-700 font-mono">
                  {formatCurrency(todayCredits)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">سحوبات اليوم</p>
                <p className="text-2xl font-bold text-red-700 font-mono">
                  {formatCurrency(todayDebits)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">عدد الحسابات</p>
                <p className="text-2xl font-bold text-blue-700">{apiStats.accounts}</p>
              </div>
              <CreditCard className="h-8 w-8 text-institute-blue" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bankAccounts.map((account) => (
          <Card key={account.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-institute-blue dark:bg-institute-blue/30 flex items-center justify-center text-2xl">
                  🏦
                </div>
                <div>
                  <p className="font-semibold">{account.bankName}</p>
                  <p className="text-xs text-muted-foreground">{account.accountType}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">رقم الحساب:</span>
                  <span className="font-mono">{account.accountNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الرصيد:</span>
                  <span className="font-mono font-bold text-institute-blue">
                    {formatCurrency(account.balance)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">آخر تحديث:</span>
                  <span>{formatDate(account.lastUpdated)}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                عرض كشف الحساب
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            آخر الحركات البنكية
          </CardTitle>
          <CardDescription>
            أحدث العمليات على الحسابات البنكية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>المرجع</TableHead>
                <TableHead>البيان</TableHead>
                <TableHead>البنك</TableHead>
                <TableHead className="text-left">المبلغ</TableHead>
                <TableHead>النوع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{formatDate(tx.date)}</TableCell>
                  <TableCell className="font-mono text-sm text-institute-blue">
                    {tx.reference}
                  </TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell className="text-sm">{tx.bank}</TableCell>
                  <TableCell className="text-left font-mono font-bold">
                    <span className={tx.type === "credit" ? "text-institute-blue" : "text-red-600"}>
                      {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      tx.type === "credit"
                        ? "bg-institute-blue text-green-800"
                        : "bg-red-100 text-red-800"
                    }>
                      {tx.type === "credit" ? (
                        <>
                          <ArrowUpRight className="h-3 w-3 ml-1" />
                          إيداع
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="h-3 w-3 ml-1" />
                          سحب
                        </>
                      )}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  )
}
