#!/usr/bin/env python3
"""
Google Sheets同步功能測試腳本
"""

import asyncio
import sys
from playwright.async_api import async_playwright
import json

async def test_auth_page():
    """測試認證頁面"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=1000)
        context = await browser.new_context()
        page = await context.new_page()

        # 監聽控制台日誌
        console_logs = []
        page.on("console", lambda msg: console_logs.append({
            "type": msg.type,
            "text": msg.text,
            "timestamp": str(int(asyncio.get_event_loop().time() * 1000))
        }))

        # 監聽網絡請求
        requests = []
        page.on("request", lambda req: requests.append({
            "url": req.url,
            "method": req.method,
            "headers": dict(req.headers)
        }))

        try:
            print("=== 步驟 1: 訪問認證頁面 ===")
            await page.goto("http://localhost:3001/auth", wait_until='networkidle')

            # 等待頁面完全載入
            await page.wait_for_timeout(2000)

            # 截取認證頁面
            await page.screenshot(path="auth_page.png", full_page=True)
            print("✅ 認證頁面截圖已保存: auth_page.png")

            # 檢查頁面內容
            title = await page.title()
            print(f"頁面標題: {title}")

            # 查找Google登入按鈕
            google_button = await page.query_selector('button:has-text("Google"), a:has-text("Google"), [role="button"]:has-text("Google")')
            if google_button:
                print("✅ 找到Google登入按鈕")
                button_text = await google_button.text_content()
                print(f"按鈕文字: {button_text}")
            else:
                print("⚠️  未找到Google登入按鈕，檢查頁面元素...")
                # 列出所有按鈕元素
                buttons = await page.query_selector_all('button, a[role="button"], [role="button"]')
                print(f"找到 {len(buttons)} 個按鈕元素:")
                for i, btn in enumerate(buttons):
                    text = await btn.text_content()
                    print(f"  {i+1}. {text.strip()}")

            print("\n=== 控制台日誌 ===")
            for log in console_logs:
                print(f"[{log['type']}] {log['text']}")

            print("\n=== 網絡請求 ===")
            for req in requests[-5:]:  # 顯示最近5個請求
                print(f"{req['method']} {req['url']}")

            return page, browser, console_logs, requests

        except Exception as e:
            print(f"❌ 認證頁面測試失敗: {e}")
            await browser.close()
            return None, None, console_logs, requests

async def test_food_diary_page(page, browser):
    """測試food-diary頁面"""
    if not page or not browser:
        print("❌ 無法繼續測試，頁面未初始化")
        return None, []

    console_logs = []
    page.on("console", lambda msg: console_logs.append({
        "type": msg.type,
        "text": msg.text,
        "timestamp": str(int(asyncio.get_event_loop().time() * 1000))
    }))

    try:
        print("\n=== 步驟 2: 訪問food-diary頁面 ===")
        await page.goto("http://localhost:3001/food-diary", wait_until='networkidle')

        # 等待頁面載入
        await page.wait_for_timeout(3000)

        # 截取頁面
        await page.screenshot(path="food_diary_page.png", full_page=True)
        print("✅ food-diary頁面截圖已保存: food_diary_page.png")

        # 檢查頁面標題
        title = await page.title()
        print(f"頁面標題: {title}")

        # 檢查是否有錯誤信息
        error_elements = await page.query_selector_all('.error, [role="alert"], .alert-error')
        if error_elements:
            print("⚠️  發現錯誤信息:")
            for elem in error_elements:
                text = await elem.text_content()
                print(f"  - {text.strip()}")

        # 尋找添加食物的表單或按鈕
        add_food_elements = await page.query_selector_all('button:has-text("添加"), button:has-text("Add"), input[type="submit"], form')
        print(f"找到 {len(add_food_elements)} 個可能的添加食物元素")

        return page, console_logs

    except Exception as e:
        print(f"❌ food-diary頁面測試失敗: {e}")
        return page, console_logs

async def main():
    """主測試流程"""
    print("🚀 開始Google Sheets同步功能測試")

    # 測試認證頁面
    page, browser, auth_logs, auth_requests = await test_auth_page()

    if page and browser:
        # 測試food-diary頁面
        page, diary_logs = await test_food_diary_page(page, browser)

        print("\n=== food-diary頁面控制台日誌 ===")
        for log in diary_logs:
            print(f"[{log['type']}] {log['text']}")

        # 保持瀏覽器開啟以供手動測試
        print("\n⚠️  瀏覽器將保持開啟，請手動測試添加食物功能")
        print("觀察控制台日誌中的以下關鍵信息:")
        print("1. Medical data service initialization")
        print("2. Google Sheets API請求狀態")
        print("3. 工作表創建和同步日誌")
        print("\n按Enter鍵關閉瀏覽器...")
        input()

        await browser.close()

    print("🏁 測試完成")

if __name__ == "__main__":
    asyncio.run(main())