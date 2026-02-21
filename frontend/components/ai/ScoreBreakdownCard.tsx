'use client';

import React from 'react';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export interface ScoreComponent {
    name: string;
    score: number;
    max: number;
    note: string;
    icon: string;
    // legacy alias
    label?: string;
    max_score?: number;
}

export interface ScoreBreakdownCardProps {
    data: {
        symbol?: string;
        name?: string;
        total?: number;
        grade?: string;
        grade_color?: string;
        signal?: string;
        category?: string;
        price?: number;
        change_percent?: number;
        currency?: string;
        sector?: string;
        components: ScoreComponent[];
        key_strength?: string;
        key_watch?: string;
    };
    language?: 'en' | 'ar';
}

// ─────────────────────────────────────────────────────────
// Colour helpers
// ─────────────────────────────────────────────────────────
function gradeColors(grade: string) {
    switch (grade) {
        case 'A': return { text: '#10b981', border: 'rgba(16,185,129,0.35)', bg: 'rgba(16,185,129,0.08)' };
        case 'B': return { text: '#14b8a6', border: 'rgba(20,184,166,0.35)', bg: 'rgba(20,184,166,0.08)' };
        case 'C': return { text: '#f59e0b', border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.08)' };
        case 'D': return { text: '#f97316', border: 'rgba(249,115,22,0.35)', bg: 'rgba(249,115,22,0.08)' };
        case 'F': return { text: '#ef4444', border: 'rgba(239,68,68,0.35)', bg: 'rgba(239,68,68,0.08)' };
        default: return { text: '#64748b', border: 'rgba(100,116,139,0.35)', bg: 'rgba(100,116,139,0.08)' };
    }
}

function barColor(score: number, max: number) {
    const p = score / max;
    if (p >= 0.80) return '#10b981';
    if (p >= 0.60) return '#14b8a6';
    if (p >= 0.40) return '#f59e0b';
    if (p >= 0.20) return '#f97316';
    return '#ef4444';
}

// ─────────────────────────────────────────────────────────
// Score Bar
// ─────────────────────────────────────────────────────────
function ScoreBar({ score, max }: { score: number; max: number }) {
    const pct = Math.max(0, Math.min(1, score / max));
    return (
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 3 }}>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct * 100}%` }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 3, background: barColor(score, max) }}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Main Card
// ─────────────────────────────────────────────────────────
export function ScoreBreakdownCard({ data, language = 'en' }: ScoreBreakdownCardProps) {
    if (!data) return null;

    const grade = data.grade ?? '?';
    const total = data.total ?? 0;
    const signal = data.signal ?? '';
    const symbol = data.symbol ?? '';
    const c = gradeColors(grade);
    const isAr = language === 'ar';
    const isUp = (data.change_percent ?? 0) >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{
                borderRadius: 14,
                border: `1px solid ${c.border}`,
                background: 'var(--card-bg, #0f172a)',
                overflow: 'hidden',
                direction: isAr ? 'rtl' : 'ltr',
                marginBottom: 4,
            }}
        >
            {/* ── Header ─────────────────────── */}
            <div style={{
                padding: '14px 16px 12px',
                background: c.bg,
                borderBottom: `1px solid ${c.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
            }}>
                {/* Identity */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>{symbol}</span>
                        <span style={{
                            padding: '2px 9px', borderRadius: 20,
                            background: c.text, color: '#0f172a',
                            fontSize: 11, fontWeight: 800, letterSpacing: '0.5px',
                        }}>Grade {grade}</span>
                    </div>
                    {data.name && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{data.name}</div>
                    )}
                    {data.sector && (
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{data.sector}</div>
                    )}
                </div>

                {/* Score circle + price */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                        width: 58, height: 58, borderRadius: '50%',
                        border: `3px solid ${c.text}`,
                        background: c.bg,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: c.text, lineHeight: 1 }}>{total}</span>
                        <span style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1.2 }}>/100</span>
                    </div>
                    {data.price != null && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
                                {data.currency} {data.price.toFixed(2)}
                            </div>
                            <div style={{ fontSize: 10, color: isUp ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                {isUp ? '▲' : '▼'} {Math.abs(data.change_percent ?? 0).toFixed(2)}%
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Signal / Category ─────────── */}
            {(signal || data.category) && (
                <div style={{
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
                }}>
                    {signal && (
                        <span style={{ fontSize: 11, color: c.text, fontWeight: 600 }}>🎯 {signal}</span>
                    )}
                    {signal && data.category && <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>}
                    {data.category && (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{data.category}</span>
                    )}
                </div>
            )}

            {/* ── 5 Components ─────────────── */}
            <div style={{ padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(data.components ?? []).map((comp, idx) => {
                    const max = comp.max ?? comp.max_score ?? 20;
                    const label = comp.name ?? comp.label ?? '';
                    const color = barColor(comp.score, max);
                    return (
                        <motion.div
                            key={label + idx}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.06 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 13 }}>{comp.icon}</span>
                                    <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>{label}</span>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color }}>{comp.score}/{max}</span>
                            </div>
                            <ScoreBar score={comp.score} max={max} />
                            {comp.note && (
                                <div style={{ fontSize: 10, color: '#475569', marginTop: 2, lineHeight: 1.4 }}>{comp.note}</div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Strength / Watch ──────────── */}
            {(data.key_strength || data.key_watch) && (
                <div style={{ margin: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {data.key_strength && (
                        <div style={{
                            padding: '8px 12px',
                            background: 'rgba(16,185,129,0.07)',
                            borderLeft: '3px solid #10b981',
                            borderRadius: 6,
                        }}>
                            <div style={{ fontSize: 9, color: '#10b981', fontWeight: 800, marginBottom: 2, letterSpacing: '0.5px' }}>
                                💪 {isAr ? 'نقطة القوة' : 'KEY STRENGTH'}
                            </div>
                            <div style={{ fontSize: 11, color: '#a7f3d0', lineHeight: 1.5 }}>{data.key_strength}</div>
                        </div>
                    )}
                    {data.key_watch && (
                        <div style={{
                            padding: '8px 12px',
                            background: 'rgba(245,158,11,0.07)',
                            borderLeft: '3px solid #f59e0b',
                            borderRadius: 6,
                        }}>
                            <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 800, marginBottom: 2, letterSpacing: '0.5px' }}>
                                ⚠️ {isAr ? 'نقطة انتباه' : 'WATCH OUT FOR'}
                            </div>
                            <div style={{ fontSize: 11, color: '#fde68a', lineHeight: 1.5 }}>{data.key_watch}</div>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

export default ScoreBreakdownCard;
