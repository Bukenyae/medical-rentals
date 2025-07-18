import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Database } from '@/lib/database.types'
import { 
  Expense, 
  ExpenseQuery, 
  CreateExpenseInput, 
  UpdateExpenseInput,
  FinancialSummary,
  PropertyFinancialSummary,
  FinancialReportOptions,
  TaxReport,
  FinancialTimeSeriesData,
  Revenue,
  RevenueQuery
} from '@/lib/types/financial'

type ExpenseRow = Database['public']['Tables']['expenses']['Row']
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']
type BookingRow = Database['public']['Tables']['bookings']['Row']

export class FinancialService {
  private getSupabase() {
    return createSupabaseServerClient()
  }
  
  /**
   * Get revenue from bookings with filtering and pagination
   */
  async getRevenues(query: RevenueQuery = {}): Promise<{ revenues: Revenue[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      property_id,
      start_date,
      end_date,
      sort_by = 'date',
      sort_order = 'desc'
    } = query

    const supabase = this.getSupabase()
    
    // We'll get revenue data from bookings
    let supabaseQuery = supabase
      .from('bookings')
      .select(`
        id,
        property_id,
        guest_id,
        total_amount,
        check_in,
        profiles!bookings_guest_id_fkey(full_name),
        properties(title)
      `, { count: 'exact' })
      .in('status', ['confirmed', 'checked_in', 'checked_out'])

    // Apply filters
    if (property_id) {
      supabaseQuery = supabaseQuery.eq('property_id', property_id)
    }

    if (start_date) {
      supabaseQuery = supabaseQuery.gte('check_in', start_date)
    }

    if (end_date) {
      supabaseQuery = supabaseQuery.lte('check_out', end_date)
    }

    // Apply sorting
    const sortField = sort_by === 'date' ? 'check_in' : sort_by
    supabaseQuery = supabaseQuery.order(sortField, { ascending: sort_order === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    supabaseQuery = supabaseQuery.range(from, to)

    const { data: bookings, error, count } = await supabaseQuery

    if (error) {
      throw new Error(`Failed to get revenues: ${error.message}`)
    }

    // Map bookings to revenue objects
    const revenues = bookings?.map(booking => ({
      id: booking.id,
      property_id: booking.property_id,
      booking_id: booking.id,
      amount: booking.total_amount,
      date: booking.check_in,
      guest_id: booking.guest_id,
      guest_name: booking.profiles?.full_name,
      property_title: booking.properties?.title
    })) || []

    return {
      revenues,
      total: count || 0
    }
  }
  
  /**
   * Get revenue details by booking ID
   */
  async getRevenueByBookingId(bookingId: string): Promise<Revenue | null> {
    const supabase = this.getSupabase()
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        property_id,
        guest_id,
        total_amount,
        check_in,
        profiles!bookings_guest_id_fkey(full_name),
        properties(title)
      `)
      .eq('id', bookingId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get revenue: ${error.message}`)
    }

    return {
      id: booking.id,
      property_id: booking.property_id,
      booking_id: booking.id,
      amount: booking.total_amount,
      date: booking.check_in,
      guest_id: booking.guest_id,
      guest_name: booking.profiles?.full_name,
      property_title: booking.properties?.title
    }
  }
  
  /**
   * Record revenue automatically when a booking is confirmed
   * This is called by a webhook or trigger when booking status changes
   */
  async recordBookingRevenue(bookingId: string): Promise<void> {
    const supabase = this.getSupabase()
    
    // Get booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, status, total_amount')
      .eq('id', bookingId)
      .single()
      
    if (error) {
      throw new Error(`Failed to get booking: ${error.message}`)
    }
    
    // Only record revenue for confirmed bookings
    if (booking.status !== 'confirmed') {
      return
    }
    
    // Revenue is already tracked in the booking itself
    // This method can be extended to create additional revenue records if needed
    console.log(`Revenue recorded for booking ${bookingId}: ${booking.total_amount}`)
  }

