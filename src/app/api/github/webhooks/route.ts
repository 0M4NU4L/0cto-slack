import { NextRequest, NextResponse } from 'next/server';
import { branchCleanupService } from '@/lib/branch-cleanup-service';
import { Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const event = req.headers.get('x-github-event');
    const payload = await req.json();

    if (event === 'pull_request') {
      const { action, pull_request, repository, sender } = payload;

      if (action === 'closed' && pull_request.merged) {
        await branchCleanupService.recordMergedBranch({
          repo_owner: repository.owner.login,
          repo_name: repository.name,
          branch_name: pull_request.head.ref,
          pr_number: pull_request.number,
          merged_at: Timestamp.fromDate(new Date(pull_request.merged_at)),
          merged_by: sender.login
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
