import type { Metadata } from 'next';
import { renderMarketScreen, marketScreenMetadata } from '@/app/markets/renderMarketScreen';

/** Arabic market screen — the hreflang twin of /markets/{screen}. */
export const revalidate = 300;

type Props = { params: Promise<{ screen: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { screen } = await params;
    return marketScreenMetadata(screen, 'ar');
}

export default async function ArabicMarketScreenPage({ params }: Props) {
    const { screen } = await params;
    return renderMarketScreen(screen, 'ar');
}
