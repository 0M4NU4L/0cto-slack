import { NextRequest, NextResponse } from 'next/server';
import { branchCleanupService } from '@/lib/branch-cleanup-service';

export async function GET(req: NextRequest) {
  // Verify authorization (e.g., CRON_SECRET)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
     return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 1. Check for pending branches to schedule
    await branchCleanupService.checkPendingBranches();

    // 2. Check for scheduled branches to archive
    await branchCleanupService.checkScheduledBranches();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
