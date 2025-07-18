import { NextResponse } from 'next/server'
import { financialService } from '@/lib/services/financial'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { checkPermission } from '@/lib/rbac'
import { PERMISSIONS } from '@/lib/rbac'
import { CreateExpenseInput } from '@/lib/types/financial'

/**
 * API endpoint for expense management
 */
export async function GET(request: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has permission to read expenses
    const hasPermission = await checkPermission(session.user.id, PERMISSIONS.EXPENSE_READ)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Parse query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const propertyId = url.searchParams.get('property_id') || undefined
    const category = url.searchParams.get('category') || undefined
    const startDate = url.searchParams.get('start_date') || undefined
    const endDate = url.searchParams.get('end_date') || undefined
    const sortBy = url.searchParams.get('sort_by') || 'expense_date'
    const sortOrder = (url.searchParams.get('sort_order') || 'desc') as 'asc' | 'desc'
    
    const result = await financialService.getExpenses({
      page,
      limit,
      property_id: propertyId,
      category: category as any,
      start_date: startDate,
      end_date: endDate,
      sort_by: sortBy,
      sort_order: sortOrder
    })
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Get expenses error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has permission to create expenses
    const hasPermission = await checkPermission(session.user.id, PERMISSIONS.EXPENSE_CREATE)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const expenseData: CreateExpenseInput = {
      property_id: body.property_id,
      category: body.category,
      amount: parseFloat(body.amount),
      description: body.description,
      receipt_url: body.receipt_url,
      expense_date: body.expense_date
    }
    
    const expense = await financialService.createExpense(expenseData, session.user.id)
    
    return NextResponse.json(expense, { status: 201 })
  } catch (error: any) {
    console.error('Create expense error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}