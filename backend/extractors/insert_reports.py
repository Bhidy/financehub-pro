
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

reports = [
  {
    "reportName": "Weekly Performance Report for Maksab OZ Fixed Income Fund - 2 EURO 22 December 2025",
    "actionDate": "22 December 2025",
    "downloadUrl": "http://data.feedgfm.com/mix2/DCMServiceProvider?ROLE=A&RT=87&ID=447B404C-7FB7-4E80-B3B3-C241D53A8CB2.pdf"
  },
  {
    "reportName": "Weekly Performance Report for Zaldi Money Market Fund - Zaldi Star 22 December 2025",
    "actionDate": "22 December 2025",
    "downloadUrl": "http://data.feedgfm.com/mix2/DCMServiceProvider?ROLE=A&RT=87&ID=F3789A24-0226-4039-A13E-F4CEA17AA281.pdf"
  },
  {
    "reportName": "Weekly Performance Report for Maksab OZ Fixed Income Fund - 1 USD 22 December 2025",
    "actionDate": "22 December 2025",
    "downloadUrl": "http://data.feedgfm.com/mix2/DCMServiceProvider?ROLE=A&RT=87&ID=F023AD7B-B88A-4B9D-9E62-EE85EBE3F1CF.pdf"
  },
  {
    "reportName": "Monthly Performance Report for Banque Misr Money Market Fund - Youm B Youm EUR November 2025",
    "actionDate": "30 November 2025",
    "downloadUrl": "http://data.feedgfm.com/mix2/DCMServiceProvider?ROLE=A&RT=87&ID=125A9A19-3EA1-4350-A184-2E98659AD8C7.pdf"
  },
  {
    "reportName": "Monthly Performance Report for Arab African Intenational Bank Money Market Fund - Juman November 2025",
    "actionDate": "30 November 2025",
    "downloadUrl": "http://data.feedgfm.com/mix2/DCMServiceProvider?ROLE=A&RT=87&ID=97E9FA1E-37FD-44D4-A840-6115045346D6.pdf"
  }
]

async def insert_reports():
    conn = await asyncpg.connect(DATABASE_URL)
    count = 0
    for r in reports:
        await conn.execute("""
            INSERT INTO fund_reports (market_code, report_name, report_date, report_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (market_code, report_url) DO UPDATE SET
                report_name = EXCLUDED.report_name,
                report_date = EXCLUDED.report_date
        """, 'EGX', r['reportName'], r['actionDate'], r['downloadUrl'])
        count += 1
    
    print(f"Inserted {count} reports")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(insert_reports())
