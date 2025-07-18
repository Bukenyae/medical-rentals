import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { MonthlyFinancialSummary, RevenueForecast } from '@/lib/types/financial'

interface RevenueOverviewProps {
  propertyId?: string
}

export default function RevenueOverview({ propertyId }: RevenueOverviewProps) {
  const router = useRouter()
  const [year, setYear] = useState(new Date().getFullYear())
  const [monthlyData, setMonthlyData] = useState<MonthlyFinancialSummary | null>(null)
  const [forecastData, setForecastData] = useState<RevenueForecast[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch monthly financial data
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          type: 'monthly',
          year: year.toString()
        })
        
        if (propertyId) {
          params.append('property_id', propertyId)
        }
        
        const response = await fetch(`/api/financial/forecast?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch monthly data')
        }
        
        const data = await response.json()
        setMonthlyData(data)
      } catch (error) {
        console.error('Error fetching monthly data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchMonthlyData()
  }, [year, propertyId])
  
  // Fetch forecast data
  useEffect(() => {
    const fetchForecastData = async () => {
      try {
        const params = new URLSearchParams({
          type: 'forecast',
          months: '6'
        })
        
        if (propertyId) {
          params.append('property_id', propertyId)
        }
        
        const response = await fetch(`/api/financial/forecast?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch forecast data')
        }
        
        const data = await response.json()
        setForecastData(data)
      } catch (error) {
        console.error('Error fetching forecast data:', error)
      }
    }
    
    fetchForecastData()
  }, [propertyId])
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }
  
  // Calculate summary metrics
  const calculateSummary = () => {
    if (!monthlyData) return { totalRevenue: 0, totalExpenses: 0, netIncome: 0, avgOccupancy: 0 }
    
    const totalRevenue = monthlyData.revenue.reduce((sum, val) => sum + val, 0)
    const totalExpenses = monthlyData.expenses.reduce((sum, val) => sum + val, 0)
    const netIncome = totalRevenue - totalExpenses
    const avgOccupancy = monthlyData.occupancy_rates.reduce((sum, val) => sum + val, 0) / 
      (monthlyData.occupancy_rates.length || 1)
    
    return { totalRevenue, totalExpenses, netIncome, avgOccupancy }
  }
  
  const { totalRevenue, totalExpenses, netIncome, avgOccupancy } = calculateSummary()
  
  // Prepare chart data
  const prepareChartData = () => {
    if (!monthlyData) return []
    
    return monthlyData.months.map((month, index) => ({
      name: month,
      revenue: monthlyData.revenue[index],
      expenses: monthlyData.expenses[index],
      profit: monthlyData.net_income[index],
      occupancy: monthlyData.occupancy_rates[index]
    }))
  }
  
  const prepareForecastData = () => {
    if (!forecastData) return []
    
    return forecastData.map(item => ({
      name: item.month,
      forecast: item.forecasted_revenue,
      confidence: item.confidence_level
    }))
  }
  
  const chartData = prepareChartData()
  const forecastChartData = prepareForecastData()
  
  // Year options
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear]
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Revenue Overview</h2>
        <Select
          value={year.toString()}
          onValueChange={(value) => setYear(parseInt(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              For {year}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              For {year}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              For {year}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Occupancy</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgOccupancy.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              For {year}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Revenue & Expenses</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy Rate</TabsTrigger>
          <TabsTrigger value="forecast">Revenue Forecast</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Expenses</CardTitle>
              <CardDescription>
                Monthly revenue and expenses for {year}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[350px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p>Loading data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" />
                      <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" />
                      <Bar dataKey="profit" name="Profit" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="occupancy">
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Rate</CardTitle>
              <CardDescription>
                Monthly occupancy rate for {year}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[350px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p>Loading data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="occupancy"
                        name="Occupancy Rate"
                        stroke="#4f46e5"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecast</CardTitle>
              <CardDescription>
                Projected revenue for the next 6 months
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[350px]">
                {!forecastData ? (
                  <div className="flex items-center justify-center h-full">
                    <p>Loading forecast data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={forecastChartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar 
                        dataKey="forecast" 
                        name="Forecasted Revenue" 
                        fill="#4f46e5" 
                        fillOpacity={0.8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {forecastData?.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      item.confidence_level === 'high' ? 'bg-green-500' :
                      item.confidence_level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm">{item.month}: {formatCurrency(item.forecasted_revenue)}</span>
                    <span className="text-xs text-muted-foreground">
                      ({item.confidence_level} confidence)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}