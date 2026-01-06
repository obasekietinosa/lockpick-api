from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_autosubmit(page: Page):
    # Go to landing page
    page.goto("http://localhost:5173")

    # Click Single Player
    page.get_by_role("button", name="Single Player").click()

    # Configuration Page
    expect(page.get_by_text("Game Config")).to_be_visible()

    # Fill Name (Required)
    page.get_by_placeholder("Enter your name").fill("TestPlayer")

    # Start Game
    page.get_by_role("button", name="Start Game").click()

    # Select Pin Page
    expect(page.get_by_text("Select Your Pins")).to_be_visible()
    # Randomize
    page.get_by_role("button", name="Randomize All").click()
    # Ready
    page.get_by_role("button", name="I'm Ready").click()

    # Game Page
    expect(page.get_by_text("Your Guesses")).to_be_visible()

    # Test 1: Auto-submit
    inputs = page.locator("input[type='text']")
    expect(inputs).to_have_count(5)

    # Type digits
    inputs.nth(0).type("1", delay=100)
    inputs.nth(1).type("2", delay=100)
    inputs.nth(2).type("3", delay=100)
    inputs.nth(3).type("4", delay=100)
    inputs.nth(4).type("5", delay=100) # Should trigger auto-submit

    time.sleep(2)
    page.screenshot(path="verification/autosubmit.png")

    # Test 2: Enter key submit (Editing)
    # Type 1-2-3-skip-5
    # Note: previous guess cleared input.
    inputs.nth(0).type("1", delay=100)
    inputs.nth(1).type("2", delay=100)
    inputs.nth(2).type("3", delay=100)

    # We want to edit.
    # Type '5' in last box.
    inputs.nth(4).type("5", delay=100)

    # Type '4' in 3rd box (index 3).
    inputs.nth(3).type("4", delay=100)

    # At this point, pin is 12345. But index was 3. No auto-submit.
    time.sleep(1)
    page.screenshot(path="verification/enter_submit_before.png")

    # Press Enter
    page.keyboard.press("Enter")

    time.sleep(2)
    page.screenshot(path="verification/enter_submit_after.png")


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_autosubmit(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
