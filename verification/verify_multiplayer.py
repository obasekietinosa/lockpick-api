from playwright.sync_api import Page, expect, sync_playwright
import time
import json
import datetime

def test_multiplayer_sync(page: Page):
    # Mock API responses

    # 1. Join Game
    page.route("**/games/join", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({
            "room_id": "room-123",
            "player_id": "p1",
            "status": "joined",
            "config": {
                "player_name": "TestPlayer",
                "hints_enabled": True,
                "pin_length": 5,
                "timer_duration": 60
            }
        })
    ))

    # 2. Submit Pin
    page.route("**/games/room-123/players/p1/pin", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({"status": "pins_selected"})
    ))

    # 3. Get Game (Polling in SelectPinPage AND Sync in GamePage)
    # We return status="playing" so SelectPinPage advances.
    # We return current_round=2 so GamePage syncs to Round 2.

    # Helper to generate recent ISO time
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    page.route("**/games/room-123", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({
            "id": "room-123",
            "status": "playing",
            "current_round": 2,
            "scores": {"p1": 1},
            "config": {
                "player_name": "TestPlayer",
                "hints_enabled": True,
                "pin_length": 5,
                "timer_duration": 60
            },
            "round_start_time": now_iso
        })
    ))

    # Go to Join Page
    print("Navigating to Join Page...")
    page.goto("http://localhost:5173/join?room=room-123")

    # Fill Name and Join
    print("Filling Join Form...")
    # Using specific locators based on common patterns
    page.get_by_placeholder("Enter your name").fill("TestPlayer")
    page.get_by_role("button", name="Join Game").click()

    # Should be on SelectPinPage
    print("Waiting for SelectPinPage...")
    expect(page.get_by_text("Select Your Pins")).to_be_visible()

    # Fill Pins (Randomize)
    print("Randomizing Pins...")
    page.get_by_text("Randomize All").click()

    # Ready Up
    print("Clicking I'm Ready...")
    page.get_by_text("I'm Ready").click()

    # Now it waits. Polling should pick up "playing" status.
    print("Waiting for GamePage navigation...")

    # We expect to land on GamePage
    # And specifically, we expect Round 2 because of our mock!
    # The text "2 / 3" should be visible in the scoreboard
    expect(page.get_by_text("2 / 3")).to_be_visible(timeout=10000)

    print("Verified Round 2 displayed!")

    # Take screenshot
    page.screenshot(path="verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_multiplayer_sync(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/error.png")
            raise
        finally:
            browser.close()
