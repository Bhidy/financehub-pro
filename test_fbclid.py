from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        def handle_console(msg):
            print(f"BROWSER CONSOLE: {msg.type}: {msg.text}")
            
        def handle_error(err):
            print(f"BROWSER ERROR: {err}")
            
        page.on("console", handle_console)
        page.on("pageerror", handle_error)
        
        url = "http://127.0.0.1:3000/shared/sess_1768861489037?fbclid=IwY2xjawQIVz9leHRuA2FlbQIxMQBzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEe4SsdHjVT07Jd1QfXLElXFP7VeuGlhZqA_3meOjTpxDcNEoIUxrEFccI-Vis_aem_PdLa5N0ZFMceNQEJ1hUfBg"
        print(f"Navigating to {url}")
        try:
            page.goto(url, wait_until="networkidle")
        except Exception as e:
            print(f"Navigation exception: {e}")
            
        page.wait_for_timeout(3000)
        browser.close()

if __name__ == "__main__":
    main()
