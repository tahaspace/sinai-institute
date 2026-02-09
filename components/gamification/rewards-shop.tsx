"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Gift, Coins, CheckCircle, Clock } from "lucide-react"

export interface Reward {
  id: string
  name: string
  description: string
  icon: string
  cost: number
  category: "digital" | "physical" | "privilege" | "discount"
  stock?: number
  expiresAt?: string
  isRedeemed?: boolean
  redeemedAt?: string
}

interface RewardsShopProps {
  rewards: Reward[]
  userPoints: number
  onRedeem: (rewardId: string) => Promise<boolean>
  className?: string
}

const categoryLabels = {
  digital: "رقمي",
  physical: "مادي",
  privilege: "امتياز",
  discount: "خصم",
}

const categoryColors = {
  digital: "bg-blue-100 text-blue-700",
  physical: "bg-green-100 text-green-700",
  privilege: "bg-purple-100 text-purple-700",
  discount: "bg-orange-100 text-orange-700",
}

export function RewardsShop({
  rewards,
  userPoints,
  onRedeem,
  className,
}: RewardsShopProps) {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState(false)

  const handleRedeem = async () => {
    if (!selectedReward) return

    setIsRedeeming(true)
    const success = await onRedeem(selectedReward.id)
    setIsRedeeming(false)

    if (success) {
      setRedeemSuccess(true)
      setTimeout(() => {
        setSelectedReward(null)
        setRedeemSuccess(false)
      }, 2000)
    }
  }

  const canAfford = (cost: number) => userPoints >= cost

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              <CardTitle>متجر المكافآت</CardTitle>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="font-bold text-yellow-600">
                {userPoints.toLocaleString("ar-EG")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward, index) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    !canAfford(reward.cost) && "opacity-60",
                    reward.isRedeemed && "bg-green-50 dark:bg-green-900/10"
                  )}
                  onClick={() => !reward.isRedeemed && setSelectedReward(reward)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-4xl">{reward.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm truncate">
                            {reward.name}
                          </h4>
                          {reward.isRedeemed && (
                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {reward.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge
                            className={cn("text-[10px]", categoryColors[reward.category])}
                          >
                            {categoryLabels[reward.category]}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-yellow-600" />
                            <span className="font-bold text-sm">
                              {reward.cost.toLocaleString("ar-EG")}
                            </span>
                          </div>
                        </div>
                        {reward.stock !== undefined && reward.stock < 10 && (
                          <p className="text-xs text-red-600 mt-1">
                            متبقي {reward.stock} فقط!
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Redeem Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent className="sm:max-w-md">
          {redeemSuccess ? (
            <div className="py-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4"
              >
                <CheckCircle className="w-10 h-10 text-green-600" />
              </motion.div>
              <h3 className="text-xl font-bold mb-2">تم الاستبدال بنجاح!</h3>
              <p className="text-muted-foreground">
                ستجد مكافأتك في قسم "مكافآتي"
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="text-4xl">{selectedReward?.icon}</span>
                  <span>{selectedReward?.name}</span>
                </DialogTitle>
                <DialogDescription>{selectedReward?.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">التكلفة</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold">
                      {selectedReward?.cost.toLocaleString("ar-EG")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">رصيدك</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold">
                      {userPoints.toLocaleString("ar-EG")}
                    </span>
                  </div>
                </div>

                {selectedReward && !canAfford(selectedReward.cost) && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                    يحتاج{" "}
                    {(selectedReward.cost - userPoints).toLocaleString("ar-EG")}{" "}
                    نقطة إضافية
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedReward(null)}>
                  إلغاء
                </Button>
                <Button
                  onClick={handleRedeem}
                  disabled={
                    isRedeeming ||
                    (selectedReward && !canAfford(selectedReward.cost))
                  }
                >
                  {isRedeeming ? "جاري الاستبدال..." : "تأكيد الاستبدال"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default RewardsShop
