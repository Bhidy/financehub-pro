#!/bin/bash
# ============================================================================
# FINHUB AI - ENTERPRISE iOS APP (v4.0) - FINAL STABLE VERSION
# ============================================================================
# Fixes: 1) Brain icon matching welcome, 2) Better questions, 3) No splash, 4) Simulator ready
# ============================================================================
set -e

echo "🚀 FinHub AI iOS App Setup v4.0..."
echo "============================================"

# Clean and create
rm -rf /Users/home/FinnyAI
mkdir -p /Users/home/FinnyAI
cd /Users/home/FinnyAI

# Initialize
echo "📦 Initializing Expo..."
npx create-expo-app@latest . --template blank-typescript --yes

# Install STABLE deps (NO Reanimated)
echo "📦 Installing dependencies..."
npm install expo-router expo-status-bar expo-haptics expo-blur expo-linear-gradient lucide-react-native react-native-safe-area-context react-native-screens react-native-svg

# app.json - NO SPLASH SCREEN, encryption exempt, stable build
echo "⚙️ Configuring app..."
cat > app.json << 'EOF'
{
  "expo": {
    "name": "FinHub AI",
    "slug": "finhub-ai",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": false,
    "ios": { 
      "supportsTablet": true, 
      "bundleIdentifier": "com.finhubpro.finhubai",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "scheme": "finhubai",
    "plugins": ["expo-router"]
  }
}
EOF

mkdir -p app lib components assets

# Create a valid placeholder icon (solid teal color)
echo "🎨 Creating app icon..."
# Download a simple placeholder or use the Expo default icon
cp node_modules/expo/assets/icon.png assets/icon.png 2>/dev/null || curl -sL "https://via.placeholder.com/1024/10b981/ffffff?text=F" -o assets/icon.png 2>/dev/null || touch assets/icon.png

cat > lib/api.ts << 'EOF'
export interface Message { role: "user" | "assistant"; content: string; }
const API_URL = "https://finhub-pro.vercel.app/api/v1/ai/chat";
export const sendChatMessage = async (message: string, history: Message[]) => {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
    });
    if (!response.ok) throw new Error("Failed");
    return await response.json();
};
EOF

# Premium UI Components
cat > components/PremiumUI.tsx << 'EOF'
import React from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Activity, Clock, Flame, AlertCircle, ArrowUpRight, ArrowDownRight, Brain } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

// FINHUB BRAIN LOGO - Consistent across app
export function FinHubLogo({ size = 64 }: { size?: number }) {
    return (
        <LinearGradient colors={['#0ea5e9', '#06b6d4', '#10b981']} start={{x:0,y:0}} end={{x:1,y:1}}
            style={{ width: size, height: size, borderRadius: size * 0.32, alignItems: 'center', justifyContent: 'center', shadowColor: '#0ea5e9', shadowOffset: {width:0, height: size*0.15}, shadowOpacity: 0.4, shadowRadius: size*0.2 }}>
            <Brain color="white" size={size * 0.45} strokeWidth={1.5} />
        </LinearGradient>
    );
}

// STAT CARD
export function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
    const configs: any = {
        price: { Icon: DollarSign, colors: ["#10b981", "#059669"] },
        change: { Icon: TrendingUp, colors: ["#3b82f6", "#2563eb"] },
        volume: { Icon: BarChart3, colors: ["#0ea5e9", "#0284c7"] },
        time: { Icon: Clock, colors: ["#f59e0b", "#d97706"] },
        trend: { Icon: Activity, colors: ["#06b6d4", "#0891b2"] },
        range: { Icon: Activity, colors: ["#14b8a6", "#0d9488"] },
    };
    const c = configs[icon] || configs.trend;
    const Icon = c.Icon;
    const isUp = value.includes('+');
    const isDown = value.includes('-');
    return (
        <View style={styles.statCard}>
            <LinearGradient colors={c.colors} style={styles.statIcon}><Icon size={18} color="white" strokeWidth={2.5} /></LinearGradient>
            <View style={styles.statContent}>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={[styles.statValue, isUp && {color:'#10b981'}, isDown && {color:'#ef4444'}]}>{value}</Text>
            </View>
            {isUp && <View style={[styles.trend, {backgroundColor:'rgba(16,185,129,0.1)'}]}><ArrowUpRight size={16} color="#10b981" /></View>}
            {isDown && <View style={[styles.trend, {backgroundColor:'rgba(239,68,68,0.1)'}]}><ArrowDownRight size={16} color="#ef4444" /></View>}
        </View>
    );
}

