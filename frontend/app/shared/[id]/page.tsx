import { Metadata, ResolvingMetadata } from 'next';
import { fetchSharedSessionMessages } from '@/lib/api';
import ResponsivePage from '@/components/chatbot/ResponsivePage';

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // Default metadata
    let title = "Starta Markets Analysis";
    let description = "Check out this AI-generated financial analysis and market insight from Starta Markets.";

    try {
        const messages = await fetchSharedSessionMessages(id);

        // Find the first user message to use as the title
        const firstUserMessage = messages.find((m: any) => m.role === 'user');
        if (firstUserMessage && firstUserMessage.content) {
            title = firstUserMessage.content.substring(0, 60) + (firstUserMessage.content.length > 60 ? '...' : '') + " | Starta";
        }

        // Find the first assistant message to use as the description
        const firstAssistantMessage = messages.find((m: any) => m.role === 'assistant');
        if (firstAssistantMessage && firstAssistantMessage.content) {
            description = firstAssistantMessage.content.substring(0, 150) + '...';
        }
    } catch (e) {
        console.error("Failed to generate metadata for shared session", e);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://startamarkets.com';
    const sharedUrl = `${baseUrl}/shared/${id}`;

    // Some scrapers strictly require .png in the path or as a param
    const ogImageUrl = new URL('/api/og/share', baseUrl);
    ogImageUrl.searchParams.set('title', title.replace(' | Starta', ''));
    ogImageUrl.searchParams.set('ext', '.png');

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            url: sharedUrl,
            type: 'website',
            images: [
                {
                    url: ogImageUrl.toString(),
                    width: 1200,
                    height: 630,
                    alt: 'Starta Markets Analysis',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: [ogImageUrl.toString()],
        },
    };
}

export default async function SharedSessionPage({ params }: Props) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // We pass the sharedSessionId down to ResponsivePage.
    // We will need to update ResponsivePage to handle `sharedSessionId` 
    // to view it in a "read-only" presentation mode without forcing login.
    return <ResponsivePage initialSessionId={id} isSharedView={true} />;
}
