# STARTA AI - DEVELOPER QUICK START GUIDE

**For:** [Developer Name]
**From:** Osama
**Date:** February 2026
**Goal:** Launch Starta MVP in 7 days

---

## 📋 WHAT YOU'RE BUILDING

Starta is a conversational AI platform for Egyptian stock market analysis. Think "ChatGPT for Egyptian stocks" but with institutional-grade analysis, real-time data, and 20+ years of market expertise built in.

**Your job:** Build the technical infrastructure that brings this to life.

---

## 📦 WHAT YOU'VE BEEN GIVEN

1. **complete_implementation_kit.md** - This is your bible. Contains:
   - Full system architecture
   - Complete system prompt (2,500+ words)
   - Database schema (8 tables, all SQL)
   - Financial calculation logic (Python code)
   - API server code (FastAPI)
   - Frontend component (React)
   - Deployment guide

2. **starta_extended_scenarios_mockup.html** - Visual reference showing exactly what the final product should look like

3. **Financial data** - Osama will provide separately (from Stock Analysis scrape)

---

## 🚀 7-DAY BUILD PLAN

### **DAY 1: Database Setup**

**Morning:**
```bash
# Install PostgreSQL locally
brew install postgresql  # Mac
# or
sudo apt-get install postgresql  # Linux

# Start PostgreSQL
brew services start postgresql  # Mac
# or
sudo service postgresql start  # Linux

# Create database
createdb starta
```

**Afternoon:**
```bash
# Run the schema
psql starta < schema.sql

# Verify tables created
psql starta -c "\dt"
# Should show: stocks, prices, financials, valuation_ratios, macro_insights, sector_averages, macro_data, conversations, users
```

**Evening:**
- Import Osama's financial data (he'll give you CSV/Excel files)
- Write import script: `python import_data.py`
- Verify data loaded: `psql starta -c "SELECT COUNT(*) FROM stocks;"`

**✅ Done when:** You can query database and see Egyptian stock data

---

### **DAY 2: Backend API - Part 1**

**Morning:**
```bash
# Create project structure
mkdir starta-backend
cd starta-backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install fastapi uvicorn anthropic psycopg2-binary python-dotenv
```

**Afternoon:**
- Copy `database.py` from implementation kit
- Copy `main.py` from implementation kit
- Create `.env` file:
```bash
ANTHROPIC_API_KEY=sk-ant-...  # Get from Osama
DB_HOST=localhost
DB_NAME=starta
DB_USER=postgres
DB_PASSWORD=your_password
```

**Evening:**
- Test database connection:
```bash
python test_db.py  # Write simple script to test queries
```

**✅ Done when:** Database connection works, you can fetch JUFO data

---

### **DAY 3: Backend API - Part 2**

**Morning:**
- Copy `financial_calculator.py` from implementation kit
- Copy `system_prompt.txt` from implementation kit
- Test Claude API:
```python
import anthropic
client = anthropic.Anthropic(api_key="your-key")
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1000,
    messages=[{"role": "user", "content": "Hello"}]
)
print(response.content[0].text)
```

**Afternoon:**
- Implement `/api/chat` endpoint fully
- Test with: `curl -X POST http://localhost:8000/api/chat -H "Content-Type: application/json" -d '{"message": "Tell me about JUFO", "session_id": "test123"}'`

**Evening:**
- Test 5 different questions:
  1. "Should I buy JUFO?"
  2. "What are the most undervalued stocks?"
  3. "Is this a good time to buy stocks?"
  4. "What does ROE mean?"
  5. "Compare JUFO to competitors"

**✅ Done when:** All 5 questions return good responses

---

### **DAY 4: Frontend - Part 1**

**Morning:**
```bash
# Create Next.js app
npx create-next-app@latest starta-frontend
cd starta-frontend

# Install dependencies
npm install axios
```

**Afternoon:**
- Copy `Chat.tsx` component from implementation kit
- Create basic page layout:
```typescript
// pages/index.tsx
import Chat from '../components/Chat'

export default function Home() {
  return (
    <main className="h-screen">
      <Chat />
    </main>
  )
}
```

**Evening:**
- Connect frontend to backend API
- Test sending messages
- Fix CORS issues if any (already configured in FastAPI)

**✅ Done when:** You can type a message and get AI response

---

### **DAY 5: Frontend - Part 2**

**Morning:**
- Style the chat interface (Tailwind CSS)
- Make it look like the mockup Osama provided
- Add loading states, animations

**Afternoon:**
- Add data cards for stock info (price, metrics)
- Parse AI responses to extract structured data
- Display embedded cards in chat

