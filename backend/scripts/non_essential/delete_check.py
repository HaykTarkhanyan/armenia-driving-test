#!/usr/bin/env python
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "playwright==1.65.2",
#     "psycopg[binary]==3.3.6",
#     "python-dotenv==1.2.3",
# ]
# ///
"""End-to-end check of "Delete my account", on a TEMPORARY Neon branch. It refuses to run against the main branch.

    uv run backend/scripts/non_essential/delete_check.py --env <branch env file> --base http://localhost:4179/armenia-driving-test/

Expected runtime: ~30 s. The env file comes from `neon env pull --branch <test branch> --file <file>`; the app at --base
must be built with VITE_AUTH_URL and VITE_API_URL of that branch, and password sign-up must be open on that branch only.

It creates throwaway users, then proves: the owner's rows, login, Google/password link and sessions are gone; another
user's data is untouched; an old token can neither read nor write; the button in the app does the same. No login value
is printed or logged. Stops at the first failed check with a non-zero exit code.
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import logging
import secrets
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

import psycopg
from dotenv import dotenv_values
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parents[3]
MAIN_API_HOST = "br-green-bird-bh8yxv3r-api"
ORIGIN = "http://localhost:4179"
EDITION = "2026-11-06"
log = logging.getLogger("delete_check")


def check(ok: bool, what: str, got: object = "") -> None:
    if not ok:
        log.error(f"FAILED: {what} (got {got!r})")
        raise SystemExit(1)
    log.info(f"ok: {what}")


def call(opener, method: str, url: str, token: str | None = None, body: object = None) -> tuple[int, dict]:
    headers = {"Origin": ORIGIN, "User-Agent": "armenia-driving-test-delete-check"}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with opener.open(req, timeout=40) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {}


def new_user(auth: str, tag: str):
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    email = f"delete-check-{tag}-{secrets.token_hex(4)}@example.com"
    password = secrets.token_urlsafe(18)
    status, body = call(opener, "POST", f"{auth}/sign-up/email", body={"email": email, "password": password, "name": f"check {tag}"})
    check(status == 200, f"throwaway user {tag} created", status)
    status, token = call(opener, "GET", f"{auth}/token")
    check(status == 200 and "token" in token, f"user {tag} gets a token", status)
    return opener, body["user"]["id"], token["token"], email, password


def batch(n: int) -> dict:
    return {
        "edition": EDITION,
        "answers": [
            {"id": str(uuid.uuid4()), "qid": f"3-{i + 1}", "chosen": 0, "correct": True, "at": "2026-11-23T10:00:00.000Z", "mode": "practice"}
            for i in range(n)
        ],
        "exams": [
            {
                "id": str(uuid.uuid4()),
                "startedAt": 1,
                "finishedAt": 2,
                "questionIds": [f"3-{i + 1}" for i in range(20)],
                "orders": [[0, 1, 2]] * 20,
                "answers": [0] * 20,
                "score": 9,
                "passed": False,
                "timedOut": False,
            }
        ],
    }


def counts(db: psycopg.Connection, user_id: str) -> dict[str, int]:
    out = {}
    for name, sql in {
        "answers": "select count(*) from answers where user_id = %s",
        "exams": "select count(*) from exams where user_id = %s",
        "user": 'select count(*) from neon_auth."user" where id = %s::uuid',
        "account": 'select count(*) from neon_auth.account where "userId" = %s::uuid',
        "session": 'select count(*) from neon_auth.session where "userId" = %s::uuid',
        "user_state": "select count(*) from user_state where user_id = %s",
        "api_usage": "select count(*) from api_usage where user_id = %s",
    }.items():
        out[name] = db.execute(sql, (user_id,)).fetchone()[0]
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", required=True)
    ap.add_argument("--base", default=f"{ORIGIN}/armenia-driving-test/")
    args = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
    t0 = time.time()
    env = dotenv_values(args.env, encoding="utf-8")
    auth, api = env["NEON_AUTH_BASE_URL"].rstrip("/"), env["NEON_FUNCTION_API_BASE_URL"].rstrip("/")
    if MAIN_API_HOST in api:
        raise SystemExit("Refusing to run: this env file points at the main branch.")
    plain = urllib.request.build_opener()

    with psycopg.connect(env["DATABASE_URL_UNPOOLED"], autocommit=True, connect_timeout=30) as db:
        a_open, a_id, a_token, _, _ = new_user(auth, "a")
        _, b_id, b_token, _, _ = new_user(auth, "b")
        check(call(plain, "POST", f"{api}/v1/sync", a_token, batch(5))[0] == 200, "user A saves progress")
        check(call(plain, "POST", f"{api}/v1/sync", b_token, batch(7))[0] == 200, "user B saves progress")
        before_b = counts(db, b_id)

        check(call(plain, "DELETE", f"{api}/v1/account")[0] == 401, "delete without a token is refused")
        check(call(plain, "DELETE", f"{api}/v1/account", "abc.def.ghi")[0] == 401, "delete with a fake token is refused")
        status, body = call(plain, "DELETE", f"{api}/v1/account", a_token)
        check(status == 200 and body.get("answersDeleted") == 5 and body.get("examsDeleted") == 1, "user A deletes the account", (status, body))
        got = counts(db, a_id)
        check(all(v == 0 for v in got.values()), "nothing of A is left: answers, exams, user, login link, sessions", got)
        check(counts(db, b_id) == before_b, "user B is untouched", counts(db, b_id))

        status, body = call(plain, "POST", f"{api}/v1/sync", a_token, batch(3))
        check(status == 410 and body["error"]["code"] == "account_deleted", "A's old token cannot write", (status, body))
        check(counts(db, a_id)["answers"] == 0, "no rows came back")
        check(call(plain, "GET", f"{api}/v1/state?edition={EDITION}", a_token)[0] == 410, "A's old token cannot read")
        check(call(plain, "DELETE", f"{api}/v1/account", a_token)[0] == 410, "a second delete changes nothing")
        status, session = call(a_open, "GET", f"{auth}/get-session")
        check(status == 200 and not (session or {}).get("user"), "A's sign-in session is dead", (status, session))
        check(call(plain, "GET", f"{api}/v1/state?edition={EDITION}", b_token)[0] == 200, "B can still read")

        # Reset lasts: a device that missed it cannot upload its old rows back.
        _, d_id, d_token, d_email, _ = new_user(auth, "d")
        check(call(plain, "POST", f"{api}/v1/sync", d_token, batch(3))[0] == 200, "user D saves progress")
        status, body = call(plain, "DELETE", f"{api}/v1/progress", d_token)
        check(status == 200 and body.get("generation") == 1, "reset starts generation 1", (status, body))
        status, body = call(plain, "POST", f"{api}/v1/sync", d_token, {**batch(2), "generation": 0})
        check(status == 409 and body["error"]["code"] == "progress_reset", "a device that missed the reset cannot upload", (status, body))
        check(counts(db, d_id)["answers"] == 0, "nothing came back after the reset")
        check(call(plain, "POST", f"{api}/v1/sync", d_token, {**batch(2), "generation": 1})[0] == 200, "a device that knows the reset can upload")
        status, state = call(plain, "GET", f"{api}/v1/state?edition={EDITION}", d_token)
        check(status == 200 and state["generation"] == 1 and state["resetAt"] and len(state["answers"]) == 2, "state reports the reset", status)

        # Rows of an earlier edition stay on the server and are handed over for translation.
        db.execute("insert into answers (user_id, edition, id, qid, chosen, correct, at, mode) values (%s, '2026-10-02', %s, '4-81', 0, true, now(), 'practice')", (d_id, str(uuid.uuid4())))
        status, state = call(plain, "GET", f"{api}/v1/state?edition={EDITION}", d_token)
        check(len(state["answers"]) == 2 and [a["edition"] for a in state["older"]["answers"]] == ["2026-10-02"], "older editions come back tagged", state["older"])

        # The data export holds everything except login secrets.
        status, data = call(plain, "GET", f"{api}/v1/export", d_token)
        text = json.dumps(data)
        check(status == 200 and data["profile"]["email"] == d_email and len(data["answers"]) == 3 and len(data["sessions"]) >= 1, "export has the profile, answers and sessions", status)
        secrets_stored = [r[0] for r in db.execute('select "token" from neon_auth.session where "userId" = %s::uuid', (d_id,))] + [r[0] for r in db.execute('select "password" from neon_auth.account where "userId" = %s::uuid', (d_id,)) if r[0]]
        check(len(secrets_stored) >= 2 and not any(s in text for s in secrets_stored), "export contains no session token or password hash")
        for word in ('"token"', '"password"', "accessToken", "refreshToken", "idToken"):
            check(word not in text, f"export has no field {word}")

        # Daily limits stop reading and writing, never the user's rights.
        day = time.strftime("%Y-%m-%d", time.gmtime())
        db.execute("update api_usage set requests = 1500 where user_id = %s and day = %s::date", (d_id, day))
        status, body = call(plain, "GET", f"{api}/v1/state?edition={EDITION}", d_token)
        check(status == 429 and body["error"]["code"] == "rate_limited", "over the daily limit: refused", (status, body))
        check(call(plain, "POST", f"{api}/v1/sync", d_token, {**batch(1), "generation": 1})[0] == 429, "over the limit: uploads wait too")
        check(call(plain, "GET", f"{api}/v1/export", d_token)[0] == 200, "export still works over the limit")
        check(call(plain, "DELETE", f"{api}/v1/progress", d_token)[0] == 200, "reset still works over the limit")
        check(call(plain, "DELETE", f"{api}/v1/account", d_token)[0] == 200, "delete still works over the limit")
        got = counts(db, d_id)
        check(all(v == 0 for v in got.values()), "delete also removes the reset marker and usage counters", got)

        # The real button, in real Chrome.
        _, _, _, c_email, c_password = new_user(auth, "c")
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel="chrome", headless=True)
            ctx = browser.new_context(viewport={"width": 390, "height": 844})
            page = ctx.new_page()
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            seen: list[str] = []
            page.on("request", lambda r: seen.append(r.url))
            page.goto(args.base, wait_until="load")
            page.wait_for_selector(".account-link", timeout=30_000)
            page.wait_for_timeout(800)
            check(not any("neonauth" in u or api in u for u in seen), "a guest makes no request to the sign-in service or API", [u for u in seen if "neon" in u][:2])
            page.evaluate(
                """async ({ auth, email, password }) => (await fetch(auth + '/sign-in/email', {
                    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }) })).status""",
                {"auth": auth, "email": c_email, "password": c_password},
            )
            page.evaluate("() => localStorage.setItem('armenia-driving-test.signing-in', '1')")
            page.reload(wait_until="load")
            page.wait_for_selector(".sync-dot.ok", timeout=40_000)
            page.evaluate("() => { location.hash = '#/practice/3/all' }")
            page.wait_for_selector(".option")
            page.locator(".option").first.click()
            page.evaluate("() => { location.hash = '#/settings' }")
            page.get_by_role("button", name="Պահել հիմա").click()
            page.get_by_text("Ամբողջ առաջընթացը պահված է").wait_for(timeout=20_000)
            c_id = page.evaluate("() => Object.keys(localStorage).find((k) => k.includes('.user.')).split('.user.')[1]")
            check(counts(db, c_id)["answers"] == 1, "user C's answer reached the server")

            # An expired sign-in keeps the progress on screen and asks to sign in again.
            cookies = ctx.cookies()
            ctx.clear_cookies()
            page.reload(wait_until="load")
            page.get_by_text("Մուտքի ժամկետը լրացել է").first.wait_for(timeout=25_000)
            check(page.evaluate("() => { const k = Object.keys(localStorage).find((x) => x.includes('.user.')); return JSON.parse(localStorage.getItem(k)).answers.length }") == 1, "an expired sign-in keeps the answers")
            ctx.add_cookies(cookies)
            page.reload(wait_until="load")
            page.wait_for_selector(".sync-dot.ok", timeout=40_000)
            check(True, "signing back in restores the account")

            page.get_by_role("button", name="Ջնջել հաշիվը").click()
            check(page.get_by_role("button", name="Այո, ջնջել հաշիվը").count() == 1, "the button asks for a second step")
            check(counts(db, c_id)["user"] == 1, "nothing is deleted before the second step")
            page.get_by_role("button", name="Չեղարկել").click()
            check(counts(db, c_id)["user"] == 1, "cancel keeps the account")
            page.get_by_role("button", name="Ջնջել հաշիվը").click()
            page.get_by_role("button", name="Այո, ջնջել հաշիվը").click()
            page.get_by_text("Հաշիվդ և ամբողջ առաջընթացդ ջնջվեցին").wait_for(timeout=25_000)
            got = counts(db, c_id)
            check(all(v == 0 for v in got.values()), "the app's button removes everything on the server", got)
            check(page.evaluate("() => !Object.keys(localStorage).some((k) => k.includes('.user.'))"), "the account's copy is gone from the device")
            check(page.locator(".account-link").text_content() == "Մուտք", "the app is back to guest")
            page.reload(wait_until="load")
            page.wait_for_selector(".account-link", timeout=30_000)
            page.wait_for_timeout(1500)
            check(page.locator(".account-link").text_content() == "Մուտք", "still signed out after a reload")
            page.evaluate("() => { location.hash = '#/privacy' }")
            page.wait_for_selector(".privacy h1")
            check(page.locator(".privacy h2").count() == 8, "the privacy page opens", page.locator(".privacy h2").count())
            check(errors == [], "no page errors", errors)
            browser.close()

        # Last, because it blocks syncing on this branch for the rest of the day.
        day = time.strftime("%Y-%m-%d", time.gmtime())
        db.execute("update api_usage_total set windows = 72, last_window = -1 where day = %s::date", (day,))
        status, body = call(plain, "GET", f"{api}/v1/state?edition={EDITION}", b_token)
        check(status == 429 and body["error"]["code"] == "rate_limited", "the global daily limit stops everyone", (status, body))
        check(call(plain, "DELETE", f"{api}/v1/account", b_token)[0] == 200, "delete still works at the global limit")
    log.info(f"all checks passed in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
