import { NextResponse } from 'next/server';

/**
 * Deploy-identity endpoint. Returns the exact git commit the running build was
 * produced from (Vercel injects VERCEL_GIT_COMMIT_SHA at build time), so a
 * post-deploy health gate can assert the intended commit is actually live —
 * turning "is the deploy out yet?" from blind polling into a deterministic
 * check. See scripts/verify-deploy.mjs.
 */
export const dynamic = 'force-dynamic';

export function GET() {
    return NextResponse.json({
        commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown',
        ref: process.env.VERCEL_GIT_COMMIT_REF ?? 'unknown',
        env: process.env.VERCEL_ENV ?? 'unknown',
        builtAt: process.env.VERCEL_DEPLOYMENT_ID ?? 'local',
    });
}
