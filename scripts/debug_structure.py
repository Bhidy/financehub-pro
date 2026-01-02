from yahooquery import Ticker
import json

sym = "1120.SR" # Al Rajhi (Known Good)
t = Ticker(sym)
modules = ["incomeStatementHistory", "insiderHolders", "summaryDetail"]
data = t.get_modules(modules)
print(json.dumps(data, indent=2))
