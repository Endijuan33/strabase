"use client"
import { Spinner } from "@/components/ui/spinner"
import { Card } from "@/components/ui/card"

export function Loader({ label = "Loading..." }: { label?: string }) {
  return (
    <Card className="p-6 flex items-center gap-3">
      <Spinner className="text-primary" />
      <div className="text-sm">{label}</div>
    </Card>
  )
}
