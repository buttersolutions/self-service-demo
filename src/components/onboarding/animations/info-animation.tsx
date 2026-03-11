"use client";

import { motion } from "framer-motion";
import { Phone, Clock, DollarSign, MapPin, Globe, Users, Star, Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BlurText } from "@/components/ui/blur-text";
import type { BusinessResult } from "@/lib/mock-data";

interface InfoAnimationProps {
  business: BusinessResult;
  isActive: boolean;
}

export function InfoAnimation({ business, isActive }: InfoAnimationProps) {
  const infoItems = [
    { icon: Store, label: "Business Type", value: business.category },
    { icon: MapPin, label: "Main Address", value: business.address },
    { icon: Phone, label: "Phone", value: business.phone },
    { icon: Globe, label: "Website", value: business.website.replace("https://www.", "") },
    { icon: Clock, label: "Hours", value: business.hours },
    { icon: DollarSign, label: "Price Level", value: business.priceLevel },
    { icon: Star, label: "Rating", value: `${business.rating} (${business.reviewCount} reviews)` },
    { icon: Users, label: "Est. Team Size", value: `${business.employeeEstimate} employees` },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="overflow-hidden p-0">
            {/* Header with brand color */}
            <div className="h-16 relative" style={{ backgroundColor: business.brandColors.primary }}>
              <motion.div
                className="absolute -bottom-6 left-5"
                initial={{ scale: 0 }}
                animate={isActive ? { scale: 1 } : {}}
                transition={{ delay: 0.6, type: "spring", stiffness: 400 }}
              >
                <Avatar className="w-12 h-12 border-2 border-background shadow-md">
                  <AvatarFallback
                    className="text-lg font-bold"
                    style={{ color: business.brandColors.primary }}
                  >
                    {business.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            </div>

            <div className="pt-9 px-5 pb-5">
              <h3 className="text-lg font-semibold text-foreground">
                {isActive && (
                  <BlurText text={business.name} delay={0.8} staggerDelay={0.06} />
                )}
              </h3>

              <Separator className="my-4" />

              {/* Info grid */}
              <div className="space-y-0">
                {infoItems.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -15 }}
                    animate={isActive ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 1.0 + i * 0.15, duration: 0.3 }}
                    className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                  >
                    <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground w-24 flex-shrink-0">
                      {item.label}
                    </span>
                    <span className="text-sm text-foreground truncate">{item.value}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
