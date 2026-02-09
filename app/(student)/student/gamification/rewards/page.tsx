"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RewardsShop, type Reward } from "@/components/gamification"
import { Gift, History, Coins, Package, CheckCircle } from "lucide-react"

// Mock data
const availableRewards: Reward[] = [
  { id: "1", name: "يوم إجازة إضافي", description: "احصل على يوم إجازة مدرسية إضافي", icon: "🏖️", cost: 5000, category: "privilege", stock: 5 },
  { id: "2", name: "جلوس في الصف الأول", description: "اختر مقعدك في الصف الأول لمدة أسبوع", icon: "💺", cost: 1000, category: "privilege" },
  { id: "3", name: "شهادة تقدير", description: "شهادة تقدير موقعة من المدير", icon: "📜", cost: 2000, category: "digital" },
  { id: "4", name: "خصم 10% على الكتب", description: "كوبون خصم على الكتب من المكتبة", icon: "📚", cost: 1500, category: "discount" },
  { id: "5", name: "وجبة مجانية", description: "وجبة غداء مجانية من الكافتيريا", icon: "🍔", cost: 500, category: "physical", stock: 20 },
  { id: "6", name: "دفتر ملاحظات", description: "دفتر ملاحظات فاخر", icon: "📓", cost: 800, category: "physical", stock: 15 },
  { id: "7", name: "قلم فاخر", description: "طقم أقلام فاخرة", icon: "🖊️", cost: 600, category: "physical", stock: 10 },
  { id: "8", name: "حصة خاصة", description: "حصة خصوصية مجانية مع معلم", icon: "👨‍🏫", cost: 3000, category: "privilege", stock: 3 },
  { id: "9", name: "شعار مميز", description: "شعار مميز بجانب اسمك", icon: "✨", cost: 2500, category: "digital" },
  { id: "10", name: "إطار صورة شخصية", description: "إطار ذهبي لصورتك الشخصية", icon: "🖼️", cost: 1000, category: "digital" },
]

const redeemedRewards: (Reward & { redeemedAt: string })[] = [
  { id: "r1", name: "وجبة مجانية", description: "وجبة غداء مجانية من الكافتيريا", icon: "🍔", cost: 500, category: "physical", isRedeemed: true, redeemedAt: "2024-12-25" },
  { id: "r2", name: "قلم فاخر", description: "طقم أقلام فاخرة", icon: "🖊️", cost: 600, category: "physical", isRedeemed: true, redeemedAt: "2024-12-20" },
  { id: "r3", name: "خصم 10% على الكتب", description: "كوبون خصم على الكتب من المكتبة", icon: "📚", cost: 1500, category: "discount", isRedeemed: true, redeemedAt: "2024-12-15" },
]

export default function RewardsPage() {
  const [userPoints, setUserPoints] = useState(2400)

  const handleRedeem = async (rewardId: string): Promise<boolean> => {
    const reward = availableRewards.find((r) => r.id === rewardId)
    if (!reward || userPoints < reward.cost) return false

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setUserPoints((prev) => prev - reward.cost)
    return true
  }

  const totalRedeemed = redeemedRewards.reduce((sum, r) => sum + r.cost, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">متجر المكافآت</h1>
          <p className="text-muted-foreground">استبدل نقاطك بمكافآت رائعة</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <Coins className="w-5 h-5 text-yellow-600" />
          <span className="text-xl font-bold text-yellow-600">
            {userPoints.toLocaleString("ar-EG")}
          </span>
          <span className="text-sm text-yellow-600">نقطة</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{redeemedRewards.length}</p>
              <p className="text-xs text-muted-foreground">مكافآت مستبدلة</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Coins className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRedeemed.toLocaleString("ar-EG")}</p>
              <p className="text-xs text-muted-foreground">نقاط مصروفة</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableRewards.length}</p>
              <p className="text-xs text-muted-foreground">مكافأة متاحة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="shop" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shop">
            <Gift className="w-4 h-4 ml-2" />
            المتجر
          </TabsTrigger>
          <TabsTrigger value="redeemed">
            <History className="w-4 h-4 ml-2" />
            مكافآتي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop">
          <RewardsShop
            rewards={availableRewards}
            userPoints={userPoints}
            onRedeem={handleRedeem}
          />
        </TabsContent>

        <TabsContent value="redeemed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                المكافآت المستبدلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {redeemedRewards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لم تستبدل أي مكافآت بعد</p>
                  <Button variant="outline" className="mt-4">
                    تصفح المتجر
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {redeemedRewards.map((reward, index) => (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/10"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{reward.icon}</span>
                        <div>
                          <p className="font-medium">{reward.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {reward.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <Badge variant="outline" className="text-green-600 mb-1">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          مستبدلة
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {reward.redeemedAt}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
