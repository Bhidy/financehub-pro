import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
    '/aichat': '/AiChat',
    '/ai-analyst': '/AiChat',
    '/ai-mobile': '/AiChat',
    '/mobile-ai-analyst': '/AiChat',
    '/mobile-ai-analyst/login': '/login',
    '/mobile-ai-analyst/register': '/register',
    '/mobile-ai-analyst/forgot-password': '/forgot-password',
};

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    const redirectTarget = LEGACY_ROUTE_REDIRECTS[url.pathname];

    // Canonical chatbot route is /AiChat. Redirect legacy aliases permanently.
    if (redirectTarget) {
        url.pathname = redirectTarget;
        return NextResponse.redirect(url, 308); // 308 Permanent Redirect
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/aichat',
        '/ai-analyst',
        '/ai-mobile',
        '/mobile-ai-analyst',
        '/mobile-ai-analyst/login',
        '/mobile-ai-analyst/register',
        '/mobile-ai-analyst/forgot-password',
    ],
};