**Evening:**
- Test on mobile (responsive design)
- Fix UI bugs
- Polish the experience

**✅ Done when:** Chat looks professional and works smoothly

---

### **DAY 6: Integration & Testing**

**Morning:**
- End-to-end testing:
  - Create user session
  - Ask 10 different questions
  - Verify all responses are good
  - Check conversation history works

**Afternoon:**
- Error handling:
  - What if Claude API fails?
  - What if database is down?
  - What if user asks about unknown ticker?
  - Add graceful fallbacks

**Evening:**
- Performance:
  - Add Redis caching for frequently asked questions
  - Optimize database queries
  - Test with multiple concurrent users

**✅ Done when:** System is stable, no crashes

---

### **DAY 7: Deployment**

**Morning - Deploy Backend:**
```bash
# Install Heroku CLI
brew install heroku/brew/heroku  # Mac

# Login
heroku login

# Create app
heroku create starta-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set ANTHROPIC_API_KEY=sk-ant-...

# Deploy
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a starta-api
git push heroku main

# Migrate database
heroku run python migrate_data.py

# Test
curl https://starta-api.herokuapp.com/health
```

**Afternoon - Deploy Frontend:**
```bash
# Install Vercel CLI
npm i -g vercel

# Set environment variable
# Create .env.local:
NEXT_PUBLIC_API_URL=https://starta-api.herokuapp.com

# Deploy
vercel --prod

# Test
# Visit your-app.vercel.app
```

**Evening:**
- Give Osama the URLs
- He tests with 5 people from his network
- You fix any bugs they find

**✅ Done when:** Both URLs work, Osama can demo to investors

---

## 🔑 KEY FILES YOU'LL CREATE

### Backend (`starta-backend/`)
```
├── main.py                    ← Copy from kit
├── database.py                ← Copy from kit
├── financial_calculator.py    ← Copy from kit
├── system_prompt.txt          ← Copy from kit
├── schema.sql                 ← Copy from kit
├── requirements.txt           ← Create this
├── .env                       ← Create this
├── import_data.py             ← You write this
└── Procfile                   ← For Heroku
```

**requirements.txt:**
```
fastapi==0.109.0
uvicorn==0.27.0
anthropic==0.18.0
psycopg2-binary==2.9.9
python-dotenv==1.0.0
```

**Procfile:**
```
web: uvicorn main:app --host=0.0.0.0 --port=${PORT:-8000}
```

### Frontend (`starta-frontend/`)
```
├── components/
│   └── Chat.tsx              ← Copy from kit
├── pages/
│   └── index.tsx             ← You write this
├── package.json
└── .env.local                ← Create this
```

---

## 💡 IMPORTANT NOTES

### **1. System Prompt is Sacred**
The `system_prompt.txt` file is Osama's 20 years of expertise encoded into text. DO NOT modify it without consulting him. This is what makes Starta sound like a professional, not generic ChatGPT.

### **2. Financial Data Import**
Osama will give you financial data. It's probably CSV or Excel from Stock Analysis. You'll need to:
- Parse it
- Map to our database schema
- Insert into: stocks, prices, financials, valuation_ratios tables

Write `import_data.py` to automate this. Example:
```python
import pandas as pd
import psycopg2

# Read CSV
df = pd.read_csv('financials.csv')

# Connect to DB
conn = psycopg2.connect(...)

# Insert data
for _, row in df.iterrows():
    cursor.execute("""
        INSERT INTO financials (ticker, revenue, net_income, ...)
        VALUES (%s, %s, %s, ...)
    """, (row['ticker'], row['revenue'], ...))

conn.commit()
```

### **3. Anthropic API Key**
Osama will provide this. Keep it SECRET. Never commit to git. Always use environment variables.

### **4. Testing Strategy**
Test these questions EVERY time you make changes:
1. "Should I buy JUFO?" (single stock analysis)
2. "What are the most undervalued stocks?" (screener)
3. "Is this a good time to buy stocks?" (macro analysis)
4. "What does P/E ratio mean?" (educational)
5. "Compare JUFO to DOMP" (peer comparison)

If all 5 work well, you're good.

### **5. Error Messages**
When something fails, be specific:
- ❌ "Error occurred"
- ✅ "I couldn't find data for ticker XYZ. Are you sure it's listed on EGX?"

### **6. Performance**
- Target: Responses in < 5 seconds
- Claude API typically takes 2-4 seconds
- Database queries should be < 100ms
- If slower, add caching

---

## 🐛 COMMON ISSUES & SOLUTIONS

