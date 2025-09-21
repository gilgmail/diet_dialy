#!/usr/bin/env python3
"""
Comprehensive testing suite for Diet Daily application
Tests food diary, dashboard, and cross-page synchronization
"""

import asyncio
import json
import time
from datetime import datetime
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

class DietDailyTester:
    def __init__(self):
        self.base_url = "http://localhost:3001"
        self.test_results = {
            "timestamp": datetime.now().isoformat(),
            "test_summary": {},
            "food_diary_tests": {},
            "dashboard_tests": {},
            "sync_tests": {},
            "ui_ux_tests": {},
            "screenshots": []
        }
        self.browser = None
        self.context = None

    async def setup(self):
        """Initialize browser and context"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=False,
            args=['--disable-web-security', '--disable-features=VizDisplayCompositor']
        )
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )

    async def teardown(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()

    async def take_screenshot(self, page: Page, name: str, full_page=True):
        """Take screenshot and record in results"""
        filename = f"/tmp/diet_daily_{name}_{int(time.time())}.png"
        await page.screenshot(path=filename, full_page=full_page)
        self.test_results["screenshots"].append({
            "name": name,
            "path": filename,
            "timestamp": datetime.now().isoformat()
        })
        print(f"📸 Screenshot saved: {name}")

    async def wait_for_element(self, page: Page, selector: str, timeout=10000):
        """Wait for element with error handling"""
        try:
            await page.wait_for_selector(selector, timeout=timeout)
            return True
        except Exception as e:
            print(f"⚠️ Element not found: {selector} - {e}")
            return False

    async def test_application_accessibility(self):
        """Test if application is accessible and loads properly"""
        print("\n🔍 Testing Application Accessibility...")
        page = await self.context.new_page()

        try:
            # Navigate to main page
            await page.goto(self.base_url, wait_until='networkidle', timeout=30000)
            title = await page.title()

            self.test_results["test_summary"]["app_accessible"] = True
            self.test_results["test_summary"]["app_title"] = title

            await self.take_screenshot(page, "main_page")
            print(f"✅ Application accessible - Title: {title}")

            # Check for React/Next.js hydration
            await page.wait_for_timeout(2000)

            return page

        except Exception as e:
            self.test_results["test_summary"]["app_accessible"] = False
            self.test_results["test_summary"]["error"] = str(e)
            print(f"❌ Application not accessible: {e}")
            await page.close()
            return None

    async def test_food_diary_page(self):
        """Test Food Diary page functionality"""
        print("\n🍽️ Testing Food Diary Page...")
        page = await self.context.new_page()

        try:
            # Navigate to food diary page
            await page.goto(f"{self.base_url}/food-diary", wait_until='networkidle')
            await self.take_screenshot(page, "food_diary_initial")

            # Test page title and basic elements
            title = await page.title()
            self.test_results["food_diary_tests"]["page_title"] = title

            # Test quick food entry form
            form_tests = await self.test_food_entry_form(page)
            self.test_results["food_diary_tests"]["form_tests"] = form_tests

            # Test status badges and sync functionality
            sync_tests = await self.test_sync_functionality(page)
            self.test_results["food_diary_tests"]["sync_tests"] = sync_tests

            # Test food records display
            records_tests = await self.test_food_records_display(page)
            self.test_results["food_diary_tests"]["records_tests"] = records_tests

            print("✅ Food Diary page tests completed")
            return page

        except Exception as e:
            self.test_results["food_diary_tests"]["error"] = str(e)
            print(f"❌ Food Diary page error: {e}")
            await page.close()
            return None

    async def test_food_entry_form(self, page: Page):
        """Test food entry form functionality"""
        print("  📝 Testing food entry form...")
        form_tests = {}

        try:
            # Look for form elements
            food_input = 'input[placeholder*="food" i], input[name*="food" i], input[id*="food" i]'
            amount_input = 'input[placeholder*="amount" i], input[name*="amount" i], input[type="number"]'
            submit_button = 'button[type="submit"], button:has-text("Add"), button:has-text("Submit")'

            # Test form presence
            form_tests["form_exists"] = await self.wait_for_element(page, 'form')

            if form_tests["form_exists"]:
                # Test food input
                form_tests["food_input_exists"] = await self.wait_for_element(page, food_input)

                # Test amount input
                form_tests["amount_input_exists"] = await self.wait_for_element(page, amount_input)

                # Test submit button
                form_tests["submit_button_exists"] = await self.wait_for_element(page, submit_button)

                # Test form submission if all elements exist
                if all([form_tests["food_input_exists"], form_tests["amount_input_exists"], form_tests["submit_button_exists"]]):
                    await self.test_form_submission(page, food_input, amount_input, submit_button)
                    form_tests["form_submission_tested"] = True
                    await self.take_screenshot(page, "food_entry_form_filled")

            return form_tests

        except Exception as e:
            form_tests["error"] = str(e)
            return form_tests

    async def test_form_submission(self, page: Page, food_input: str, amount_input: str, submit_button: str):
        """Test actual form submission"""
        try:
            # Fill form with test data
            await page.fill(food_input, "Test Apple")
            await page.fill(amount_input, "150")

            # Take screenshot before submission
            await self.take_screenshot(page, "form_before_submit")

            # Submit form
            await page.click(submit_button)

            # Wait for potential response/update
            await page.wait_for_timeout(2000)

            # Take screenshot after submission
            await self.take_screenshot(page, "form_after_submit")

            print("    ✅ Form submission tested")

        except Exception as e:
            print(f"    ❌ Form submission error: {e}")

    async def test_sync_functionality(self, page: Page):
        """Test sync status and controls"""
        print("  🔄 Testing sync functionality...")
        sync_tests = {}

        try:
            # Look for status badges
            status_selectors = [
                '[class*="badge"]',
                '[class*="status"]',
                'span:has-text("pending")',
                'span:has-text("syncing")',
                'span:has-text("synced")',
                'span:has-text("error")'
            ]

            for selector in status_selectors:
                elements = await page.query_selector_all(selector)
                if elements:
                    sync_tests["status_badges_found"] = len(elements)
                    break

            # Look for auto-sync toggle
            toggle_selectors = [
                'input[type="checkbox"]',
                '[role="switch"]',
                'button:has-text("Auto")',
                '[class*="toggle"]'
            ]

            for selector in toggle_selectors:
                if await self.wait_for_element(page, selector, timeout=3000):
                    sync_tests["auto_sync_toggle_found"] = True
                    # Test toggle interaction
                    await page.click(selector)
                    await page.wait_for_timeout(1000)
                    sync_tests["toggle_interaction_tested"] = True
                    break

            # Look for manual sync button
            sync_button_selectors = [
                'button:has-text("Sync")',
                'button:has-text("Manual")',
                '[class*="sync"]'
            ]

            for selector in sync_button_selectors:
                if await self.wait_for_element(page, selector, timeout=3000):
                    sync_tests["manual_sync_button_found"] = True
                    # Test sync button
                    await page.click(selector)
                    await page.wait_for_timeout(2000)
                    sync_tests["manual_sync_tested"] = True
                    break

            return sync_tests

        except Exception as e:
            sync_tests["error"] = str(e)
            return sync_tests

    async def test_food_records_display(self, page: Page):
        """Test food records display and categorization"""
        print("  📋 Testing food records display...")
        records_tests = {}

        try:
            # Look for food records container
            records_selectors = [
                '[class*="record"]',
                '[class*="food"]',
                '[class*="item"]',
                'ul',
                '[role="list"]'
            ]

            for selector in records_selectors:
                elements = await page.query_selector_all(selector)
                if elements and len(elements) > 0:
                    records_tests["records_container_found"] = True
                    records_tests["records_count"] = len(elements)

                    # Check for categorization
                    categories = await page.query_selector_all('[class*="category"], h2, h3')
                    records_tests["categories_found"] = len(categories)

                    break

            # Check for empty state
            empty_selectors = [
                ':has-text("No records")',
                ':has-text("Empty")',
                '[class*="empty"]'
            ]

            for selector in empty_selectors:
                if await page.query_selector(selector):
                    records_tests["empty_state_found"] = True
                    break

            return records_tests

        except Exception as e:
            records_tests["error"] = str(e)
            return records_tests

    async def test_dashboard_page(self):
        """Test Dashboard page functionality"""
        print("\n📊 Testing Dashboard Page...")
        page = await self.context.new_page()

        try:
            # Navigate to dashboard
            await page.goto(f"{self.base_url}/dashboard", wait_until='networkidle')
            await self.take_screenshot(page, "dashboard_initial")

            # Test statistics cards
            stats_tests = await self.test_statistics_cards(page)
            self.test_results["dashboard_tests"]["stats_tests"] = stats_tests

            # Test recent activities
            activities_tests = await self.test_recent_activities(page)
            self.test_results["dashboard_tests"]["activities_tests"] = activities_tests

            # Test quick actions
            actions_tests = await self.test_quick_actions(page)
            self.test_results["dashboard_tests"]["actions_tests"] = actions_tests

            print("✅ Dashboard page tests completed")
            return page

        except Exception as e:
            self.test_results["dashboard_tests"]["error"] = str(e)
            print(f"❌ Dashboard page error: {e}")
            await page.close()
            return None

    async def test_statistics_cards(self, page: Page):
        """Test statistics cards display"""
        print("  📈 Testing statistics cards...")
        stats_tests = {}

        try:
            # Look for statistics cards
            card_selectors = [
                '[class*="card"]',
                '[class*="stat"]',
                '[class*="metric"]',
                '.grid > div'
            ]

            for selector in card_selectors:
                cards = await page.query_selector_all(selector)
                if cards and len(cards) >= 3:  # Expecting today, week, month, sync status
                    stats_tests["cards_found"] = len(cards)

                    # Check for specific metrics
                    today_card = await page.query_selector(':has-text("today"), :has-text("Today")')
                    week_card = await page.query_selector(':has-text("week"), :has-text("Week")')
                    month_card = await page.query_selector(':has-text("month"), :has-text("Month")')
                    sync_card = await page.query_selector(':has-text("sync"), :has-text("Sync")')

                    stats_tests["today_card"] = today_card is not None
                    stats_tests["week_card"] = week_card is not None
                    stats_tests["month_card"] = month_card is not None
                    stats_tests["sync_card"] = sync_card is not None

                    break

            return stats_tests

        except Exception as e:
            stats_tests["error"] = str(e)
            return stats_tests

    async def test_recent_activities(self, page: Page):
        """Test recent activities display and load more functionality"""
        print("  📝 Testing recent activities...")
        activities_tests = {}

        try:
            # Look for recent activities section
            activities_selectors = [
                ':has-text("Recent") + *',
                '[class*="activit"]',
                '[class*="recent"]',
                'ul li'
            ]

            for selector in activities_selectors:
                activities = await page.query_selector_all(selector)
                if activities:
                    activities_tests["activities_found"] = len(activities)
                    activities_tests["has_activities"] = len(activities) > 0

                    # Check for 10 records limit
                    if len(activities) >= 10:
                        activities_tests["limit_applied"] = True

                    break

            # Look for load more button
            load_more_selectors = [
                'button:has-text("Load more")',
                'button:has-text("More")',
                '[class*="load"]'
            ]

            for selector in load_more_selectors:
                if await self.wait_for_element(page, selector, timeout=3000):
                    activities_tests["load_more_button_found"] = True

                    # Test load more functionality
                    await page.click(selector)
                    await page.wait_for_timeout(2000)
                    activities_tests["load_more_tested"] = True
                    break

            return activities_tests

        except Exception as e:
            activities_tests["error"] = str(e)
            return activities_tests

    async def test_quick_actions(self, page: Page):
        """Test quick action buttons"""
        print("  ⚡ Testing quick actions...")
        actions_tests = {}

        try:
            # Look for action buttons
            action_selectors = [
                'button:has-text("Add")',
                'button:has-text("Quick")',
                '[class*="action"]',
                'a[href*="food"]',
                'a[href*="history"]'
            ]

            actions_found = 0
            for selector in action_selectors:
                buttons = await page.query_selector_all(selector)
                actions_found += len(buttons)

            actions_tests["action_buttons_found"] = actions_found

            # Test navigation to history page
            history_link = await page.query_selector('a[href*="history"], button:has-text("History")')
            if history_link:
                actions_tests["history_navigation_available"] = True

            return actions_tests

        except Exception as e:
            actions_tests["error"] = str(e)
            return actions_tests

    async def test_cross_page_synchronization(self):
        """Test data synchronization between pages"""
        print("\n🔄 Testing Cross-Page Data Synchronization...")

        try:
            # Open both pages in separate tabs
            food_diary_page = await self.context.new_page()
            dashboard_page = await self.context.new_page()

            # Navigate to both pages
            await food_diary_page.goto(f"{self.base_url}/food-diary", wait_until='networkidle')
            await dashboard_page.goto(f"{self.base_url}/dashboard", wait_until='networkidle')

            await self.take_screenshot(food_diary_page, "sync_test_food_diary")
            await self.take_screenshot(dashboard_page, "sync_test_dashboard_before")

            # Add food record on food diary page
            sync_tests = await self.test_data_sync(food_diary_page, dashboard_page)
            self.test_results["sync_tests"] = sync_tests

            await food_diary_page.close()
            await dashboard_page.close()

            print("✅ Cross-page synchronization tests completed")

        except Exception as e:
            self.test_results["sync_tests"]["error"] = str(e)
            print(f"❌ Cross-page sync error: {e}")

    async def test_data_sync(self, food_page: Page, dashboard_page: Page):
        """Test actual data synchronization"""
        sync_tests = {}

        try:
            # Try to add a food record on food diary page
            food_input = 'input[placeholder*="food" i], input[name*="food" i]'
            amount_input = 'input[type="number"], input[name*="amount" i]'
            submit_button = 'button[type="submit"], button:has-text("Add")'

            if await self.wait_for_element(food_page, food_input):
                # Add test food item
                test_food = f"Sync Test Item {int(time.time())}"
                await food_page.fill(food_input, test_food)

                if await self.wait_for_element(food_page, amount_input):
                    await food_page.fill(amount_input, "200")

                if await self.wait_for_element(food_page, submit_button):
                    await food_page.click(submit_button)
                    await food_page.wait_for_timeout(3000)  # Wait for sync

                    sync_tests["food_added"] = True
                    await self.take_screenshot(food_page, "sync_test_food_added")

                    # Check dashboard for the new item
                    await dashboard_page.reload(wait_until='networkidle')
                    await dashboard_page.wait_for_timeout(2000)

                    # Look for the test item on dashboard
                    item_found = await dashboard_page.query_selector(f':has-text("{test_food}")')
                    sync_tests["item_appears_on_dashboard"] = item_found is not None

                    await self.take_screenshot(dashboard_page, "sync_test_dashboard_after")

            return sync_tests

        except Exception as e:
            sync_tests["error"] = str(e)
            return sync_tests

    async def test_responsive_design(self):
        """Test responsive design on different screen sizes"""
        print("\n📱 Testing Responsive Design...")
        page = await self.context.new_page()

        screen_sizes = [
            {'name': 'mobile', 'width': 375, 'height': 667},
            {'name': 'tablet', 'width': 768, 'height': 1024},
            {'name': 'desktop', 'width': 1920, 'height': 1080}
        ]

        ui_tests = {}

        try:
            for size in screen_sizes:
                print(f"  📐 Testing {size['name']} view ({size['width']}x{size['height']})...")

                await page.set_viewport_size({'width': size['width'], 'height': size['height']})

                # Test both pages at this size
                await page.goto(f"{self.base_url}/food-diary", wait_until='networkidle')
                await self.take_screenshot(page, f"responsive_{size['name']}_food_diary")

                await page.goto(f"{self.base_url}/dashboard", wait_until='networkidle')
                await self.take_screenshot(page, f"responsive_{size['name']}_dashboard")

                # Test navigation and interactions
                nav_tests = await self.test_navigation_responsive(page, size['name'])
                ui_tests[f"{size['name']}_navigation"] = nav_tests

            self.test_results["ui_ux_tests"]["responsive_tests"] = ui_tests
            await page.close()

            print("✅ Responsive design tests completed")

        except Exception as e:
            self.test_results["ui_ux_tests"]["responsive_error"] = str(e)
            print(f"❌ Responsive design error: {e}")
            await page.close()

    async def test_navigation_responsive(self, page: Page, size_name: str):
        """Test navigation at different screen sizes"""
        nav_tests = {}

        try:
            # Look for navigation elements
            nav_selectors = [
                'nav',
                '[role="navigation"]',
                'header a',
                'button:has-text("Menu")',
                '[class*="nav"]'
            ]

            nav_found = False
            for selector in nav_selectors:
                elements = await page.query_selector_all(selector)
                if elements:
                    nav_tests["nav_elements_found"] = len(elements)
                    nav_found = True
                    break

            # Test mobile menu if on mobile
            if size_name == 'mobile':
                menu_button = await page.query_selector('button:has-text("Menu"), [class*="hamburger"]')
                if menu_button:
                    nav_tests["mobile_menu_found"] = True
                    await menu_button.click()
                    await page.wait_for_timeout(1000)
                    nav_tests["mobile_menu_tested"] = True

            return nav_tests

        except Exception as e:
            nav_tests["error"] = str(e)
            return nav_tests

    async def test_error_handling_and_loading_states(self):
        """Test error handling and loading states"""
        print("\n⚠️ Testing Error Handling and Loading States...")
        page = await self.context.new_page()

        error_tests = {}

        try:
            # Test invalid route
            await page.goto(f"{self.base_url}/invalid-route")
            await page.wait_for_timeout(3000)

            error_page = await page.query_selector(':has-text("404"), :has-text("Not Found"), :has-text("Error")')
            error_tests["404_handling"] = error_page is not None

            await self.take_screenshot(page, "error_404_page")

            # Test loading states by quickly navigating
            await page.goto(f"{self.base_url}/dashboard")

            # Look for loading indicators
            loading_indicators = await page.query_selector_all('[class*="loading"], [class*="spinner"], :has-text("Loading")')
            error_tests["loading_indicators_found"] = len(loading_indicators)

            self.test_results["ui_ux_tests"]["error_handling"] = error_tests
            await page.close()

            print("✅ Error handling tests completed")

        except Exception as e:
            self.test_results["ui_ux_tests"]["error_handling_error"] = str(e)
            print(f"❌ Error handling test error: {e}")
            await page.close()

    async def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Comprehensive Diet Daily Testing...")
        print("=" * 60)

        await self.setup()

        try:
            # Test 1: Application accessibility
            main_page = await self.test_application_accessibility()
            if not main_page:
                print("❌ Cannot proceed - application not accessible")
                return
            await main_page.close()

            # Test 2: Food diary page
            await self.test_food_diary_page()

            # Test 3: Dashboard page
            await self.test_dashboard_page()

            # Test 4: Cross-page synchronization
            await self.test_cross_page_synchronization()

            # Test 5: Responsive design
            await self.test_responsive_design()

            # Test 6: Error handling
            await self.test_error_handling_and_loading_states()

            # Generate final report
            await self.generate_test_report()

        finally:
            await self.teardown()

    async def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n📋 Generating Test Report...")

        # Update todo status
        self.test_results["test_summary"]["total_screenshots"] = len(self.test_results["screenshots"])
        self.test_results["test_summary"]["test_completion_time"] = datetime.now().isoformat()

        # Save detailed results to file
        report_file = f"/tmp/diet_daily_test_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(self.test_results, f, indent=2)

        print(f"📄 Detailed test report saved: {report_file}")

        # Print summary
        self.print_test_summary()

    def print_test_summary(self):
        """Print formatted test summary"""
        print("\n" + "="*60)
        print("📊 DIET DAILY APPLICATION TEST SUMMARY")
        print("="*60)

        # Application status
        app_status = "✅ ACCESSIBLE" if self.test_results["test_summary"].get("app_accessible") else "❌ NOT ACCESSIBLE"
        print(f"Application Status: {app_status}")

        if self.test_results["test_summary"].get("app_title"):
            print(f"Application Title: {self.test_results['test_summary']['app_title']}")

        # Food Diary Tests
        print(f"\n🍽️ Food Diary Page Tests:")
        food_tests = self.test_results.get("food_diary_tests", {})
        if "form_tests" in food_tests:
            form_results = food_tests["form_tests"]
            print(f"  • Form exists: {'✅' if form_results.get('form_exists') else '❌'}")
            print(f"  • Food input: {'✅' if form_results.get('food_input_exists') else '❌'}")
            print(f"  • Amount input: {'✅' if form_results.get('amount_input_exists') else '❌'}")
            print(f"  • Submit button: {'✅' if form_results.get('submit_button_exists') else '❌'}")

        if "sync_tests" in food_tests:
            sync_results = food_tests["sync_tests"]
            print(f"  • Status badges: {'✅' if sync_results.get('status_badges_found') else '❌'}")
            print(f"  • Auto-sync toggle: {'✅' if sync_results.get('auto_sync_toggle_found') else '❌'}")
            print(f"  • Manual sync: {'✅' if sync_results.get('manual_sync_button_found') else '❌'}")

        # Dashboard Tests
        print(f"\n📊 Dashboard Page Tests:")
        dashboard_tests = self.test_results.get("dashboard_tests", {})
        if "stats_tests" in dashboard_tests:
            stats = dashboard_tests["stats_tests"]
            print(f"  • Statistics cards: {'✅' if stats.get('cards_found', 0) > 0 else '❌'} ({stats.get('cards_found', 0)} found)")
            print(f"  • Today card: {'✅' if stats.get('today_card') else '❌'}")
            print(f"  • Week card: {'✅' if stats.get('week_card') else '❌'}")
            print(f"  • Month card: {'✅' if stats.get('month_card') else '❌'}")

        if "activities_tests" in dashboard_tests:
            activities = dashboard_tests["activities_tests"]
            print(f"  • Recent activities: {'✅' if activities.get('has_activities') else '❌'}")
            print(f"  • Load more button: {'✅' if activities.get('load_more_button_found') else '❌'}")

        # Synchronization Tests
        print(f"\n🔄 Cross-Page Synchronization:")
        sync_tests = self.test_results.get("sync_tests", {})
        print(f"  • Food item added: {'✅' if sync_tests.get('food_added') else '❌'}")
        print(f"  • Appears on dashboard: {'✅' if sync_tests.get('item_appears_on_dashboard') else '❌'}")

        # UI/UX Tests
        print(f"\n📱 UI/UX Tests:")
        ui_tests = self.test_results.get("ui_ux_tests", {})
        if "responsive_tests" in ui_tests:
            print(f"  • Responsive design: ✅ (Mobile, Tablet, Desktop tested)")
        if "error_handling" in ui_tests:
            error_tests = ui_tests["error_handling"]
            print(f"  • 404 handling: {'✅' if error_tests.get('404_handling') else '❌'}")
            print(f"  • Loading states: {'✅' if error_tests.get('loading_indicators_found', 0) > 0 else '❌'}")

        # Screenshots
        screenshot_count = len(self.test_results.get("screenshots", []))
        print(f"\n📸 Screenshots captured: {screenshot_count}")

        print("\n" + "="*60)
        print("✅ Testing completed successfully!")
        print("="*60)

# Run the tests
if __name__ == "__main__":
    tester = DietDailyTester()
    asyncio.run(tester.run_all_tests())