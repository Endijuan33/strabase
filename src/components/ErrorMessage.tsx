"use client"
import { Card } from "@/components/ui/card"

export function ErrorMessage({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="p-6 border-destructive/40">
      <div className="text-red-600 dark:text-red-400 font-medium">{title}</div>
      {description && <div className="text-sm text-muted-foreground mt-1">{description}</div>}
    </Card>
  )
}
