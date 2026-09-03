import type { Metadata } from 'next';
import { renderMarketScreen, marketScreenMetadata } from '../renderMarketScreen';

/** English market screen. Arabic twin: /ar/markets/{screen}. */
export const revalidate = 300;

type Props = { params: Promise<{ screen: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { screen } = await params;
    return marketScreenMetadata(screen, 'en');
}

export default async function MarketScreenPage({ params }: Props) {
    const { screen } = await params;
    return renderMarketScreen(screen, 'en');
}
