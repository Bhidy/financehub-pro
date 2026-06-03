import { NextResponse } from "next/server";
import WebSocket from "ws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TV_SYMBOL = "EGX:EGX30";
const TV_WS_URL = "wss://data.tradingview.com/socket.io/websocket";
const TV_ORIGIN = "https://www.tradingview.com";
const TV_USER_AGENT = "Mozilla/5.0 (compatible; FinhubPro/1.0; +https://finhub-pro.vercel.app)";
const TV_HISTORY_BARS = 420;
const WS_TIMEOUT_MS = 7_000;
const CACHE_TTL_MS = 30_000;

type TvQuoteMap = Record<string, unknown>;

type TvBar = {
    i?: number;
    v?: unknown[];
};

type EgxIndexHistoryPoint = {
    time: number;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

type EgxIndexResponse = {
    available: boolean;
    symbol: string;
    label: string;
    source: string;
    currency: string;
    exchange: string;
    updateMode: string | null;
    delaySeconds: number | null;
    quote: {
        value: number | null;
        change: number | null;
        changePercent: number | null;
        volume: number | null;
        timestamp: string | null;
    };
    history: EgxIndexHistoryPoint[];
    note: string;
    fetchedAt: string;
};

let cachedPayload: EgxIndexResponse | null = null;
let cachedAt = 0;
// Last successful payload (any age). Served as a graceful, marked-stale fallback
// when BOTH the websocket and the scanner fail, so the Home hero never collapses
// to an empty chart within a warm instance. NOTE: this is per-lambda only; the
// durable fix is to harvest EGX30 index history into the DB and serve DB-first.
let lastGoodPayload: EgxIndexResponse | null = null;

const asNumber = (value: unknown): number | null => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
};

const asString = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value : null;

const wrapPacket = (payload: string): string => `~m~${payload.length}~m~${payload}`;

const encodeMessage = (method: string, params: unknown[]): string =>
    wrapPacket(JSON.stringify({ m: method, p: params }));

const decodePackets = (raw: string): string[] => {
    const packets: string[] = [];
    let cursor = 0;

    while (cursor < raw.length) {
        if (!raw.startsWith("~m~", cursor)) break;
        cursor += 3;

        const separator = raw.indexOf("~m~", cursor);
        if (separator === -1) break;

        const packetLength = Number(raw.slice(cursor, separator));
        if (!Number.isFinite(packetLength) || packetLength < 0) break;

        cursor = separator + 3;
        const packet = raw.slice(cursor, cursor + packetLength);
        packets.push(packet);
        cursor += packetLength;
    }

    return packets;
};

const parseDelaySeconds = (updateMode: string | null): number | null => {
    if (!updateMode) return null;
    const match = updateMode.match(/delayed_streaming_(\d+)/i);
    if (!match) return null;
    const delay = Number(match[1]);
    return Number.isFinite(delay) ? delay : null;
};

const normalizeHistory = (rawBars: TvBar[]): EgxIndexHistoryPoint[] =>
    rawBars
        .map((bar) => {
            const values = Array.isArray(bar?.v) ? bar.v : [];
            const time = asNumber(values[0]);
            const open = asNumber(values[1]);
            const high = asNumber(values[2]);
            const low = asNumber(values[3]);
            const close = asNumber(values[4]);
            const volume = asNumber(values[5]) ?? 0;

            if (time === null || open === null || high === null || low === null || close === null) {
                return null;
            }

            return {
                time,
                date: new Date(time * 1000).toISOString(),
                open,
                high,
                low,
                close,
                volume,
            };
        })
        .filter((point): point is EgxIndexHistoryPoint => point !== null)
        .sort((a, b) => a.time - b.time);

