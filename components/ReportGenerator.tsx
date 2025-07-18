import React, { useState } from 'react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon, Download, FileSpreadsheet, FileJson } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface ReportGeneratorProps {
  propertyId?: string
}

// Form schema for report generation
const reportFormSchema = z.object({
  report_type: z.enum(['financial', 'occupancy', 'tax', 'comparative']),
  start_date: z.date(),
  end_date: z.date(),
  property_ids: z.array(z.string()).optional(),
  group_by: z.enum(['day', 'week', 'month', 'year']).default('month'),
  include_expenses: z.boolean().default(true),
  include_revenue: z.boolean().default(true),
  expense_categories: z.array(z.string()).optional(),
})

type ReportFormValues = z.infer<typeof reportFormSchema>

export default function ReportGenerator({ propertyId }: ReportGeneratorProps) {
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([])
  const [reportData, setReportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('generator')

  // Initialize form
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      report_type: 'financial',
      start_date: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
      end_date: new Date(),
      property_ids: propertyId ? [propertyId] : [],
      group_by: 'month',
      include_expenses: true,
      include_revenue: true,
      expense_categories: [],
    },
  })

  // Fetch properties on component mount
  React.useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch('/api/properties')
        if (!response.ok) {
          throw new Error('Failed to fetch properties')
        }
        
        const data = await response.json()
        setProperties(data.properties.map((p: any) => ({ id: p.id, title: p.title })))
      } catch (error) {
        console.error('Error fetching properties:', error)
      }
    }
    
    fetchProperties()
  }, [])

  // Handle form submission
  const onSubmit = async (data: ReportFormValues) => {
    setIsLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        type: data.report_type,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        end_date: format(data.end_date, 'yyyy-MM-dd'),
        group_by: data.group_by,
        include_expenses: data.include_expenses.toString(),
        include_revenue: data.include_revenue.toString(),
      })
      
      // Add property IDs if specified
      if (data.property_ids && data.property_ids.length > 0) {
        data.property_ids.forEach(id => params.append('property_ids', id))
      }
      
      // Add expense categories if specified
      if (data.expense_categories && data.expense_categories.length > 0) {
        data.expense_categories.forEach(cat => params.append('expense_categories', cat))
      }
      
      // Determine endpoint based on report type
      let endpoint = '/api/financial/forecast'
      if (data.report_type === 'tax') {
        endpoint = '/api/financial/tax-report'
        params.set('year', new Date().getFullYear().toString())
      } else if (data.report_type === 'comparative') {
        endpoint = '/api/financial/analytics'
        params.set('type', 'comparative')
      }
      
      const response = await fetch(`${endpoint}?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }
      
      const data = await response.json()
      setReportData(data)
      setActiveTab('report')
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Download report
  const downloadReport = async (format: 'csv' | 'json') => {
    try {
      const reportType = form.getValues('report_type')
      
      if (reportType === 'tax') {
        // For tax reports, use the tax-report endpoint with format parameter
        const year = new Date().getFullYear()
        const response = await fetch(`/api/financial/tax-report?year=${year}&format=${format}`)
        
        if (!response.ok) {
          throw new Error('Failed to download report')
        }
        
        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `tax_report_${year}.${format}`
        
        // Download the file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // For other reports, convert the current report data to the requested format
        let content: string
        let filename: string
        
        if (format === 'json') {
          content = JSON.stringify(reportData, null, 2)
          filename = `financial_report_${format(new Date(), 'yyyy-MM-dd')}.json`
        } else {
          // Convert to CSV
          content = convertToCSV(reportData)
          filename = `financial_report_${format(new Date(), 'yyyy-MM-dd')}.csv`
        }
        
        // Create download link
        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading report:', error)
    }
  }

  // Convert data to CSV
  const convertToCSV = (data: any): string => {
    if (!data) return ''
    
    // Handle different report types
    if (Array.isArray(data)) {
      // Time series data
      const headers = Object.keys(data[0]).join(',')
      const rows = data.map(row => Object.values(row).join(','))
      return [headers, ...rows].join('\n')
    } else if (data.property_comparisons) {
      // Comparative analytics
      const headers = 'Property,Revenue,Expenses,Net Income,Occupancy Rate,ROI'
      const rows = data.property_comparisons.map((p: any) => 
        `"${p.property_title}",${p.revenue},${p.expenses},${p.net_income},${p.occupancy_rate},${p.roi}`
      )
      return [headers, ...rows].join('\n')
    } else {
      // Generic object
      const flattened = flattenObject(data)
      const headers = Object.keys(flattened).join(',')
      const values = Object.values(flattened).join(',')
      return [headers, values].join('\n')
    }
  }

  // Flatten nested object for CSV conversion
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? `${prefix}.` : ''
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flattenObject(obj[k], pre + k))
      } else if (Array.isArray(obj[k])) {
        // Skip arrays for simplicity
      } else {
        acc[pre + k] = obj[k]
      }
      return acc
    }, {} as Record<string, any>)
  }

  // Render report based on type
  const renderReport = () => {
    if (!reportData) return null
    
    const reportType = form.getValues('report_type')
    
    switch (reportType) {
      case 'financial':
        return renderFinancialReport()
      case 'occupancy':
        return renderOccupancyReport()
      case 'tax':
        return renderTaxReport()
      case 'comparative':
        return renderComparativeReport()
      default:
        return <p>No report data available</p>
    }
  }

  // Render financial report
  const renderFinancialReport = () => {
    // Assuming time series data
    if (!Array.isArray(reportData)) return <p>Invalid report data format</p>
    
    const chartData = reportData.map((item: any) => ({
      name: item.date,
      revenue: item.revenue,
      expenses: item.expenses,
      profit: item.net_income
    }))
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Report</CardTitle>
            <CardDescription>
              {format(form.getValues('start_date'), 'PPP')} to {format(form.getValues('end_date'), 'PPP')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
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
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Financial Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Income</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.expenses)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.net_income)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render occupancy report
  const renderOccupancyReport = () => {
    // Assuming time series data with occupancy
    if (!Array.isArray(reportData)) return <p>Invalid report data format</p>
    
    const chartData = reportData.map((item: any) => ({
      name: item.date,
      occupancy: item.occupancy || 0,
      rate: item.average_daily_rate || 0
    }))
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Report</CardTitle>
            <CardDescription>
              {format(form.getValues('start_date'), 'PPP')} to {format(form.getValues('end_date'), 'PPP')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
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
                  <YAxis yAxisId="left" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="occupancy"
                    name="Occupancy Rate (%)"
                    stroke="#4f46e5"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rate"
                    name="Average Daily Rate ($)"
                    stroke="#10b981"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Occupancy Rate</TableHead>
                  <TableHead className="text-right">Average Daily Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell className="text-right">{formatPercentage(item.occupancy || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.average_daily_rate || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render tax report
  const renderTaxReport = () => {
    if (!reportData || !reportData.year) return <p>Invalid tax report data</p>
    
    // Prepare expense by category data for chart
    const expenseCategories = Object.entries(reportData.annual.expenses_by_category || {}).map(
      ([category, amount]) => ({
        name: category,
        value: amount as number
      })
    )
    
    // Chart colors
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B']
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tax Report {reportData.year}</CardTitle>
            <CardDescription>
              Annual financial summary for tax purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Total Revenue</h3>
                <p className="text-2xl font-bold">{formatCurrency(reportData.annual.total_revenue)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Total Expenses</h3>
                <p className="text-2xl font-bold">{formatCurrency(reportData.annual.total_expenses)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Net Income</h3>
                <p className={`text-2xl font-bold ${reportData.annual.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.annual.net_income)}
                </p>
              </div>
            </div>
            
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium mb-4">Expenses by Category</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseCategories}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expenseCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Quarterly Breakdown</h3>
                {reportData.quarterly ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quarter</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net Income</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.quarterly.map((q: any) => (
                        <TableRow key={q.quarter}>
                          <TableCell>Q{q.quarter}</TableCell>
                          <TableCell className="text-right">{formatCurrency(q.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(q.expenses)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(q.net_income)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p>No quarterly data available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Property Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Income</TableHead>
                  <TableHead className="text-right">Occupancy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.properties.map((property: any) => (
                  <TableRow key={property.id}>
                    <TableCell>{property.title}</TableCell>
                    <TableCell className="text-right">{formatCurrency(property.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(property.expenses)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(property.net_income)}</TableCell>
                    <TableCell className="text-right">
                      {property.occupancy_rate ? formatPercentage(property.occupancy_rate) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => downloadReport('csv')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button variant="outline" onClick={() => downloadReport('json')}>
              <FileJson className="mr-2 h-4 w-4" />
              Download JSON
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Render comparative report
  const renderComparativeReport = () => {
    if (!reportData || !reportData.property_comparisons) {
      return <p>Invalid comparative report data</p>
    }
    
    const propertyData = reportData.property_comparisons.map((p: any) => ({
      name: p.property_title,
      revenue: p.revenue,
      expenses: p.expenses,
      net_income: p.net_income,
      occupancy: p.occupancy_rate,
      roi: p.roi
    }))
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Property Comparison</CardTitle>
            <CardDescription>
              Comparative analysis across properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Top Performing</h3>
                <p className="text-xl font-bold">{reportData.top_performing_property}</p>
                <p className="text-sm text-muted-foreground">Highest net income</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Highest Occupancy</h3>
                <p className="text-xl font-bold">{reportData.highest_occupancy_property}</p>
                <p className="text-sm text-muted-foreground">{formatPercentage(reportData.average_occupancy)} avg. occupancy</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium">Best ROI</h3>
                <p className="text-xl font-bold">{reportData.highest_roi_property}</p>
                <p className="text-sm text-muted-foreground">{formatPercentage(reportData.average_roi)} avg. ROI</p>
              </div>
            </div>
            
            <div className="mt-6 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={propertyData}
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
                  <Tooltip formatter={(value, name) => {
                    if (name === 'occupancy' || name === 'roi') {
                      return formatPercentage(value as number)
                    }
                    return formatCurrency(value as number)
                  }} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" />
                  <Bar dataKey="net_income" name="Net Income" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Income</TableHead>
                  <TableHead className="text-right">Occupancy</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.property_comparisons.map((property: any) => (
                  <TableRow key={property.property_id}>
                    <TableCell>{property.property_title}</TableCell>
                    <TableCell className="text-right">{formatCurrency(property.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(property.expenses)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(property.net_income)}</TableCell>
                    <TableCell className="text-right">{formatPercentage(property.occupancy_rate)}</TableCell>
                    <TableCell className="text-right">{formatPercentage(property.roi)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => downloadReport('csv')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button variant="outline" onClick={() => downloadReport('json')}>
              <FileJson className="mr-2 h-4 w-4" />
              Download JSON
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Report Generator</h2>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generator">Generate Report</TabsTrigger>
          <TabsTrigger value="report" disabled={!reportData}>View Report</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generator">
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>
                Configure your report parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="report_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select report type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="financial">Financial Report</SelectItem>
                            <SelectItem value="occupancy">Occupancy Report</SelectItem>
                            <SelectItem value="tax">Tax Report</SelectItem>
                            <SelectItem value="comparative">Comparative Analysis</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the type of report you want to generate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {!propertyId && (
                    <FormField
                      control={form.control}
                      name="property_ids"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>Properties</FormLabel>
                            <FormDescription>
                              Select properties to include in the report
                            </FormDescription>
                          </div>
                          {properties.map((property) => (
                            <FormField
                              key={property.id}
                              control={form.control}
                              name="property_ids"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={property.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(property.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value || [], property.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== property.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {property.title}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="group_by"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group By</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grouping" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="year">Year</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How to group the data in your report
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="include_revenue"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Include Revenue</FormLabel>
                            <FormDescription>
                              Include revenue data in the report
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="include_expenses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Include Expenses</FormLabel>
                            <FormDescription>
                              Include expense data in the report
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="expense_categories"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Expense Categories</FormLabel>
                          <FormDescription>
                            Select expense categories to include (leave empty for all)
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {['maintenance', 'cleaning', 'utilities', 'supplies', 'marketing', 'other'].map((category) => (
                            <FormField
                              key={category}
                              control={form.control}
                              name="expense_categories"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={category}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(category)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value || [], category])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== category
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal capitalize">
                                      {category}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Generating...' : 'Generate Report'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="report">
          <div className="flex justify-end mb-4 space-x-2">
            <Button variant="outline" onClick={() => setActiveTab('generator')}>
              Edit Report
            </Button>
            <Button variant="outline" onClick={() => downloadReport('csv')}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button variant="outline" onClick={() => downloadReport('json')}>
              <Download className="mr-2 h-4 w-4" />
              Download JSON
            </Button>
          </div>
          
          {renderReport()}
        </TabsContent>
      </Tabs>
    </div>
  )
}