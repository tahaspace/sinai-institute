"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PointsDisplay,
  LevelProgress,
  BadgeCard,
  LeaderboardTable,
  AchievementNotification,
  type BadgeData,
  type LeaderboardEntry,
} from "@/components/gamification"
import {
  Coins,
  Trophy,
  Medal,
  Gift,
  Target,
  Zap,
  BookOpen,
  Users,
  Star,
} from "lucide-react"
import Link from "next/link"

// Mock data
const mockBadges: BadgeData[] = [
  {
    id: "1",
    name: "بداية موفقة",
    description: "أكمل أول واجب",
    icon: "🎯",
    category: "academic",
    rarity: "common",
    earnedAt: "2024-12-01",
  },
  {
    id: "2",
    name: "طالب ملتزم",
    description: "حضور 30 يوم متواصل",
    icon: "📚",
    category: "attendance",
    rarity: "rare",
    earnedAt: "2024-12-15",
  },
  {
    id: "3",
    name: "متفوق",
    description: "احصل على درجة كاملة في 5 اختبارات",
    icon: "🏆",
    category: "academic",
    rarity: "epic",
    progress: 60,
    requirement: "3/5 اختبارات",
  },
  {
    id: "4",
    name: "أسطورة المدرسة",
    description: "كن الأول على مستوى المدرسة",
    icon: "👑",
    category: "special",
    rarity: "legendary",
    progress: 20,
    requirement: "الترتيب الحالي: #5",
  },
]

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, previousRank: 1, userId: "1", name: "أحمد محمد", points: 2850, level: 8, badges: 15 },
  { rank: 2, previousRank: 3, userId: "2", name: "سارة علي", points: 2720, level: 7, badges: 12 },
  { rank: 3, previousRank: 2, userId: "3", name: "محمد أحمد", points: 2650, level: 7, badges: 14 },
  { rank: 4, previousRank: 5, userId: "current", name: "أنت", points: 2400, level: 6, badges: 10, isCurrentUser: true },
  { rank: 5, previousRank: 4, userId: "5", name: "فاطمة حسن", points: 2350, level: 6, badges: 11 },
]

const pointsHistory = [
  { action: "إكمال واجب الرياضيات", points: 50, date: "اليوم" },
  { action: "حضور حصة البرمجة", points: 10, date: "اليوم" },
  { action: "اختبار اللغة العربية", points: 100, date: "أمس" },
  { action: "مساعدة زميل", points: 30, date: "أمس" },
  { action: "قراءة درس إضافي", points: 20, date: "منذ يومين" },
]

export default function GamificationPage() {
  const [showAchievement, setShowAchievement] = useState(false)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">نظام التحفيز</h1>
          <p className="text-muted-foreground">اجمع النقاط واحصل على الشارات والمكافآت</p>
        </div>
        <Button variant="outline" onClick={() => setShowAchievement(true)}>
          <Gift className="w-4 h-4 ml-2" />
          اختبر الإشعار
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PointsDisplay
          totalPoints={2400}
          weeklyPoints={340}
          monthlyPoints={1200}
          streak={7}
          className="lg:col-span-2"
        />
        <LevelProgress
          currentLevel={6}
          currentXP={2400}
          requiredXP={3000}
        />
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">#4</p>
                <p className="text-xs text-muted-foreground">الترتيب</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Medal className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">10</p>
                <p className="text-xs text-muted-foreground">شارة</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-xs text-muted-foreground">الإنجازات</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">7</p>
                <p className="text-xs text-muted-foreground">يوم متواصل</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="badges">الشارات</TabsTrigger>
          <TabsTrigger value="leaderboard">المتصدرين</TabsTrigger>
          <TabsTrigger value="history">السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Badges */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">آخر الشارات</CardTitle>
                <Link href="/student/gamification/badges">
                  <Button variant="ghost" size="sm">عرض الكل</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {mockBadges.slice(0, 4).map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Leaderboard */}
            <LeaderboardTable
              entries={mockLeaderboard.slice(0, 5)}
              title="أعلى 5 طلاب"
              showRankChange={true}
            />
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">طرق اكتساب النقاط</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: BookOpen, label: "إكمال الدروس", points: "+20" },
                  { icon: Target, label: "حل الواجبات", points: "+50" },
                  { icon: Star, label: "التفوق في الاختبارات", points: "+100" },
                  { icon: Users, label: "مساعدة الزملاء", points: "+30" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-green-600">{item.points}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mockBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard">
          <LeaderboardTable entries={mockLeaderboard} />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>سجل النقاط</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pointsHistory.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{item.action}</p>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-600">+{item.points}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Achievement Notification */}
      <AchievementNotification
        badge={{
          name: "طالب نشيط",
          description: "أكملت 10 واجبات هذا الأسبوع",
          icon: "⭐",
          rarity: "rare",
        }}
        points={100}
        isVisible={showAchievement}
        onClose={() => setShowAchievement(false)}
      />
    </div>
  )
}