  /**
   * Create a new expense
   */
  async createExpense(data: CreateExpenseInput, userId: string): Promise<Expense> {
    const supabase = this.getSupabase()
    
    // Validate property exists and user has access
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', data.property_id)
      .eq('owner_id', userId)
      .single()

    if (propertyError || !property) {
      throw new Error('Property not found or access denied')
    }

    const expenseData: ExpenseInsert = {
      ...data,
      created_by: userId
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create expense: ${error.message}`)
    }

    return this.mapExpenseRow(expense)
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(id: string): Promise<Expense | null> {
    const supabase = this.getSupabase()
    const { data: expense, error } = await supabase
      .from('expenses')
      .select(`
        *,
        properties (
          title
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get expense: ${error.message}`)
    }

    return this.mapExpenseRow(expense)
  }

  /**
   * Get expenses with filtering and pagination
   */
  async getExpenses(query: ExpenseQuery = {}): Promise<{ expenses: Expense[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      property_id,
      category,
      start_date,
      end_date,
      sort_by = 'expense_date',
      sort_order = 'desc'
    } = query

    const supabase = this.getSupabase()
    let supabaseQuery = supabase
      .from('expenses')
      .select(`
        *,
        properties (
          title
        )
      `, { count: 'exact' })

    // Apply filters
    if (property_id) {
      supabaseQuery = supabaseQuery.eq('property_id', property_id)
    }

    if (category) {
      supabaseQuery = supabaseQuery.eq('category', category)
    }

    if (start_date) {
      supabaseQuery = supabaseQuery.gte('expense_date', start_date)
    }

    if (end_date) {
      supabaseQuery = supabaseQuery.lte('expense_date', end_date)
    }

    // Apply sorting
    supabaseQuery = supabaseQuery.order(sort_by, { ascending: sort_order === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    supabaseQuery = supabaseQuery.range(from, to)

    const { data: expenses, error, count } = await supabaseQuery

    if (error) {
      throw new Error(`Failed to get expenses: ${error.message}`)
    }

    return {
      expenses: expenses?.map(this.mapExpenseRow) || [],
      total: count || 0
    }
  }

  /**
   * Update expense
   */
  async updateExpense(data: UpdateExpenseInput): Promise<Expense> {
    const { id, ...updateData } = data

    const supabase = this.getSupabase()
    const { data: expense, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        properties (
          title
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update expense: ${error.message}`)
    }

    return this.mapExpenseRow(expense)
  }

