import { NextResponse } from 'next/server';
import { generateBusinessNames, generateBusinessObjectives } from '../../../lib/ai-service';

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
    const { task, context } = body as { task: 'suggest_names' | 'generate_objectives'; context: Record<string, any> };

    if (task === 'suggest_names') {
      const names = await generateBusinessNames(context.natureOfBusiness);
      return NextResponse.json({ content: JSON.stringify(names) }, { status: 200 });
    } else if (task === 'generate_objectives') {
      const text = await generateBusinessObjectives(context.businessName, context.natureOfBusiness);
      return NextResponse.json({ content: text }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Unknown task' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[chat.ts] Error:', error?.message);
    return NextResponse.json({ content: '' }, { status: 200 });
  }
}