// VERDICT BADGE
export function VerdictBadge({ verdict, text }: { verdict: string; text: string }) {
    const configs: any = {
        bullish: { colors: ["#10b981", "#059669"], emoji: "🚀", label: "Looking Great!" },
        bearish: { colors: ["#ef4444", "#dc2626"], emoji: "⚠️", label: "Heads Up!" },
        neutral: { colors: ["#3b82f6", "#2563eb"], emoji: "📊", label: "Mixed Signals" },
        hot: { colors: ["#f97316", "#ea580c"], emoji: "🔥", label: "On Fire!" },
    };
    const c = configs[verdict.toLowerCase().replace('verdict:', '')] || configs.neutral;
    return (
        <LinearGradient colors={c.colors} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.verdict}>
            <View style={styles.verdictEmoji}><Text style={{fontSize:28}}>{c.emoji}</Text></View>
            <View style={{flex:1}}><Text style={styles.verdictLabel}>{c.label}</Text><Text style={styles.verdictText}>{text}</Text></View>
        </LinearGradient>
    );
}

// RANK CARD
export function RankCard({ rank, text }: { rank: number; text: string }) {
    const medals = ["🥇", "🥈", "🥉"];
    const colors = [["#fbbf24", "#f59e0b"], ["#94a3b8", "#64748b"], ["#fb923c", "#ea580c"]];
    return (
        <View style={styles.rankCard}>
            <LinearGradient colors={colors[Math.min(rank-1, 2)] as [string,string]} style={styles.rankBadge}>
                <Text style={{fontSize:22}}>{medals[Math.min(rank-1, 2)]}</Text>
            </LinearGradient>
            <View style={{flex:1, marginLeft:14}}>
                <Text style={styles.rankNum}>#{rank}</Text>
                <Text style={styles.rankText}>{text.replace(/\*\*/g, '')}</Text>
            </View>
        </View>
    );
}

