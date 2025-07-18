import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RevenueOverview from '@/components/RevenueOverview'
import ExpenseTracker from '@/components/ExpenseTracker'
import ReportGenerator from '@/components/ReportGenerator'

export default function FinancialDashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Financial Dashboard</h1>
      
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Revenue Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expense Tracker</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <RevenueOverview />
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4">
          <ExpenseTracker />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <ReportGenerator />
        </TabsContent>
      </Tabs>
    </div>
  )
}