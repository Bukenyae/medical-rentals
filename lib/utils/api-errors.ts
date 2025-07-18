import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errorMessages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`)
    return NextResponse.json(
      { 
        error: 'Validation failed',
        details: errorMessages
      },
      { status: 400 }
    )
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    )
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // Handle unknown errors
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

export function createAuthError(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

export function createNotFoundError(resource: string = 'Resource'): NextResponse {
  return NextResponse.json(
    { error: `${resource} not found` },
    { status: 404 }
  )
}