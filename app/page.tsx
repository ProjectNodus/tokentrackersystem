import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArenaContractInfo } from "@/components/arena-contract-info"
import { TransactionAnalyzer } from "@/components/transaction-analyzer"
import ContractTransactions from "@/components/contract-transactions"
import { ArenaDebug } from "@/components/arena-debug"
import { CreatorsDashboard } from "@/components/creators-dashboard"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">🔥 Avalanche Token Launch Monitor</h1>
      <p className="text-muted-foreground mb-6">Real-time monitoring van token creaties op het Arena Launch Platform</p>

      <ArenaContractInfo />

      <Tabs defaultValue="tokens" className="mt-8">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="tokens">Token Creations</TabsTrigger>
          <TabsTrigger value="analyzer">Transaction Analyzer</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="debug">Arena Debug</TabsTrigger>
        </TabsList>
        <TabsContent value="tokens">
          <ContractTransactions />
        </TabsContent>
        <TabsContent value="analyzer">
          <TransactionAnalyzer />
        </TabsContent>
        <TabsContent value="creators">
          <CreatorsDashboard />
        </TabsContent>
        <TabsContent value="debug">
          <ArenaDebug />
        </TabsContent>
      </Tabs>
    </main>
  )
}
