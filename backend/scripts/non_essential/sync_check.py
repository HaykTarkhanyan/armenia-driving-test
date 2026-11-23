#!/usr/bin/env python
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "playwright==1.65.2",
#     "python-dotenv==1.2.3",
# ]
# ///
"""End-to-end check of accounts and progress sync, in real (headless) Chrome with two separate "devices".

Run from the repo root, against a local build or the live site:
    (cd app && npx vite preview --port 4179 --strictPort --host localhost)     # in another terminal
    uv run backend/scripts/non_essential/sync_check.py
    uv run backend/scripts/non_essential/sync_check.py --base https://hayktarkhanyan.github.io/armenia-driving-test/

Expected runtime: ~40 s (measured on the first run is logged at the end).

Signs in as Claude's test account (ARMENIA_TEST_EMAIL / ARMENIA_TEST_PASSWORD in the gitignored .env.local) through the
password route, because Google's login cannot be automated. Everything after the sign-in is the same code path as for a
Google user. It deletes only this account's progress, before and after the run. No login value is printed or logged.

Stops at the first failed check with a non-zero exit code.
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import dotenv_values
from playwright.sync_api import Browser, Page, sync_playwright

REPO_ROOT = Path(__file__).resolve().parents[3]
GUEST_KEY = "armenia-driving-test.progress.v2.guest"
EDITION_QUERY = "/v1/state?edition=2026-11-06"
log = logging.getLogger("sync_check")


def setup_logging() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    (REPO_ROOT / "logs").mkdir(exist_ok=True)
    log.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%H:%M:%S")
    for handler in (logging.StreamHandler(sys.stdout), logging.FileHandler(REPO_ROOT / "logs" / "sync_check.log", encoding="utf-8")):
        handler.setFormatter(fmt)
        log.addHandler(handler)


def check(ok: bool, what: str, got: object = "") -> None:
    if not ok:
        log.error(f"FAILED: {what} (got {got!r})")
        raise SystemExit(1)
    log.info(f"ok: {what}")


USER_DOC = """() => {
  const k = Object.keys(localStorage).find((x) => x.includes('.user.'));
  if (!k) return null;
  const d = JSON.parse(localStorage.getItem(k));
  return { answers: d.answers.length, exams: d.exams.length, pending: d.pending.answers.length + d.pending.exams.length };
}"""


def doc(p: Page) -> dict | None:
    return p.evaluate(USER_DOC)


def wait_doc(p: Page, condition: str) -> None:
    p.wait_for_function(
        f"""() => {{
          const k = Object.keys(localStorage).find((x) => x.includes('.user.'));
          if (!k) return false;
          const raw = JSON.parse(localStorage.getItem(k));
          const d = {{ answers: raw.answers.length, exams: raw.exams.length, pending: raw.pending.answers.length + raw.pending.exams.length }};
          return {condition};
        }}""",
        timeout=30_000,
    )


def device(browser: Browser, base: str, errors: list[str]) -> Page:
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    p = ctx.new_page()
    p.on("dialog", lambda d: d.accept())
    p.on("pageerror", lambda e: errors.append(str(e)))
    p.goto(base, wait_until="load")
    p.wait_for_selector(".account-link", timeout=30_000)
    return p


def sign_in(p: Page, auth: str, email: str, password: str) -> int:
    status = p.evaluate(
        """async ({ auth, email, password }) => (await fetch(auth + '/sign-in/email', {
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }) })).status""",
        {"auth": auth, "email": email, "password": password},
    )
    p.reload(wait_until="load")
    p.wait_for_selector(".sync-dot.ok", timeout=40_000)
    return status


def go(p: Page, route: str) -> None:
    p.evaluate("(r) => { location.hash = r }", route)


def answer_some(p: Page, group: int, n: int) -> None:
    go(p, f"#/practice/{group}/all")
    p.wait_for_selector(".option")
    for _ in range(n):
        p.locator(".option").first.click()
        p.locator(".action-bar button").click()
        p.wait_for_timeout(60)


def save_now(p: Page) -> None:
    go(p, "#/progress")
    button = p.get_by_role("button", name="Պահել հիմա")
    button.wait_for(timeout=5_000)
    button.click()
    p.get_by_text("Ամբողջ առաջընթացը պահված է").wait_for(timeout=20_000)


def clear_server(p: Page) -> None:
    go(p, "#/progress")
    p.get_by_role("button", name="Զրոյացնել").click()
    wait_doc(p, "d.answers === 0 && d.exams === 0")


def status_of(url: str, headers: dict[str, str] | None = None) -> int:
    req = urllib.request.Request(url, headers={"User-Agent": "armenia-driving-test-sync-check", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:4179/armenia-driving-test/")
    args = ap.parse_args()
    setup_logging()
    t0 = time.time()
    env = dotenv_values(REPO_ROOT / ".env.local", encoding="utf-8")
    auth, api = env["NEON_AUTH_BASE_URL"].rstrip("/"), env["NEON_FUNCTION_API_BASE_URL"].rstrip("/")
    email, password = env["ARMENIA_TEST_EMAIL"], env["ARMENIA_TEST_PASSWORD"]

    check(status_of(f"{api}/v1/health") == 200, "API health")
    check(status_of(f"{api}{EDITION_QUERY}") == 401, "API refuses a request without a token")
    check(status_of(f"{api}{EDITION_QUERY}", {"Authorization": "Bearer abc.def.ghi"}) == 401, "API refuses a fake token")
    check(status_of(f"{api}{EDITION_QUERY}", {"Origin": "https://evil.example"}) == 403, "API refuses a foreign website")

    errors: list[str] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)

        # Start from an empty account.
        first = device(browser, args.base, errors)
        check(sign_in(first, auth, email, password) == 200, "test account signs in")
        clear_server(first)
        first.context.close()

        a = device(browser, args.base, errors)
        check(a.locator(".account-link").text_content() == "Մուտք", "a new visitor is a guest")
        check(a.get_by_role("button", name="Մուտք Google-ով").count() == 1, "guest sees the Google sign-in button")
        answer_some(a, 3, 3)
        saved = a.evaluate("(k) => JSON.parse(localStorage.getItem(k)).answers.length", GUEST_KEY)
        check(saved == 3, "guest answers are saved on the device", saved)

        check(sign_in(a, auth, email, password) == 200, "device A signs in")
        wait_doc(a, "d.answers === 3 && d.pending === 0")
        check(a.evaluate("(k) => localStorage.getItem(k) === null", GUEST_KEY), "guest progress moved into the account")

        b = device(browser, args.base, errors)
        check(sign_in(b, auth, email, password) == 200, "device B signs in")
        wait_doc(b, "d.answers === 3")
        check(True, "device B sees the 3 answers from device A")
        answer_some(b, 2, 2)
        save_now(b)
        wait_doc(b, "d.answers === 5 && d.pending === 0")

        a.reload(wait_until="load")
        a.wait_for_selector(".sync-dot.ok", timeout=30_000)
        wait_doc(a, "d.answers === 5")
        check(True, "device A sees the answers from device B")

        go(a, "#/exam")
        a.get_by_role("button", name="Սկսել քննությունը").click()
        for i in range(20):
            a.locator(".navigator button").nth(i).click()
            a.locator(".option").first.click()
        a.locator(".exam-bar button").click()
        a.wait_for_selector(".result .big")
        wait_doc(a, "d.exams === 1 && d.answers === 25 && d.pending === 0")
        check(True, "a finished exam is uploaded right away")

        b.reload(wait_until="load")
        b.wait_for_selector(".sync-dot.ok", timeout=30_000)
        wait_doc(b, "d.exams === 1 && d.answers === 25")
        check(True, "device B sees the exam")

        go(a, "#/progress")
        a.get_by_role("button", name="Դուրս գալ").click()
        a.wait_for_function("() => document.querySelector('.account-link')?.textContent === 'Մուտք'", timeout=20_000)
        check(doc(a) is None, "sign-out removes the account's copy from the device")
        a.reload(wait_until="load")
        a.wait_for_selector(".account-link")
        a.wait_for_timeout(1500)
        check(a.locator(".account-link").text_content() == "Մուտք", "still signed out after a reload")

        clear_server(b)
        b.reload(wait_until="load")
        b.wait_for_selector(".sync-dot.ok", timeout=30_000)
        b.wait_for_timeout(1500)
        got = doc(b)
        check(got == {"answers": 0, "exams": 0, "pending": 0}, "reset also clears the server", got)
        browser.close()

    check(errors == [], "no page errors", errors)
    log.info(f"all checks passed in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
