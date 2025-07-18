import { Database } from '@/lib/database.types'

export type ExpenseCategory = Database['public']['Enums']['expense_category']

export interface Expense {
  id: string
  property_id: string
  category: ExpenseCategory
  amount: number
  description?: string
  receipt_url?: string
  expense_date: string
  created_by: string
  created_at: string
  updated_at: string
  property_title?: string // Joined from properties table
}

export interface Revenue {
  id: string
  property_id: string
  booking_id: string
  amount: number
  date: string
  guest_id: string
  guest_name?: string
  property_title?: string
}

export interface FinancialSummary {
  total_revenue: number
  total_expenses: number
  net_income: number
  expense_by_category: Record<ExpenseCategory, number>
  revenue_by_property: Record<string, number>
  expenses_by_property: Record<string, number>
  profit_by_property: Record<string, number>
  occupancy_rate: number
  average_daily_rate: number
}

export interface PropertyFinancialSummary {
  property_id: string
  property_title: string
  total_revenue: number
  total_expenses: number
  net_income: number
  expense_by_category: Record<ExpenseCategory, number>
  occupancy_rate: number
  average_daily_rate: number
  bookings_count: number
}

export interface FinancialReportOptions {
  start_date: string
  end_date: string
  property_ids?: string[]
  group_by?: 'day' | 'week' | 'month' | 'year'
  include_expenses?: boolean
  include_revenue?: boolean
  expense_categories?: ExpenseCategory[]
}

export interface ExpenseQuery {
  page?: number
  limit?: number
  property_id?: string
  category?: ExpenseCategory
  start_date?: string
  end_date?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface RevenueQuery {
  page?: number
  limit?: number
  property_id?: string
  start_date?: string
  end_date?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface CreateExpenseInput {
  property_id: string
  category: ExpenseCategory
  amount: number
  description?: string
  receipt_url?: string
  expense_date: string
}

export interface UpdateExpenseInput {
  id: string
  category?: ExpenseCategory
  amount?: number
  description?: string
  receipt_url?: string
  expense_date?: string
}

export interface TaxReport {
  year: number
  total_revenue: number
  total_expenses: number
  net_income: number
  expenses_by_category: Record<ExpenseCategory, number>
  properties: {
    id: string
    title: string
    revenue: number
    expenses: number
    net_income: number
  }[]
}

export interface FinancialTimeSeriesData {
  date: string
  revenue: number
  expenses: number
  net_income: number
}

export interface MonthlyFinancialSummary {
  months: string[]
  revenue: number[]
  expenses: number[]
  net_income: number[]
  occupancy_rates: number[]
}

export interface EnhancedTaxReport {
  year: number
  annual: {
    total_revenue: number
    total_expenses: number
    net_income: number
    expenses_by_category: Record<ExpenseCategory, number>
  }
  quarterly: Array<{
    quarter: number
    revenue: number
    expenses: number
    net_income: number
  }>
  properties: Array<{
    id: string
    title: string
    revenue: number
    expenses: number
    net_income: number
    occupancy_rate: number
  }>
}

export interface RevenueForecast {
  month: string
  forecasted_revenue: number
  confidence_level: 'high' | 'medium' | 'low'
}