// SUGGESTION CHIPS - Covers all 21 database tools
export function SuggestionChips({ onSelect }: { onSelect: (q: string) => void }) {
    const questions = [
        { emoji: "📈", text: "How is Aramco doing?", color: "#10b981" },
        { emoji: "🔥", text: "Top gainers today", color: "#ef4444" },
        { emoji: "📊", text: "SABIC technical analysis", color: "#3b82f6" },
        { emoji: "💰", text: "Al Rajhi financials", color: "#f59e0b" },
        { emoji: "🏦", text: "SNB analyst ratings", color: "#0ea5e9" },
        { emoji: "�", text: "STC news", color: "#14b8a6" },
        { emoji: "👤", text: "Aramco insider trading", color: "#6366f1" },
        { emoji: "🛢️", text: "Oil price today", color: "#78716c" },
        { emoji: "�", text: "Upcoming dividends", color: "#ec4899" },
        { emoji: "🏭", text: "Best performing sector", color: "#84cc16" },
    ];
    return (
        <View style={styles.suggestions}>
            <Text style={styles.suggestTitle}>Try asking:</Text>
            <View style={styles.chipRow}>
                {questions.map((q, i) => (
                    <TouchableOpacity key={i} onPress={() => onSelect(q.text)} activeOpacity={0.7}>
                        <LinearGradient colors={[q.color, q.color + 'dd']} style={styles.chip}>
                            <Text style={styles.chipEmoji}>{q.emoji}</Text>
                            <Text style={styles.chipText}>{q.text}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    statCard: { flexDirection:'row', alignItems:'center', backgroundColor:'white', padding:16, borderRadius:16, marginBottom:10, width: CARD_WIDTH, shadowColor:'#1e293b', shadowOffset:{width:0,height:4}, shadowOpacity:0.08, shadowRadius:12, borderWidth:1, borderColor:'#f1f5f9' },
    statIcon: { width:44, height:44, borderRadius:14, alignItems:'center', justifyContent:'center' },
    statContent: { flex:1, marginLeft:14 },
    statLabel: { color:'#64748b', fontSize:13, fontWeight:'500', marginBottom:2 },
    statValue: { color:'#0f172a', fontSize:18, fontWeight:'800' },
    trend: { width:32, height:32, borderRadius:10, alignItems:'center', justifyContent:'center' },
    verdict: { flexDirection:'row', alignItems:'center', padding:20, borderRadius:20, marginTop:16, width: CARD_WIDTH },
    verdictEmoji: { width:56, height:56, borderRadius:18, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center', marginRight:16 },
    verdictLabel: { color:'white', fontSize:20, fontWeight:'900', marginBottom:4 },
    verdictText: { color:'rgba(255,255,255,0.9)', fontSize:14, fontWeight:'500' },
    rankCard: { flexDirection:'row', alignItems:'center', backgroundColor:'white', padding:16, borderRadius:16, marginBottom:10, width: CARD_WIDTH, shadowColor:'#1e293b', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8 },
    rankBadge: { width:48, height:48, borderRadius:16, alignItems:'center', justifyContent:'center' },
    rankNum: { color:'#94a3b8', fontSize:12, fontWeight:'800', letterSpacing:1 },
    rankText: { color:'#1e293b', fontSize:15, fontWeight:'600', marginTop:2 },
    suggestions: { marginTop:20, width: CARD_WIDTH },
    suggestTitle: { color:'#64748b', fontSize:14, fontWeight:'600', marginBottom:12 },
    chipRow: { flexDirection:'row', flexWrap:'wrap', gap:8 },
    chip: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:8, borderRadius:12, gap:4, marginBottom:4 },
    chipEmoji: { fontSize:14 },
    chipText: { color:'white', fontSize:12, fontWeight:'600' },
});
EOF

# Message Parser
cat > components/MessageList.tsx << 'EOF'
import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { StatCard, VerdictBadge, RankCard } from "./PremiumUI";
import { Clock } from "lucide-react-native";

const { width } = Dimensions.get('window');

export function MessageBody({ content }: { content: string }) {
    const lines = content.split('\n');
    return (
        <View style={styles.container}>
            {lines.map((line, i) => {
                const t = line.trim();
                if (!t || t === '---') return null;
                if (t.startsWith('[STAT]')) {
                    const m = t.match(/\[STAT\]\s*([^:]+):\s*(.+)/);
                    if (m) {
                        const iconMap: any = { 'change': 'change', 'volume': 'volume', 'range': 'range', 'price': 'price' };
                        const icon = Object.keys(iconMap).find(k => m[1].toLowerCase().includes(k)) || 'trend';
                        return <StatCard key={i} icon={icon} label={m[1].trim()} value={m[2].trim()} />;
                    }
                }
                if (t.startsWith('[VERDICT:')) {
                    const m = t.match(/\[VERDICT:(\w+)\]\s*(.*)/);
                    if (m) return <VerdictBadge key={i} verdict={m[1]} text={m[2]} />;
                }
                if (t.startsWith('[RANK:')) {
                    const m = t.match(/\[RANK:(\d+)\]\s*(.*)/);
                    if (m) return <RankCard key={i} rank={parseInt(m[1])} text={m[2]} />;
                }
                if (t.toLowerCase().startsWith('updated:')) {
                    return <View key={i} style={styles.time}><Clock size={12} color="#94a3b8" /><Text style={styles.timeText}>Updated {t.split(':').slice(1).join(':').trim()}</Text></View>;
                }
                if (t.startsWith('**') && t.endsWith('**')) return <Text key={i} style={styles.heading}>{t.replace(/\*\*/g, '')}</Text>;
                return <Text key={i} style={styles.text}>{t}</Text>;
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: '100%' },
    heading: { color:'#0f172a', fontWeight:'800', fontSize:20, marginTop:8, marginBottom:8 },
    text: { color:'#475569', fontSize:16, lineHeight:26, marginBottom:4 },
    time: { flexDirection:'row', alignItems:'center', marginTop:16, paddingTop:12, borderTopWidth:1, borderTopColor:'#f1f5f9' },
    timeText: { color:'#94a3b8', fontSize:12, marginLeft:6 },
});
EOF

# Layout
cat > app/_layout.tsx << 'EOF'
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
export default function Layout() {
    return (
        <View style={{ flex: 1 }}>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
        </View>
    );
}
EOF

# Welcome Screen - Clean & Premium
cat > app/index.tsx << 'EOF'
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Crown } from "lucide-react-native";
import { FinHubLogo } from "../components/PremiumUI";

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();
    return (
        <View style={styles.container}>
            <View style={[styles.circle, styles.circle1]} />
            <View style={[styles.circle, styles.circle2]} />
            <View style={[styles.circle, styles.circle3]} />
            
            <View style={styles.hero}>
                <View style={styles.badge}><Crown size={14} color="#f59e0b" /><Text style={styles.badgeText}>PREMIUM EXPERIENCE</Text></View>
                <View style={styles.iconWrap}>
                    <FinHubLogo size={100} />
                    <View style={styles.iconRing} />
                    <View style={styles.iconRing2} />
                </View>
                <Text style={styles.title}>FinHub</Text>
                <LinearGradient colors={['#0ea5e9', '#10b981']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.aiTag}>
                    <Text style={styles.aiTagText}>AI INTELLIGENCE</Text>
                </LinearGradient>
                <Text style={styles.tagline}>The smartest way to understand{String.fromCharCode(10)}Saudi stocks</Text>
            </View>

            <View style={styles.bottom}>
                <TouchableOpacity onPress={() => router.push("/chat")} activeOpacity={0.95}>
                    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.cta}>
                        <View style={styles.ctaContent}>
                            <Text style={styles.ctaTitle}>Start Exploring</Text>
                            <Text style={styles.ctaSubtitle}>Ask me anything about Saudi stocks</Text>
                        </View>
                        <LinearGradient colors={['#10b981', '#14b8a6']} style={styles.ctaBtn}><ArrowRight size={22} color="white" /></LinearGradient>
                    </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.disclaimer}>Powered by FinHub AI</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex:1, backgroundColor:'#ffffff' },
    circle: { position:'absolute', borderRadius:999 },
    circle1: { width:300, height:300, top:-100, right:-100, backgroundColor:'rgba(14,165,233,0.08)' },
    circle2: { width:200, height:200, top:height*0.35, left:-80, backgroundColor:'rgba(16,185,129,0.08)' },
    circle3: { width:160, height:160, bottom:200, right:-60, backgroundColor:'rgba(245,158,11,0.08)' },
    hero: { flex:1, justifyContent:'center', alignItems:'center', paddingHorizontal:32 },
    badge: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(245,158,11,0.1)', paddingHorizontal:14, paddingVertical:8, borderRadius:20, gap:6, marginBottom:24 },
    badgeText: { color:'#f59e0b', fontSize:11, fontWeight:'800', letterSpacing:1 },
    iconWrap: { position:'relative', marginBottom:24 },
    iconRing: { position:'absolute', width:120, height:120, borderRadius:40, borderWidth:2, borderColor:'rgba(14,165,233,0.2)', top:-10, left:-10 },
    iconRing2: { position:'absolute', width:140, height:140, borderRadius:46, borderWidth:1, borderColor:'rgba(14,165,233,0.1)', top:-20, left:-20 },
    title: { fontSize:48, fontWeight:'900', color:'#0f172a', letterSpacing:-2 },
    aiTag: { paddingHorizontal:16, paddingVertical:6, borderRadius:8, marginTop:8, marginBottom:16 },
    aiTagText: { color:'white', fontSize:12, fontWeight:'800', letterSpacing:2 },
    tagline: { fontSize:17, color:'#64748b', textAlign:'center', lineHeight:26 },
    bottom: { paddingHorizontal:24, paddingBottom:50 },
    cta: { flexDirection:'row', alignItems:'center', padding:6, paddingLeft:24, borderRadius:24 },
    ctaContent: { flex:1 },
    ctaTitle: { color:'white', fontSize:18, fontWeight:'700', marginBottom:2 },
    ctaSubtitle: { color:'rgba(255,255,255,0.6)', fontSize:13 },
    ctaBtn: { width:56, height:56, borderRadius:20, alignItems:'center', justifyContent:'center' },
    disclaimer: { color:'#94a3b8', fontSize:11, textAlign:'center', marginTop:16 },
});
EOF

