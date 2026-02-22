import { Metadata, ResolvingMetadata } from 'next';
import { fetchSharedMessagePair } from '@/lib/api';
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
        const messages = await fetchSharedMessagePair(id);

        // Find the user message (usually the first one in the pair) to use as the title
        const firstUserMessage = messages.find((m: any) => m.role === 'user');
        if (firstUserMessage && firstUserMessage.content) {
            title = firstUserMessage.content.substring(0, 60) + (firstUserMessage.content.length > 60 ? '...' : '') + " | Starta";
        }

        // Find the assistant message to use as the description
        const firstAssistantMessage = messages.find((m: any) => m.role === 'assistant');
        if (firstAssistantMessage && firstAssistantMessage.content) {
            description = firstAssistantMessage.content.substring(0, 150) + '...';
        }
    } catch (e) {
        console.error("Failed to generate metadata for shared message pair", e);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://startamarkets.com';
    const sharedUrl = `${baseUrl}/shared/msg/${id}`;

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

export default async function SharedMessagePage({ params }: Props) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // We pass the message ID down to ResponsivePage but flag it as isSharedMessageView
    // ResponsivePage will need logic to use fetchSharedMessagePair instead of fetchSharedSessionMessages
    return <ResponsivePage initialSessionId={id} isSharedView={true} isSharedMessageView={true} />;
}
