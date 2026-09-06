import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Dynamic params
        const title = searchParams.get('title') || 'Starta AI Market Analysis';

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#0F172A', // Slate 900
                        padding: '40px 80px',
                        position: 'relative',
                    }}
                >
                    {/* Subtle Background Pattern/Gradient */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: '#0F172A',
                            opacity: 0.9,
                            zIndex: 0,
                        }}
                    />

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1,
                            textAlign: 'center',
                        }}
                    >
                        {/* Starta Logo Simulation */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '40px',
                            }}
                        >
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    backgroundColor: '#14B8A6', // Signature Teal
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '28px',
                                    fontWeight: 'bold',
                                }}
                            >
                                S
                            </div>
                            <span
                                style={{
                                    fontSize: '42px',
                                    fontWeight: 800,
                                    color: 'white',
                                    letterSpacing: '-1px',
                                }}
                            >
                                Starta<span style={{ color: '#14B8A6', marginLeft: '8px' }}>AI</span>
                            </span>
                        </div>

                        {/* Title / Question */}
                        <div
                            style={{
                                fontSize: title.length > 50 ? '42px' : '56px',
                                fontWeight: 700,
                                color: 'white',
                                lineHeight: 1.3,
                                maxWidth: '900px',
                                marginBottom: '40px',
                                display: 'flex',
                                textAlign: 'center',
                            }}
                        >
                            "{title.length > 100 ? title.substring(0, 100) + '...' : title}"
                        </div>

                        {/* Footer / CTA */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                marginTop: 'auto',
                                paddingTop: '40px',
                            }}
                        >
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#14B8A6',
                                }}
                            />
                            <span
                                style={{
                                    fontSize: '28px',
                                    fontWeight: 500,
                                    color: '#94A3B8', // Slate 400
                                    letterSpacing: '1px',
                                }}
                            >
                                Exclusive Financial Analysis
                            </span>
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#14B8A6',
                                }}
                            />
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        console.error(`Failed to generate OG image`, e);
        return new Response(`Failed to generate image`, {
            status: 500,
        });
    }
}
