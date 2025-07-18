import { NextResponse } from 'next/server'
import { financialService } from '@/lib/services/financial'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { checkPermission } from '@/lib/rbac'
import { PERMISSIONS } from '@/lib/rbac'

/**
 * API endpoint to get financial analytics and profitability metrics
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
    const startDate = url.searchParams.get('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const endDate = url.searchParams.get('end_date') || new Date().toISOString().split('T')[0]
    const propertyId = url.searchParams.get('property_id') || null
    const analysisType = url.searchParams.get('type') || 'summary'
    
    // Get requested analytics
    if (analysisType === 'comparative' || !propertyId) {
      // Get comparative analytics across all properties
      const comparativeAnalytics = await financialService.calculateComparativeAnalytics(startDate, endDate)
      return NextResponse.json(comparativeAnalytics)
    } else {
      // Get profitability metrics for a specific property
      const profitabilityMetrics = await financialService.calculateProfitabilityMetrics(propertyId, startDate, endDate)
      return NextResponse.json(profitabilityMetrics)
    }
  } catch (error: any) {
    console.error('Financial analytics error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}