const buildResponse = (
    quote: TvQuoteMap,
    history: EgxIndexHistoryPoint[],
    source: string,
    noteOverride?: string
): EgxIndexResponse => {
    const updateMode = asString(quote.update_mode);
    const delaySeconds = parseDelaySeconds(updateMode);
    const quoteTimestampSeconds = asNumber(quote.lp_time);
    const historyLatest = history.length > 0 ? history[history.length - 1] : null;

    const timestampIso = quoteTimestampSeconds
        ? new Date(quoteTimestampSeconds * 1000).toISOString()
        : historyLatest
          ? historyLatest.date
          : null;

    const historyPrevious = history.length > 1 ? history[history.length - 2] : null;
    const fallbackChange =
        historyLatest && historyPrevious ? historyLatest.close - historyPrevious.close : null;
    const fallbackChangePercent =
        historyLatest && historyPrevious && historyPrevious.close > 0
            ? (fallbackChange! / historyPrevious.close) * 100
            : null;

    const change = asNumber(quote.ch) ?? fallbackChange;
    const changePercent = asNumber(quote.chp) ?? fallbackChangePercent;
    const value = asNumber(quote.lp) ?? (historyLatest ? historyLatest.close : null);
    const volume = asNumber(quote.volume) ?? (historyLatest ? historyLatest.volume : null);

    const delayText =
        delaySeconds && delaySeconds > 0
            ? `Feed is delayed by approximately ${Math.round(delaySeconds / 60)} minutes.`
            : "Feed latency is within normal vendor delay parameters.";

    return {
        available: value !== null && history.length > 0,
        symbol: asString(quote.pro_name) ?? TV_SYMBOL,
        label: asString(quote.description) ?? "EGX 30 Index",
        source,
        currency: asString(quote.currency_code) ?? "EGP",
        exchange: asString(quote.exchange) ?? "EGX",
        updateMode,
        delaySeconds,
        quote: {
            value,
            change,
            changePercent,
            volume,
            timestamp: timestampIso,
        },
        history,
        note: noteOverride ?? delayText,
        fetchedAt: new Date().toISOString(),
    };
};

const fetchFromTradingViewWebSocket = async (): Promise<EgxIndexResponse> =>
    new Promise((resolve, reject) => {
        const quote: TvQuoteMap = {};
        let bars: TvBar[] = [];
        let settled = false;

        const quoteSession = `qs_${Math.random().toString(36).slice(2, 14)}`;
        const chartSession = `cs_${Math.random().toString(36).slice(2, 14)}`;

        const ws = new WebSocket(TV_WS_URL, {
            headers: {
                Origin: TV_ORIGIN,
                "User-Agent": TV_USER_AGENT,
            },
        });

        const finalize = (callback: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutHandle);
            try {
                ws.removeAllListeners();
                ws.terminate();
            } catch {
                // ignore cleanup errors
            }
            callback();
        };

        const timeoutHandle = setTimeout(() => {
            finalize(() => reject(new Error("TradingView websocket timeout")));
        }, WS_TIMEOUT_MS);

        const sendMessage = (method: string, params: unknown[]) => {
            ws.send(encodeMessage(method, params));
        };

        ws.on("open", () => {
            sendMessage("set_auth_token", ["unauthorized_user_token"]);
            sendMessage("quote_create_session", [quoteSession]);
            sendMessage("quote_set_fields", [
                quoteSession,
                "ch",
                "chp",
                "lp",
                "lp_time",
                "pro_name",
                "short_name",
                "description",
                "exchange",
                "currency_code",
                "type",
                "update_mode",
                "volume",
            ]);
            sendMessage("quote_add_symbols", [quoteSession, TV_SYMBOL, { flags: ["force_permission"] }]);

            sendMessage("chart_create_session", [chartSession, ""]);
            sendMessage("resolve_symbol", [
                chartSession,
                "symbol_1",
                `=${JSON.stringify({
                    symbol: TV_SYMBOL,
                    adjustment: "splits",
                    session: "regular",
                })}`,
            ]);
            sendMessage("create_series", [chartSession, "s1", "s1", "symbol_1", "1D", TV_HISTORY_BARS]);
            sendMessage("switch_timezone", [chartSession, "exchange"]);
        });

        ws.on("message", (rawData) => {
            const raw = typeof rawData === "string" ? rawData : rawData.toString("utf8");
            const packets = decodePackets(raw);

            for (const packet of packets) {
                if (packet.startsWith("~h~")) {
                    ws.send(wrapPacket(packet));
                    continue;
                }

                if (!packet.startsWith("{")) continue;

                let message: { m?: string; p?: unknown[] };
                try {
                    message = JSON.parse(packet) as { m?: string; p?: unknown[] };
                } catch {
                    continue;
                }

                const method = message.m;
                const params = Array.isArray(message.p) ? message.p : [];

                if (method === "qsd" && params.length > 1 && typeof params[1] === "object" && params[1] !== null) {
                    const payload = params[1] as { v?: TvQuoteMap };
                    if (payload.v && typeof payload.v === "object") {
                        Object.assign(quote, payload.v);
                    }
                    continue;
                }

                if (method === "timescale_update" && params.length > 1 && typeof params[1] === "object" && params[1] !== null) {
                    const payload = params[1] as { s1?: { s?: TvBar[] } };
                    const series = payload.s1?.s;
                    if (Array.isArray(series)) {
                        bars = series;
                    }
                    continue;
                }

                if (method === "series_completed") {
                    if (typeof params[2] === "string" && !asString(quote.update_mode)) {
                        quote.update_mode = params[2];
                    }
                    finalize(() => {
                        const history = normalizeHistory(bars);
                        resolve(buildResponse(quote, history, "tradingview-websocket"));
                    });
                    return;
                }

                if (method === "series_error" || method === "symbol_error") {
                    finalize(() => reject(new Error(`TradingView ${method}`)));
                    return;
                }
            }
        });

        ws.on("error", (error) => {
            finalize(() => reject(error instanceof Error ? error : new Error(String(error))));
        });

        ws.on("close", () => {
            if (settled) return;
            finalize(() => {
                const history = normalizeHistory(bars);
                if (history.length > 0) {
                    resolve(buildResponse(quote, history, "tradingview-websocket"));
                } else {
                    reject(new Error("TradingView socket closed before data completion"));
                }
            });
        });
    });