# Chat Screen
cat > app/chat.tsx << 'EOF'
import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Send, Brain } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { MessageBody } from "../components/MessageList";
import { SuggestionChips, FinHubLogo } from "../components/PremiumUI";
import { sendChatMessage } from "../lib/api";

const { width } = Dimensions.get('window');

interface Message { id: string; role: "user" | "assistant"; content: string; }

export default function ChatScreen() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const listRef = useRef<FlatList>(null);

    const handleSend = async (text?: string) => {
        const msg = text || query;
        if (!msg.trim() || isLoading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
        setMessages(prev => [...prev, userMsg]);
        setQuery("");
        setIsLoading(true);
        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            const res = await sendChatMessage(msg, history);
            setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "assistant", content: res.reply }]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "assistant", content: "**Oops!** 😅\n\nConnection failed. Try again!" }]);
        } finally { setIsLoading(false); }
    };

    return (
        <View style={styles.bg}>
            <SafeAreaView style={{flex:1}}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.back}><ArrowLeft size={22} color="#64748b" /></TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <FinHubLogo size={36} />
                        <View><Text style={styles.headerTitle}>FinHub AI</Text><Text style={styles.headerSub}>🟢 Online</Text></View>
                    </View>
                    <View style={{width:44}} />
                </View>

                <FlatList ref={listRef} data={messages} keyExtractor={item => item.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => listRef.current?.scrollToEnd({animated:true})}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <FinHubLogo size={72} />
                            <Text style={styles.emptyTitle}>Hey there! 👋</Text>
                            <Text style={styles.emptyText}>I'm your AI stock analyst.{'\n'}Ask me about any Saudi stock!</Text>
                            <SuggestionChips onSelect={handleSend} />
                        </View>
                    }
                    renderItem={({item}) => (
                        <View style={[styles.msgRow, item.role === 'user' && styles.msgRowUser]}>
                            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                                {item.role === 'user' ? <Text style={styles.userText}>{item.content}</Text> : <MessageBody content={item.content} />}
                            </View>
                        </View>
                    )}
                />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={10}>
                    <View style={styles.inputBar}>
                        <TextInput value={query} onChangeText={setQuery} placeholder="Ask about any stock..." placeholderTextColor="#94a3b8" style={styles.input} onSubmitEditing={() => handleSend()} />
                        <TouchableOpacity onPress={() => handleSend()} disabled={isLoading || !query.trim()}>
                            <LinearGradient colors={isLoading || !query.trim() ? ['#cbd5e1','#94a3b8'] : ['#0ea5e9','#10b981']} style={styles.sendBtn}>
                                {isLoading ? <ActivityIndicator color="white" size="small" /> : <Send size={20} color="white" />}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    bg: { flex:1, backgroundColor:'#f8fafc' },
    header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, backgroundColor:'white', borderBottomWidth:1, borderBottomColor:'#f1f5f9' },
    back: { width:44, height:44, borderRadius:14, backgroundColor:'#f8fafc', alignItems:'center', justifyContent:'center' },
    headerCenter: { flexDirection:'row', alignItems:'center', gap:10 },
    headerTitle: { fontSize:17, fontWeight:'700', color:'#0f172a' },
    headerSub: { fontSize:12, color:'#64748b' },
    list: { padding:16, paddingBottom:100 },
    empty: { alignItems:'center', paddingTop:60 },
    emptyTitle: { fontSize:28, fontWeight:'800', color:'#0f172a', marginTop:24, marginBottom:8 },
    emptyText: { fontSize:16, color:'#64748b', textAlign:'center', lineHeight:24, marginBottom:24 },
    msgRow: { marginBottom:16 },
    msgRowUser: { alignItems:'flex-end' },
    bubble: { maxWidth: width - 64, borderRadius:20, padding:16 },
    userBubble: { backgroundColor:'#0f172a', borderBottomRightRadius:4 },
    aiBubble: { backgroundColor:'white', borderBottomLeftRadius:4, shadowColor:'#1e293b', shadowOffset:{width:0,height:4}, shadowOpacity:0.08, shadowRadius:12, borderWidth:1, borderColor:'#f1f5f9', paddingHorizontal:8 },
    userText: { color:'white', fontSize:16, lineHeight:24 },
    inputBar: { padding:16, backgroundColor:'white', borderTopWidth:1, borderTopColor:'#f1f5f9', flexDirection:'row', alignItems:'center', gap:12 },
    input: { flex:1, backgroundColor:'#f8fafc', borderRadius:18, height:52, paddingHorizontal:20, fontSize:16, color:'#0f172a', borderWidth:1, borderColor:'#e2e8f0' },
    sendBtn: { width:52, height:52, borderRadius:18, alignItems:'center', justifyContent:'center' },
});
EOF

# Update package.json
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.main='expo-router/entry';fs.writeFileSync('package.json',JSON.stringify(p,null,2));"

# Build for iOS
echo "🔨 Building iOS project..."
npx expo prebuild --platform ios --clean

# Install pods
cd ios && pod install --repo-update

echo ""
echo "============================================"
echo "✅ FinHub AI v4.0 - Ready!"
echo "============================================"
echo ""
echo "📱 To run on iOS Simulator:"
echo "   cd /Users/home/FinnyAI && npx expo run:ios"
echo ""
echo "📦 To archive for TestFlight:"
echo "   1. Open Xcode: open /Users/home/FinnyAI/ios/*.xcworkspace"
echo "   2. Select your Team in Signing & Capabilities"
echo "   3. Product → Archive → Distribute App"
echo ""
