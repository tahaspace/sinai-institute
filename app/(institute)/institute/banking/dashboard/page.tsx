"use client"

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

// الحسابات البنكية للمعهد
const bankAccounts = [
  {
    id: 1,
    bankName: "البنك الأهلي المصري",
    accountNo: "9876543210123",
    accountType: "حساب جاري",
    balance: 8500000,
    lastUpdated: "2024-11-20",
    logo: "🏦",
  },
  {
    id: 2,
    bankName: "بنك مصر",
    accountNo: "1234567890987",
    accountType: "حساب توفير",
    balance: 4200000,
    lastUpdated: "2024-11-20",
    logo: "🏛️",
  },
]

// آخر الحركات
const recentTransactions = [
  {
    id: 1,
    date: "2024-11-20",
    description: "تحصيل رسوم طلاب - قسم الهندسة",
    type: "credit",
    amount: 125000,
    bank: "البنك الأهلي المصري",
    reference: "TRX-00542",
  },
  {
    id: 2,
    date: "2024-11-20",
    description: "تحويل رواتب الموظفين",
    type: "debit",
    amount: 850000,
    bank: "بنك مصر",
    reference: "TRX-00541",
  },
  {
    id: 3,
    date: "2024-11-19",
    description: "تحصيل رسوم - قسم الحاسبات",
    type: "credit",
    amount: 95000,
    bank: "البنك الأهلي المصري",
    reference: "TRX-00540",
  },
  {
    id: 4,
    date: "2024-11-19",
    description: "سداد فاتورة كهرباء",
    type: "debit",
    amount: 45000,
    bank: "البنك الأهلي المصري",
    reference: "TRX-00539",
  },
]

export default function InstituteBankingDashboardPage() {
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

  const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0)
  const todayCredits = recentTransactions
    .filter(t => t.type === "credit" && t.date === "2024-11-20")
    .reduce((sum, t) => sum + t.amount, 0)
  const todayDebits = recentTransactions
    .filter(t => t.type === "debit" && t.date === "2024-11-20")
    .reduce((sum, t) => sum + t.amount, 0)

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
                <p className="text-2xl font-bold text-blue-700">{bankAccounts.length}</p>
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
                  {account.logo}
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
