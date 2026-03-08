import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 390, 'height': 844})
        page = await context.new_page()

        # Start the app
        print("Starting app...")
        proc = await asyncio.create_subprocess_shell(
            "npm run dev > dev_output.log 2>&1",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await asyncio.sleep(5)

        try:
            await page.goto("http://localhost:8787")
            await page.wait_for_selector("#cf-account-id")
            print("Login page loaded.")

            # Fill login
            await page.fill("#cf-account-id", "test-account")
            await page.fill("#cf-token", "test-token")

            # Click Get Started
            await page.click("button:has-text('GET STARTED')")

            # Wait for dashboard
            await page.wait_for_selector("#view-dashboard", state="visible")
            print("Dashboard visible.")

            # Open Sidebar
            await page.click("button >> i.fa-bars")
            await page.wait_for_selector("#sidebar", state="visible")
            print("Sidebar opened.")

            # Check Log section
            await page.click("#error-log-section button")
            await asyncio.sleep(1)

            # Capture screenshot
            await page.screenshot(path="final_screenshot.png")
            print("Screenshot saved.")

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="error_screenshot.png")
        finally:
            await browser.close()
            # Kill the process
            await asyncio.create_subprocess_shell("pkill -f 'wrangler'")

asyncio.run(run())
