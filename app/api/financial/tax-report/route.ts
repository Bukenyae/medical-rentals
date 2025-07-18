import { NextResponse } from 'next/server'
import { financialService } from '@/lib/services/financial'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { checkPermission } from '@/lib/rbac'
import { PERMISSIONS } from '@/lib/rbac'

/**
 * API endpoint to generate and export tax reports
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
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString())
    const format = url.searchParams.get('format') || 'json'
    
    let data: string
    let contentType: string
    let filename: string
    
    // Generate report in requested format
    if (format === 'csv') {
      data = await financialService.exportTaxReportToCsv(year)
      contentType = 'text/csv'
      filename = `tax_report_${year}.csv`
    } else {
      data = await financialService.exportTaxReportToJson(year)
      contentType = 'application/json'
      filename = `tax_report_${year}.json`
    }
    
    // Create response with appropriate headers for download
    const response = new NextResponse(data)
    response.headers.set('Content-Type', contentType)
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    
    return response
  } catch (error: any) {
    console.error('Tax report error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}