### **Issue: "ModuleNotFoundError: No module named 'anthropic'"**
**Solution:** 
```bash
pip install anthropic
# or
pip install -r requirements.txt
```

### **Issue: "psycopg2.OperationalError: could not connect to server"**
**Solution:**
- Check PostgreSQL is running: `brew services list`
- Check credentials in `.env`
- Check database exists: `psql -l`

### **Issue: "CORS error" when frontend calls backend**
**Solution:** Already fixed in `main.py` with CORS middleware. If still happening:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **Issue: "Rate limit exceeded" from Claude API**
**Solution:** 
- Anthropic has generous limits (50k tokens/min)
- If you hit it during testing, wait 1 minute
- In production, implement exponential backoff

### **Issue: Frontend not updating after code change**
**Solution:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## 📞 WHO TO ASK WHAT

### **Ask Osama:**
- ❓ "Does this response sound like you?"
- ❓ "What's the right threshold for undervalued banks?"
- ❓ "Should we include this metric?"
- ❓ "Is this regulatory framing safe?"

### **Ask Claude (me):**
- ❓ Technical implementation questions
- ❓ "How do I optimize this query?"
- ❓ "Best way to structure this code?"
- ❓ API integration issues

### **Don't Ask Anyone (Just Google):**
- ❓ "How to install Python?"
- ❓ "What is FastAPI?"
- ❓ Basic syntax questions

---

## ✅ DEFINITION OF DONE

**You're done when:**

1. ✅ User can visit URL and see chat interface
2. ✅ User can ask about any Egyptian stock and get analysis
3. ✅ Response quality matches the mockup scenarios
4. ✅ System handles errors gracefully
5. ✅ Osama has tested with 5 people from his network
6. ✅ No major bugs or crashes
7. ✅ Both frontend and backend are deployed

**Then:** Launch to 50 beta users, collect feedback, iterate.

---

## 🎯 SUCCESS METRICS (Week 1)

- **Response time:** < 5 seconds average
- **Error rate:** < 5%
- **User satisfaction:** Osama and 5 testers say "this is great"
- **Uptime:** 95%+ (some downtime ok during beta)

---

## 📚 RESOURCES

**Docs you'll need:**
- FastAPI: https://fastapi.tiangolo.com/
- Anthropic API: https://docs.anthropic.com/
- Next.js: https://nextjs.org/docs
- PostgreSQL: https://www.postgresql.org/docs/

**When stuck:**
- Read the implementation kit again (99% of answers are there)
- Ask Osama (domain/business questions)
- Google/StackOverflow (technical questions)

---

## 💰 COST TRACKING

Keep track of costs during development:
- Claude API: ~$20-30 for testing (Osama's account)
- Heroku Postgres: $0 (free tier during dev)
- Heroku Dyno: $0 (free tier during dev)
- Vercel: $0 (free tier)

**Total dev cost: ~$20-30**

After launch (100 users):
- ~$170-260/month (see implementation kit for breakdown)

---

## 🚨 CRITICAL REMINDERS

1. **Never commit API keys to git**
2. **Test every change with the 5 sample questions**
3. **Keep Osama updated daily** (5-min standup: "Here's what I built, here's what I'm building next")
4. **Deploy early** (Day 7, not Day 14)
5. **Perfect is the enemy of shipped** (80% good is enough for beta)

---

## 📅 DAILY CHECK-INS WITH OSAMA

**End of each day, send Osama:**
1. ✅ What I completed today
2. 🚧 What I'm blocked on (if anything)
3. 📅 What I'm doing tomorrow
4. 🎥 Quick demo video (30 seconds, Loom recording)

This keeps everyone aligned and prevents surprises.

---

## 🎉 LAUNCH DAY (Day 7 Evening)

**Checklist:**
- [ ] Backend deployed to Heroku ✅
- [ ] Frontend deployed to Vercel ✅
- [ ] Database populated with Egyptian stock data ✅
- [ ] System prompt loaded ✅
- [ ] Tested with 5 sample questions ✅
- [ ] Osama has tested and approved ✅
- [ ] URLs shared with 50 beta users ✅

**Then:** Pop champagne 🍾, watch the feedback roll in, iterate.

---

**YOU'VE GOT THIS. LET'S BUILD SOMETHING GREAT.**

---

## 📬 QUESTIONS?

If anything is unclear:
1. Re-read the implementation kit
2. Ask Osama
3. Google it
4. Move forward (done is better than perfect)

**Remember:** This is an MVP. It doesn't need to be perfect. It needs to WORK and SHIP.

**Now go build.** 🚀
