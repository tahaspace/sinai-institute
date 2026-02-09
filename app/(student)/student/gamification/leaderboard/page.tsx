"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LeaderboardTable, type LeaderboardEntry } from "@/components/gamification"
import { Trophy, Users, Calendar, School, Crown, Medal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// Mock data
const schoolLeaderboard: LeaderboardEntry[] = [
  { rank: 1, previousRank: 1, userId: "1", name: "أحمد محمد علي", points: 5850, level: 10, badges: 25 },
  { rank: 2, previousRank: 3, userId: "2", name: "سارة أحمد حسن", points: 5720, level: 9, badges: 22 },
  { rank: 3, previousRank: 2, userId: "3", name: "محمد إبراهيم", points: 5650, level: 9, badges: 24 },
  { rank: 4, previousRank: 4, userId: "4", name: "فاطمة علي", points: 5400, level: 8, badges: 20 },
  { rank: 5, previousRank: 6, userId: "current", name: "أنت", points: 2400, level: 6, badges: 10, isCurrentUser: true },
  { rank: 6, previousRank: 5, userId: "6", name: "عمر حسين", points: 2350, level: 6, badges: 11 },
  { rank: 7, previousRank: 7, userId: "7", name: "نور محمد", points: 2200, level: 5, badges: 9 },
  { rank: 8, previousRank: 9, userId: "8", name: "ريم أحمد", points: 2100, level: 5, badges: 8 },
  { rank: 9, previousRank: 8, userId: "9", name: "يوسف علي", points: 2050, level: 5, badges: 10 },
  { rank: 10, previousRank: 10, userId: "10", name: "مريم حسن", points: 2000, level: 5, badges: 7 },
]

const classLeaderboard: LeaderboardEntry[] = [
  { rank: 1, previousRank: 2, userId: "current", name: "أنت", points: 2400, level: 6, badges: 10, isCurrentUser: true },
  { rank: 2, previousRank: 1, userId: "c2", name: "كريم محمود", points: 2350, level: 6, badges: 9 },
  { rank: 3, previousRank: 3, userId: "c3", name: "هدى علي", points: 2200, level: 5, badges: 8 },
  { rank: 4, previousRank: 5, userId: "c4", name: "أمير حسن", points: 2100, level: 5, badges: 7 },
  { rank: 5, previousRank: 4, userId: "c5", name: "ليلى محمد", points: 2050, level: 5, badges: 6 },
]

const weeklyLeaderboard: LeaderboardEntry[] = [
  { rank: 1, previousRank: 3, userId: "w1", name: "يحيى أحمد", points: 450, level: 7, badges: 14 },
  { rank: 2, previousRank: 1, userId: "current", name: "أنت", points: 340, level: 6, badges: 10, isCurrentUser: true },
  { rank: 3, previousRank: 2, userId: "w3", name: "دينا علي", points: 320, level: 6, badges: 12 },
  { rank: 4, previousRank: 4, userId: "w4", name: "طارق محمد", points: 290, level: 5, badges: 9 },
  { rank: 5, previousRank: 6, userId: "w5", name: "هند حسين", points: 250, level: 5, badges: 8 },
]

const topStudents = schoolLeaderboard.slice(0, 3)

export default function LeaderboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">لوحة المتصدرين</h1>
        <p className="text-muted-foreground">تنافس مع زملائك واحصل على أعلى الترتيب</p>
      </div>

      {/* Top 3 Podium */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            أفضل 3 طلاب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-center gap-4 pt-8">
            {/* Second place */}
            <div className="text-center">
              <div className="relative mb-2">
                <Avatar className="w-16 h-16 mx-auto border-4 border-gray-400">
                  <AvatarImage src={topStudents[1]?.avatar} />
                  <AvatarFallback>{topStudents[1]?.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                  2
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-t-lg p-4 h-24 flex flex-col justify-end">
                <p className="font-bold text-sm truncate">{topStudents[1]?.name}</p>
                <p className="text-xs text-muted-foreground">{topStudents[1]?.points.toLocaleString("ar-EG")} نقطة</p>
              </div>
            </div>

            {/* First place */}
            <div className="text-center -mb-4">
              <div className="relative mb-2">
                <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-1" />
                <Avatar className="w-20 h-20 mx-auto border-4 border-yellow-500">
                  <AvatarImage src={topStudents[0]?.avatar} />
                  <AvatarFallback>{topStudents[0]?.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">
                  1
                </div>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-t-lg p-4 h-32 flex flex-col justify-end">
                <p className="font-bold truncate">{topStudents[0]?.name}</p>
                <p className="text-sm text-muted-foreground">{topStudents[0]?.points.toLocaleString("ar-EG")} نقطة</p>
                <Badge className="mt-1 bg-yellow-500">بطل المدرسة</Badge>
              </div>
            </div>

            {/* Third place */}
            <div className="text-center">
              <div className="relative mb-2">
                <Avatar className="w-16 h-16 mx-auto border-4 border-amber-600">
                  <AvatarImage src={topStudents[2]?.avatar} />
                  <AvatarFallback>{topStudents[2]?.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                  3
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-t-lg p-4 h-20 flex flex-col justify-end">
                <p className="font-bold text-sm truncate">{topStudents[2]?.name}</p>
                <p className="text-xs text-muted-foreground">{topStudents[2]?.points.toLocaleString("ar-EG")} نقطة</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Rank Card */}
      <Card className="bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">#5</span>
              </div>
              <div>
                <p className="font-bold">ترتيبك في المدرسة</p>
                <p className="text-sm text-muted-foreground">2,400 نقطة • المستوى 6</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">للوصول للمركز #4</p>
              <p className="font-bold text-primary">يحتاج 1,000 نقطة</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="school" className="space-y-6">
        <TabsList>
          <TabsTrigger value="school">
            <School className="w-4 h-4 ml-2" />
            المدرسة
          </TabsTrigger>
          <TabsTrigger value="class">
            <Users className="w-4 h-4 ml-2" />
            الفصل
          </TabsTrigger>
          <TabsTrigger value="weekly">
            <Calendar className="w-4 h-4 ml-2" />
            هذا الأسبوع
          </TabsTrigger>
        </TabsList>

        <TabsContent value="school">
          <LeaderboardTable
            entries={schoolLeaderboard}
            title="ترتيب طلاب المدرسة"
          />
        </TabsContent>

        <TabsContent value="class">
          <LeaderboardTable
            entries={classLeaderboard}
            title="ترتيب طلاب الفصل"
          />
        </TabsContent>

        <TabsContent value="weekly">
          <LeaderboardTable
            entries={weeklyLeaderboard}
            title="متصدري هذا الأسبوع"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
