import { NextRequest, NextResponse } from 'next/server';
import { propertyService } from '@/lib/services/property';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const hospitalData = await propertyService.getHospitalProximity(params.id, user.id);

    if (!hospitalData) {
      return NextResponse.json(
        { error: 'Hospital proximity data not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: hospitalData });
  } catch (error) {
    console.error('Error getting hospital proximity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const hospitalData = await propertyService.calculateHospitalProximity(params.id, user.id);

    return NextResponse.json({ 
      data: hospitalData,
      message: 'Hospital proximity data calculated successfully'
    });
  } catch (error) {
    console.error('Error calculating hospital proximity:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}