  /**
   * Delete expense
   */
  async deleteExpense(id: string): Promise<void> {
    const supabase = this.getSupabase()
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete expense: ${error.message}`)
    }
  }

  /**
   * Get financial summary for a date range
   */
  async getFinancialSummary(startDate: string, endDate: string, propertyIds?: string[]): Promise<FinancialSummary> {
    const supabase = this.getSupabase()
    
    // Build property filter
    let propertyFilter = ''
    if (propertyIds && propertyIds.length > 0) {
      propertyFilter = `AND property_id IN (${propertyIds.map(id => `'${id}'`).join(',')})`
    }

    // Get revenue from bookings
    const { data: revenueData, error: revenueError } = await supabase
      .rpc('get_revenue_summary', { 
        start_date: startDate, 
        end_date: endDate,
        property_filter: propertyFilter
      })

    if (revenueError) {
      throw new Error(`Failed to get revenue summary: ${revenueError.message}`)
    }

    // Get expenses
    const { data: expenseData, error: expenseError } = await supabase
      .rpc('get_expense_summary', { 
        start_date: startDate, 
        end_date: endDate,
        property_filter: propertyFilter
      })

    if (expenseError) {
      throw new Error(`Failed to get expense summary: ${expenseError.message}`)
    }

    // Get occupancy data
    const { data: occupancyData, error: occupancyError } = await supabase
      .rpc('get_occupancy_summary', { 
        start_date: startDate, 
        end_date: endDate,
        property_filter: propertyFilter
      })

    if (occupancyError) {
      throw new Error(`Failed to get occupancy summary: ${occupancyError.message}`)
    }

    // Process and return the summary
    const revenue = revenueData || { total: 0, by_property: {} }
    const expenses = expenseData || { total: 0, by_category: {}, by_property: {} }
    const occupancy = occupancyData || { occupancy_rate: 0, average_daily_rate: 0 }

    // Calculate profit by property
    const profitByProperty: Record<string, number> = {}
    Object.keys(revenue.by_property || {}).forEach(propertyId => {
      const propertyRevenue = revenue.by_property[propertyId] || 0
      const propertyExpenses = expenses.by_property[propertyId] || 0
      profitByProperty[propertyId] = propertyRevenue - propertyExpenses
    })

    return {
      total_revenue: revenue.total || 0,
      total_expenses: expenses.total || 0,
      net_income: (revenue.total || 0) - (expenses.total || 0),
      expense_by_category: expenses.by_category || {},
      revenue_by_property: revenue.by_property || {},
      expenses_by_property: expenses.by_property || {},
      profit_by_property: profitByProperty,
      occupancy_rate: occupancy.occupancy_rate || 0,
      average_daily_rate: occupancy.average_daily_rate || 0
    }
  }

  /**
   * Get financial summary for a specific property
   */
  async getPropertyFinancialSummary(propertyId: string, startDate: string, endDate: string): Promise<PropertyFinancialSummary> {
    const supabase = this.getSupabase()
    
    // Get property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('title')
      .eq('id', propertyId)
      .single()

    if (propertyError) {
      throw new Error(`Property not found: ${propertyError.message}`)
    }

    // Get revenue from bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('total_amount, check_in, check_out')
      .eq('property_id', propertyId)
      .gte('check_in', startDate)
      .lte('check_out', endDate)
      .in('status', ['confirmed', 'checked_in', 'checked_out'])

    if (bookingsError) {
      throw new Error(`Failed to get bookings: ${bookingsError.message}`)
    }

    // Get expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('property_id', propertyId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    if (expensesError) {
      throw new Error(`Failed to get expenses: ${expensesError.message}`)
    }

    // Calculate total revenue
    const totalRevenue = bookings?.reduce((sum, booking) => sum + booking.total_amount, 0) || 0

    // Calculate total expenses
    const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0

    // Calculate expense by category
    const expenseByCategory: Record<string, number> = {}
    expenses?.forEach(expense => {
      const category = expense.category
      expenseByCategory[category] = (expenseByCategory[category] || 0) + expense.amount
    })

    // Calculate occupancy rate
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    const totalDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
    
    let occupiedDays = 0
    bookings?.forEach(booking => {
      const bookingStart = new Date(booking.check_in) < startDateObj ? startDateObj : new Date(booking.check_in)
      const bookingEnd = new Date(booking.check_out) > endDateObj ? endDateObj : new Date(booking.check_out)
      const bookingDays = Math.ceil((bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60 * 24))
      occupiedDays += bookingDays
    })

    const occupancyRate = totalDays > 0 ? (occupiedDays / totalDays) * 100 : 0
    const averageDailyRate = occupiedDays > 0 ? totalRevenue / occupiedDays : 0

    return {
      property_id: propertyId,
      property_title: property.title,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: totalRevenue - totalExpenses,
      expense_by_category: expenseByCategory,
      occupancy_rate: occupancyRate,
      average_daily_rate: averageDailyRate,
      bookings_count: bookings?.length || 0
    }
  }

  /**
   * Generate financial report based on options
   */
  async generateFinancialReport(options: FinancialReportOptions): Promise<FinancialTimeSeriesData[]> {
    const { 
      start_date, 
      end_date, 
      property_ids, 
      group_by = 'month',
      include_expenses = true,
      include_revenue = true,
      expense_categories
    } = options

    const supabase = this.getSupabase()
    
    // Generate time series data based on group_by
    const { data: timeSeriesData, error: timeSeriesError } = await supabase
      .rpc('generate_time_series', { 
        start_date, 
        end_date,
        group_by
      })

    if (timeSeriesError) {
      throw new Error(`Failed to generate time series: ${timeSeriesError.message}`)
    }

    // Build property filter
    let propertyFilter = ''
    if (property_ids && property_ids.length > 0) {
      propertyFilter = `AND property_id IN (${property_ids.map(id => `'${id}'`).join(',')})`
    }

    // Build expense category filter
    let categoryFilter = ''
    if (expense_categories && expense_categories.length > 0) {
      categoryFilter = `AND category IN (${expense_categories.map(cat => `'${cat}'`).join(',')})`
    }

    // Get revenue data if included
    let revenueData: any[] = []
    if (include_revenue) {
      const { data: revenue, error: revenueError } = await supabase
        .rpc('get_revenue_time_series', { 
          start_date, 
          end_date,
          group_by,
          property_filter: propertyFilter
        })

      if (revenueError) {
        throw new Error(`Failed to get revenue time series: ${revenueError.message}`)
      }
      
      revenueData = revenue || []
    }

    // Get expense data if included
    let expenseData: any[] = []
    if (include_expenses) {
      const { data: expenses, error: expenseError } = await supabase
        .rpc('get_expense_time_series', { 
          start_date, 
          end_date,
          group_by,
          property_filter: propertyFilter,
          category_filter: categoryFilter
        })

      if (expenseError) {
        throw new Error(`Failed to get expense time series: ${expenseError.message}`)
      }
      
      expenseData = expenses || []
    }

    // Merge the data into time series format
    const revenueMap = new Map(revenueData.map(item => [item.date_group, item.amount]))
    const expenseMap = new Map(expenseData.map(item => [item.date_group, item.amount]))

    return (timeSeriesData || []).map(item => {
      const date = item.date_group
      const revenue = revenueMap.get(date) || 0
      const expenses = expenseMap.get(date) || 0
      
      return {
        date,
        revenue,
        expenses,
        net_income: revenue - expenses
      }
    })
  }

  /**
   * Generate tax report for a specific year
   */
  async generateTaxReport(year: number): Promise<TaxReport> {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    
    const supabase = this.getSupabase()
    
    // Get all properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, title')

    if (propertiesError) {
      throw new Error(`Failed to get properties: ${propertiesError.message}`)
    }

    // Get revenue for each property
    const propertyFinancials = await Promise.all(
      (properties || []).map(async property => {
        const summary = await this.getPropertyFinancialSummary(
          property.id,
          startDate,
          endDate
        )
        
        return {
          id: property.id,
          title: property.title,
          revenue: summary.total_revenue,
          expenses: summary.total_expenses,
          net_income: summary.net_income
        }
      })
    )

    // Get overall expense summary by category
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, category')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    if (expenseError) {
      throw new Error(`Failed to get expenses: ${expenseError.message}`)
    }

    // Calculate expenses by category
    const expensesByCategory: Record<string, number> = {}
    expenseData?.forEach(expense => {
      const category = expense.category
      expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.amount
    })

    // Calculate totals
    const totalRevenue = propertyFinancials.reduce((sum, p) => sum + p.revenue, 0)
    const totalExpenses = propertyFinancials.reduce((sum, p) => sum + p.expenses, 0)

    return {
      year,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: totalRevenue - totalExpenses,
      expenses_by_category: expensesByCategory,
      properties: propertyFinancials
    }
  }
  
  /**
   * Export tax report to CSV format
   */
  async exportTaxReportToCsv(year: number): Promise<string> {
    const report = await this.generateTaxReport(year);
    
    // Generate CSV header
    let csv = 'Property,Revenue,Expenses,Net Income\n';
    
    // Add property rows
    report.properties.forEach(property => {
      csv += `"${property.title}",${property.revenue.toFixed(2)},${property.expenses.toFixed(2)},${property.net_income.toFixed(2)}\n`;
    });
    
    // Add totals row
    csv += `"TOTAL",${report.total_revenue.toFixed(2)},${report.total_expenses.toFixed(2)},${report.net_income.toFixed(2)}\n\n`;
    
    // Add expense breakdown by category
    csv += 'Expense Category,Amount\n';
    Object.entries(report.expenses_by_category).forEach(([category, amount]) => {
      csv += `"${category}",${amount.toFixed(2)}\n`;
    });
    
    return csv;
  }
  
  /**
   * Export tax report to JSON format
   */
  async exportTaxReportToJson(year: number): Promise<string> {
    const report = await this.generateTaxReport(year);
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Calculate profitability metrics for a property
   */
  async calculateProfitabilityMetrics(propertyId: string, startDate: string, endDate: string): Promise<{
    roi: number;
    cap_rate: number;
    cash_on_cash_return: number;
    gross_rent_multiplier: number;
    occupancy_rate: number;
    average_daily_rate: number;
    revenue_per_available_day: number;
  }> {
    const supabase = this.getSupabase();
    
    // Get property financial summary
    const summary = await this.getPropertyFinancialSummary(propertyId, startDate, endDate);
    
    // Get property value (this would typically come from a property_values table or property metadata)
    // For now, we'll use a placeholder calculation based on annual revenue
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('base_price')
      .eq('id', propertyId)
      .single();
      
    if (propertyError) {
      throw new Error(`Failed to get property: ${propertyError.message}`);
    }
    
    // Estimate property value (this is a placeholder - in a real app, you'd store actual property values)
    // Using 10x annual revenue as a rough estimate of property value
    const estimatedAnnualRevenue = summary.total_revenue * (365 / this.daysBetween(startDate, endDate));
    const propertyValue = estimatedAnnualRevenue * 10;
    
    // Estimate initial investment (typically 20-25% of property value plus closing costs)
    const initialInvestment = propertyValue * 0.25;
    
    // Calculate metrics
    const netOperatingIncome = summary.total_revenue - summary.total_expenses;
    
    // Return on Investment (ROI)
    const roi = (netOperatingIncome / initialInvestment) * 100;
    
    // Capitalization Rate
    const capRate = (netOperatingIncome / propertyValue) * 100;
    
    // Cash on Cash Return (assuming 25% down payment)
    const annualMortgagePayment = (propertyValue * 0.75) * 0.06; // Assuming 6% interest rate
    const cashOnCashReturn = ((netOperatingIncome - annualMortgagePayment) / initialInvestment) * 100;
    
    // Gross Rent Multiplier
    const grossRentMultiplier = propertyValue / summary.total_revenue;
    
    // Revenue Per Available Day
    const totalDays = this.daysBetween(startDate, endDate);
    const revenuePerAvailableDay = summary.total_revenue / totalDays;
    
    return {
      roi,
      cap_rate: capRate,
      cash_on_cash_return: cashOnCashReturn,
      gross_rent_multiplier: grossRentMultiplier,
      occupancy_rate: summary.occupancy_rate,
      average_daily_rate: summary.average_daily_rate,
      revenue_per_available_day: revenuePerAvailableDay
    };
  }
  
  /**
   * Calculate comparative analytics across properties
   */
  async calculateComparativeAnalytics(startDate: string, endDate: string): Promise<{
    property_comparisons: Array<{
      property_id: string;
      property_title: string;
      revenue: number;
      expenses: number;
      net_income: number;
      occupancy_rate: number;
      average_daily_rate: number;
      roi: number;
    }>;
    top_performing_property: string;
    highest_occupancy_property: string;
    highest_roi_property: string;
    average_occupancy: number;
    average_daily_rate: number;
    average_roi: number;
  }> {
    const supabase = this.getSupabase();
    
    // Get all properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, title');
      
    if (propertiesError) {
      throw new Error(`Failed to get properties: ${propertiesError.message}`);
    }
    
    // Calculate metrics for each property
    const propertyComparisons = await Promise.all((properties || []).map(async (property) => {
      const summary = await this.getPropertyFinancialSummary(property.id, startDate, endDate);
      const metrics = await this.calculateProfitabilityMetrics(property.id, startDate, endDate);
      
      return {
        property_id: property.id,
        property_title: property.title,
        revenue: summary.total_revenue,
        expenses: summary.total_expenses,
        net_income: summary.net_income,
        occupancy_rate: summary.occupancy_rate,
        average_daily_rate: summary.average_daily_rate,
        roi: metrics.roi
      };
    }));
    
    // Find top performers
    let topPerformingProperty = '';
    let highestOccupancyProperty = '';
    let highestRoiProperty = '';
    let maxNetIncome = -Infinity;
    let maxOccupancy = -Infinity;
    let maxRoi = -Infinity;
    
    // Calculate averages
    let totalOccupancy = 0;
    let totalDailyRate = 0;
    let totalRoi = 0;
    
    propertyComparisons.forEach(prop => {
      // Find top performers
      if (prop.net_income > maxNetIncome) {
        maxNetIncome = prop.net_income;
        topPerformingProperty = prop.property_title;
      }
      
      if (prop.occupancy_rate > maxOccupancy) {
        maxOccupancy = prop.occupancy_rate;
        highestOccupancyProperty = prop.property_title;
      }
      
      if (prop.roi > maxRoi) {
        maxRoi = prop.roi;
        highestRoiProperty = prop.property_title;
      }
      
      // Add to totals for averages
      totalOccupancy += prop.occupancy_rate;
      totalDailyRate += prop.average_daily_rate;
      totalRoi += prop.roi;
    });
    
    const propertyCount = propertyComparisons.length || 1; // Avoid division by zero
    
    return {
      property_comparisons: propertyComparisons,
      top_performing_property: topPerformingProperty,
      highest_occupancy_property: highestOccupancyProperty,
      highest_roi_property: highestRoiProperty,
      average_occupancy: totalOccupancy / propertyCount,
      average_daily_rate: totalDailyRate / propertyCount,
      average_roi: totalRoi / propertyCount
    };
  }
  
  /**
   * Helper function to calculate days between two dates
   */
  private daysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Map database row to Expense type
   */
  private mapExpenseRow(row: any): Expense {
    return {
      id: row.id,
      property_id: row.property_id,
      category: row.category,
      amount: row.amount,
      description: row.description || undefined,
      receipt_url: row.receipt_url || undefined,
      expense_date: row.expense_date,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      property_title: row.properties?.title
    }
  }
}

  /**
   * Calculate monthly financial summaries for a year
   * This is useful for dashboard displays and charts
   */
  async calculateMonthlyFinancialSummaries(year: number): Promise<{
    months: string[];
    revenue: number[];
    expenses: number[];
    net_income: number[];
    occupancy_rates: number[];
  }> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    // Generate monthly time series
    const { data: timeSeriesData, error: timeSeriesError } = await this.getSupabase()
      .rpc('generate_time_series', { 
        start_date: startDate, 
        end_date: endDate,
        group_by: 'month'
      });

    if (timeSeriesError) {
      throw new Error(`Failed to generate time series: ${timeSeriesError.message}`);
    }
    
    // Get monthly financial data
    const financialData = await this.generateFinancialReport({
      start_date: startDate,
      end_date: endDate,
      group_by: 'month'
    });
    
    // Map the data to arrays for charting
    const months = financialData.map(item => {
      // Convert YYYY-MM to month name (e.g., "2023-01" to "January")
      const [year, month] = item.date.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('default', { month: 'short' });
    });
    
    const revenue = financialData.map(item => item.revenue);
    const expenses = financialData.map(item => item.expenses);
    const net_income = financialData.map(item => item.net_income);
    
    // Get monthly occupancy rates
    const occupancy_rates = await Promise.all(
      financialData.map(async (item) => {
        const [year, month] = item.date.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const monthStart = `${year}-${month}-01`;
        const monthEnd = `${year}-${month}-${daysInMonth}`;
        
        const { data: occupancyData } = await this.getSupabase()
          .rpc('get_occupancy_summary', { 
            start_date: monthStart, 
            end_date: monthEnd,
            property_filter: ''
          });
          
        return occupancyData?.occupancy_rate || 0;
      })
    );
    
    return {
      months,
      revenue,
      expenses,
      net_income,
      occupancy_rates
    };
  }
  
  /**
   * Generate enhanced tax report with quarterly breakdowns
   */
  async generateEnhancedTaxReport(year: number): Promise<{
    year: number;
    annual: {
      total_revenue: number;
      total_expenses: number;
      net_income: number;
      expenses_by_category: Record<string, number>;
    };
    quarterly: Array<{
      quarter: number;
      revenue: number;
      expenses: number;
      net_income: number;
    }>;
    properties: Array<{
      id: string;
      title: string;
      revenue: number;
      expenses: number;
      net_income: number;
      occupancy_rate: number;
    }>;
  }> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    // Get annual report
    const annualReport = await this.generateTaxReport(year);
    
    // Get quarterly breakdowns
    const quarters = [
      { start: `${year}-01-01`, end: `${year}-03-31`, quarter: 1 },
      { start: `${year}-04-01`, end: `${year}-06-30`, quarter: 2 },
      { start: `${year}-07-01`, end: `${year}-09-30`, quarter: 3 },
      { start: `${year}-10-01`, end: `${year}-12-31`, quarter: 4 }
    ];
    
    const quarterlyData = await Promise.all(
      quarters.map(async (q) => {
        const summary = await this.getFinancialSummary(q.start, q.end);
        return {
          quarter: q.quarter,
          revenue: summary.total_revenue,
          expenses: summary.total_expenses,
          net_income: summary.net_income
        };
      })
    );
    
    // Get property details with occupancy rates
    const propertyDetails = await Promise.all(
      annualReport.properties.map(async (property) => {
        const summary = await this.getPropertyFinancialSummary(property.id, startDate, endDate);
        return {
          id: property.id,
          title: property.title,
          revenue: property.revenue,
          expenses: property.expenses,
          net_income: property.net_income,
          occupancy_rate: summary.occupancy_rate
        };
      })
    );
    
    return {
      year,
      annual: {
        total_revenue: annualReport.total_revenue,
        total_expenses: annualReport.total_expenses,
        net_income: annualReport.net_income,
        expenses_by_category: annualReport.expenses_by_category
      },
      quarterly: quarterlyData,
      properties: propertyDetails
    };
  }
  
  /**
   * Forecast future revenue based on current bookings and historical data
   */
  async forecastRevenue(months: number = 3): Promise<Array<{
    month: string;
    forecasted_revenue: number;
    confidence_level: 'high' | 'medium' | 'low';
  }>> {
    const supabase = this.getSupabase();
    
    // Get current date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Get historical data for the past 12 months
    const historicalStartDate = new Date(currentYear - 1, currentMonth, 1);
    const historicalEndDate = new Date(currentYear, currentMonth, 0);
    
    const historicalData = await this.generateFinancialReport({
      start_date: historicalStartDate.toISOString().split('T')[0],
      end_date: historicalEndDate.toISOString().split('T')[0],
      group_by: 'month',
      include_expenses: false
    });
    
    // Get confirmed future bookings
    const futureStartDate = new Date();
    const futureEndDate = new Date(currentYear, currentMonth + months, 0);
    
    const { data: confirmedBookings } = await supabase
      .from('bookings')
      .select('check_in, check_out, total_amount')
      .gte('check_in', futureStartDate.toISOString().split('T')[0])
      .lte('check_out', futureEndDate.toISOString().split('T')[0])
      .in('status', ['confirmed', 'checked_in']);
    
    // Calculate monthly confirmed revenue from existing bookings
    const confirmedRevenue: Record<string, number> = {};
    
    (confirmedBookings || []).forEach(booking => {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      const stayDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const dailyRate = booking.total_amount / stayDays;
      
      // Distribute revenue across stay days
      let currentDay = new Date(checkIn);
      while (currentDay < checkOut) {
        const monthKey = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}`;
        confirmedRevenue[monthKey] = (confirmedRevenue[monthKey] || 0) + dailyRate;
        
        // Move to next day
        currentDay.setDate(currentDay.getDate() + 1);
      }
    });
    
    // Calculate average monthly revenue from historical data
    const monthlyAverages: Record<string, number> = {};
    
    historicalData.forEach(item => {
      const [year, month] = item.date.split('-');
      const monthIndex = parseInt(month) - 1;
      monthlyAverages[monthIndex] = item.revenue;
    });
    
    // Generate forecast for future months
    const forecast = [];
    
    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(currentYear, currentMonth + i + 1, 1);
      const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = forecastDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      // Get confirmed revenue for this month
      const confirmed = confirmedRevenue[monthKey] || 0;
      
      // Get historical average for this month
      const historicalAverage = monthlyAverages[forecastDate.getMonth()] || 0;
      
      // Calculate forecast based on confirmed bookings and historical average
      // The further in the future, the more we rely on historical data
      const timeWeight = Math.min(0.8, 0.2 + (i * 0.2)); // 0.2 for first month, increasing by 0.2 each month, max 0.8
      const forecasted = confirmed + (historicalAverage - confirmed) * timeWeight;
      
      // Determine confidence level based on how far in the future and how much confirmed revenue
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      
      if (i === 0 && confirmed > historicalAverage * 0.7) {
        confidence = 'high';
      } else if (i >= 2 || confirmed < historicalAverage * 0.3) {
        confidence = 'low';
      }
      
      forecast.push({
        month: monthName,
        forecasted_revenue: Math.round(forecasted * 100) / 100,
        confidence_level: confidence
      });
    }
    
    return forecast;
  }

// Export singleton instance
export const financialService = new FinancialService()