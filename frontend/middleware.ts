import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();

    // Exact case match for lowercase /aichat to redirect to /AiChat
    if (url.pathname === '/aichat') {
        url.pathname = '/AiChat';
        return NextResponse.redirect(url, 308); // 308 Permanent Redirect
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/aichat',
};
