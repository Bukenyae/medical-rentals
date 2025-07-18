import { NextResponse } from 'next/server'
import { financialService } from '@/lib/services/financial'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { checkPermission } from '@/lib/rbac'
import { PERMISSIONS } from '@/lib/rbac'

/**
 * API endpoint for financial forecasting and advanced analytics
 */
export async function GET(request: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has permission to access financial data
    const hasPermission = await checkPermission(session.user.id, PERMISSIONS.EXPENSE_READ)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Parse query parameters
    const url = new URL(request.url)
    const reportType = url.searchParams.get('type') || 'forecast'
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString())
    const months = parseInt(url.searchParams.get('months') || '3')
    
    // Generate requested report
    if (reportType === 'forecast') {
      const forecast = await financialService.forecastRevenue(months)
      return NextResponse.json(forecast)
    } else if (reportType === 'monthly') {
      const monthlySummary = await financialService.calculateMonthlyFinancialSummaries(year)
      return NextResponse.json(monthlySummary)
    } else if (reportType === 'enhanced-tax') {
      const enhancedTaxReport = await financialService.generateEnhancedTaxReport(year)
      return NextResponse.json(enhancedTaxReport)
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Financial forecast error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}