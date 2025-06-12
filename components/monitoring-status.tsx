"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, Pause, Play, Wifi, WifiOff } from "lucide-react"
import { getMonitoringStatus, startContractMonitoring, stopContractMonitoring } from "@/lib/blockchain"

export function MonitoringStatus() {
  const [status, setStatus] = useState({
    isMonitoring: false,
    lastProcessedBlock: "0",
    subscriberCount: 0,
  })

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    // Update status every second
    const interval = setInterval(() => {
      const currentStatus = getMonitoringStatus()
      setStatus(currentStatus)
      setLastUpdate(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleToggleMonitoring = () => {
    if (status.isMonitoring) {
      stopContractMonitoring()
    } else {
      startContractMonitoring()
    }
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Monitoring
          </div>
          <Badge variant={status.isMonitoring ? "default" : "secondary"} className="flex items-center gap-1">
            {status.isMonitoring ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {status.isMonitoring ? "LIVE" : "OFFLINE"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Status:</span>
            <div className={`font-semibold ${status.isMonitoring ? "text-green-600" : "text-gray-500"}`}>
              {status.isMonitoring ? "Monitoring Active" : "Monitoring Stopped"}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Last Block:</span>
            <div className="font-mono">{status.lastProcessedBlock}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Subscribers:</span>
            <div>{status.subscriberCount}</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">Last updated: {lastUpdate.toLocaleTimeString()}</div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {status.isMonitoring
              ? "Scanning new blocks every 2 seconds for contract transactions"
              : "Real-time monitoring is currently disabled"}
          </div>
          <Button variant="outline" size="sm" onClick={handleToggleMonitoring}>
            {status.isMonitoring ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