const fetchFromScannerFallback = async (): Promise<EgxIndexResponse> => {
    const fields = [
        "close",
        "open",
        "high",
        "low",
        "volume",
        "change",
        "change_abs",
        "lp_time",
        "time",
        "time[1]",
        "time[2]",
        "close[1]",
        "close[2]",
        "currency",
        "currency_code",
        "description",
        "exchange",
        "short_name",
        "update_mode",
    ];
    const query = new URLSearchParams({
        symbol: TV_SYMBOL,
        fields: fields.join(","),
    });
    const url = `https://scanner.tradingview.com/symbol?${query.toString()}`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": TV_USER_AGENT,
        },
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Scanner fallback failed with ${response.status}`);
    }

    const payload = (await response.json()) as TvQuoteMap;
    const nowTime = asNumber(payload.time);
    const nowClose = asNumber(payload.close);
    const history: EgxIndexHistoryPoint[] = [];

    const pushPoint = (timeValue: unknown, closeValue: unknown) => {
        const t = asNumber(timeValue);
        const c = asNumber(closeValue);
        if (t === null || c === null) return;
        const open = asNumber(payload.open) ?? c;
        const high = asNumber(payload.high) ?? c;
        const low = asNumber(payload.low) ?? c;
        const volume = asNumber(payload.volume) ?? 0;
        history.push({
            time: t,
            date: new Date(t * 1000).toISOString(),
            open,
            high,
            low,
            close: c,
            volume,
        });
    };

    pushPoint(payload["time[2]"], payload["close[2]"]);
    pushPoint(payload["time[1]"], payload["close[1]"]);
    pushPoint(nowTime, nowClose);

    payload.lp = nowClose;
    payload.ch = asNumber(payload.change_abs);
    payload.chp = asNumber(payload.change);
    payload.lp_time = nowTime;

    return buildResponse(
        payload,
        history.sort((a, b) => a.time - b.time),
        "tradingview-scanner-fallback",
        "Live websocket history temporarily unavailable; showing latest confirmed TradingView snapshot."
    );
};

export async function GET() {
    try {
        if (cachedPayload && Date.now() - cachedAt < CACHE_TTL_MS) {
            return NextResponse.json(cachedPayload);
        }

        let payload: EgxIndexResponse;

        try {
            payload = await fetchFromTradingViewWebSocket();
        } catch (primaryError) {
            console.warn("[API /egx30/index] websocket primary failed:", (primaryError as Error).message);
            payload = await fetchFromScannerFallback();
        }

        cachedPayload = payload;
        cachedAt = Date.now();
        if (payload.available) lastGoodPayload = payload;
        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("[API /egx30/index ERROR]", error?.message || error);
        // Graceful degradation: prefer the last good payload over an empty hero.
        if (lastGoodPayload) {
            return NextResponse.json({
                ...lastGoodPayload,
                source: "last-known-good",
                note: "Live EGX30 feed is temporarily unavailable; showing the last confirmed values.",
                fetchedAt: new Date().toISOString(),
            });
        }
        return NextResponse.json(
            {
                available: false,
                symbol: TV_SYMBOL,
                label: "EGX 30 Index",
                source: "tradingview-error",
                currency: "EGP",
                exchange: "EGX",
                updateMode: null,
                delaySeconds: null,
                quote: {
                    value: null,
                    change: null,
                    changePercent: null,
                    volume: null,
                    timestamp: null,
                },
                history: [],
                note: "Failed to fetch EGX30 from TradingView at this time.",
                fetchedAt: new Date().toISOString(),
            },
            { status: 502 }
        );
    }
}
