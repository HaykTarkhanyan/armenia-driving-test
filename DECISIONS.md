# Decisions

Newest first.

## 23. Six doubtful questions stay in the pool with a visible "not verified" note

- **Date / status:** 2026-11-24, active. Hayk: "include that they are not tested in the app itself and park this for future".
- **Why:** In 1-48, 5-9, 6-8, 6-9, 7-107 and 7-119 the picture or the official answer looks wrong, and nobody has settled it. After answering, the app now says the question is not verified yet and to mark the official answer on the exam. They stay in practice and mock exams, because the real exam can ask them. Grading still follows the official key.
- **Alternatives rejected:** removing them from the pool (the real exam can still ask them, and the pass estimate would no longer match the official draw); guessing a corrected answer or redrawing the pictures.
- **What would change this:** Hayk checks the pictures, or a new official edition corrects them. If he meant they should leave the practice and mock exams, that is a separate change.

## 22. Picture explanations start from the scene, assuming the official answer is right

- **Date / status:** 2026-11-24, active. Corrects the count in #20. Hayk found that 4-168 and 7-39 blamed the official answer while the picture explains it: in 4-168 path B goes against oncoming traffic, and in 7-39 the red car blocks an arch entrance.
- **Why:** The writers and the first two reviewers compared explanations with the rule text, so a rule that did not name the situation looked like a conflict. Two new agents opened all 715 pictures one by one and worked out why the official answer makes sense before reading the explanation. With my recheck, 15 explanations changed. Examples: 7-75 has the broken side of the line toward the motorcycle, 1-6 has a temporary sign that overrides a permanent one (point 172), and 1-82 is one-way up to the junction.
- **Measured:** the two agents used 1,130,720 tokens. Statements that the official answer differs from the law or medical guidance fell from 30 to 21: 16 first aid and 5 traffic (3-42, 3-57, 7-6, 7-43, 7-107).
- **Alternatives rejected:** fixing only the two reported questions (the method was at fault, and 13 more were found); trusting the earlier review; telling learners the key is wrong whenever no rule names the case.
- **Not checked:** 10 of the 715 (5-86 to 5-95) were not judged blind. Six questions need Hayk's eye because the picture or key looks wrong: 1-48, 5-9, 6-8, 6-9, 7-107, 7-119.
- **What would change this:** Hayk's answers on those six, or further examples of a reason we missed.

## 21. The first-aid guide separates the exam answer from real-life advice

- **Date / status:** 2026-11-23, active. Hayk chose this after a heads-up note that the guide still taught risky exam answers as plain facts.
- **Why:** Someone may remember this page in a real emergency. A note at the top of group 10 says these are exam answers, and gives the safer advice for seizures (CDC), tourniquets (WHO) and medicine (IFRC). The power-line rule already had its warning (Q15). Exam answers and grading do not change.
- **Alternatives rejected:** one general line only (it would not say what to do instead); leaving the guide as it was; changing the answers (learners would fail the real exam).
- **What would change this:** a corrected official key, or medical review of the first-aid text. No medical professional has read it.

## 20. All 1,050 explanations are live, address the reader in the plural, and were checked by two independent reviewers

- **Date / status:** 2026-11-23, active. Extends #19. After the pilot Hayk approved 10 writers and 2 reviewers, and asked to apply the Armenian guidelines to the app's existing text.
- **Why:** Ten writers produced the other 1,020 explanations. A script checked each one: the cited point exists, numbers appear in the question or the cited text, Armenian lint, no option named by position. Two reviewers then read all 1,050 against the law and the pictures: 13 findings, 12 corrected. The `armenian-writing` skill requires plural reader address, and the official questions use «Դուք», so the interface, guides and explanations moved from «դու» to «դուք». The data file is 422 kB (65 kB gzipped) and loads after the first answer.
- **Measured:** writers 3,058,799 tokens, reviewers 1,261,937, together 4,320,736 (the main session is not included).
- **Found:** in 30 questions the explanation says the official answer differs from the law or current medical guidance, or that no source supports it; 16 of them are first aid. The app still grades by the official key, because the exam does. The record is `results/explanations_flags_2026-11-23.json`, the page for reading it `reports/explanations_review.html`.
- **Alternatives rejected:** changing answers to match the law (learners would fail the real exam); hiding the conflicts (10-28 would teach moving a fallen power line); keeping «դու» (against the guide); reviewing only a sample (the first pass of a checker had already missed 7 lint errors).
- **Not checked:** no native speaker has read the full set. Many pictures were reviewed on contact sheets, enlarging only doubtful ones. Mayo Clinic and Red Cross returned 403, so 10-1, 10-14 and 10-18 rest on search excerpts. In 1-48 a lit red traffic light may face the driver, and the explanation follows the official answer.
- **What would change this:** corrections from Hayk or from learners, a new edition (a test blocks the deploy until the explanations are mapped), or a corrected official key.

## 19. Explanations are written from the law, not copied, and start with a 30-question pilot

- **Date / status:** 2026-11-23, active. Hayk asked for explanations ("search the web, if none create them"), chose a pilot of 30 first and the current 1,050 questions only.
- **Why:** Other Armenian sites have explanations, but drv.am and varordakan.am forbid copying their content (drv.am also forbids automated access), so none are reused. Each explanation is written from Government Decision 955-Ն (rules, annex 1; faults, annex 2) and law ՀՕ-166-Ն, both marked in force on ARLIS on 2026-11-23, and cites the point. First aid is not in those acts and cites CDC and Mayo Clinic. Where the official key contradicts the law, the explanation says so and the exam answer stays the key's. The Armenian follows `sample_problems_qysu/armenian_style` (GUIDE.md, OWNER_ANSWERS.md); its lint reports 0 errors on the pilot. Explanations load as a separate file after the first answer (12 kB for 30, so about 430 kB for all) and never appear during a mock exam.
- **Measured:** the pilot took 86,075 output and 377,785 new input tokens, including the one-time setup. Doing the other 1,020 the same way would take roughly 4-6 million new tokens, more than the 2-3 million guessed before the pilot.
- **Alternatives rejected:** copying from those sites (their terms forbid it, and their accuracy is unchecked); putting the text in the main bundle (slower first load for everyone); writing all 1,050 before Hayk had seen the style (one bad habit would repeat 1,050 times).
- **Not checked:** no native speaker has read the pilot yet. In 1-54 a dark object at the top edge of the picture may be a traffic light; the explanation assumes no working signal.
- **What would change this:** Hayk's review of the pilot, or a source that explicitly allows reuse.

## 18. Fixes from the independent review: progress survives resets, new editions and expired sign-ins

- **Date / status:** 2026-11-23, active. Supersedes the part of #12 that refused progress from another edition. An independent Opus review found 15 problems; Hayk said to fix all.
- **Why:** (F1) a request is sent only if its token belongs to the account on screen, because the sign-in cookie is shared between tabs. (F2) `user_state.generation` counts resets; a device behind on resets drops its older rows and may not upload them. (F3) the edition now changes only when the questions do (`data/edition.json`, fingerprint checked by a test that blocks the deploy), and `migrations` translates old question numbers on the device, so server rows never need rewriting. (F4) a row the server refuses is narrowed down by halves and skipped until the next start, so it blocks nothing. (F5) per-account and global daily limits on 5-minute active windows, because compute is billed by time awake: 72 windows cost at most about 93 of the 100 free CU-hours; writes stop at a 400 MB database. (F6) an expired sign-in keeps the progress on screen and asks to sign in. (F10) someone who never signed in makes no request to the sign-in service. (F14) answer markers are neutral circles, because letters clashed with labels like "Միայն A". F7, F8, F9 and two counts in the guides were corrected against the official key.
- **Checked:** regression tests for each account bug against a fake server, then the real API and app on a temporary Neon branch before the live migration.
- **Alternatives rejected:** comparing reset times alone (a device's clock can be wrong, so a generation number decides and the time only separates rows on a stale device); rewriting server rows at each new edition (a risky migration that must be timed with the app deploy); a permanent quarantine list for refused rows (a bug in the app would then lose them for good); rate limiting in memory only (lost whenever the function restarts).
- **Known limits:** a blocked client on a fresh function instance still wakes the database once to read its counter, and requests sent directly to Neon Auth are outside these limits. When the global limit is hit, syncing pauses for everyone until the next UTC day, while progress keeps saving on devices.
- **Open, Hayk's decisions:** a private contact in the privacy notice, and whether inactive accounts should be deleted after some period.
- **What would change this:** real traffic reaching the global limit (then raise it or move off the Free plan), or a need to keep the study timer of a device across editions.

## 17. A privacy page and "Delete my account": login and progress are removed in one transaction

- **Date / status:** 2026-11-23, active. Hayk asked for it after the note that public Google sign-in stored personal data with no notice and no way to delete it.
- **Why:** The notice lists what the database actually holds, read from the `neon_auth` structure on 2026-11-23: name, email, picture link, Google account id, Google access and id tokens, and sessions with IP address and device details, plus answers and exams. It is also linked right at the Google button. `DELETE /v1/account` removes answers, exams and the auth user in one transaction; foreign keys with ON DELETE CASCADE remove the Google link, tokens and sessions. A signed token stays valid for up to 15 minutes, so every data route checks that the account still exists (410 `account_deleted`), or another device could write rows back. Deleted data can remain in Neon's restore history for up to 6 hours (`history_retention_seconds` = 21600), and the notice says so.
- **Checked:** `delete_check.py` on a temporary Neon branch, 30 checks: everything of the user is gone, another user is untouched, an old token can neither read nor write, and the button in the app works with its second step and cancel. The script refuses to run against the main branch.
- **Alternatives rejected:** Better Auth's `/delete-user` (a separate call from the progress delete, so a failure could leave half an account); the Neon management API (would put an admin key in the function); deleting progress only (the personal data would stay).
- **Open:** the notice names the GitHub account and its issue page as the contact, because no email or legal name may go into a public repo without Hayk's OK. GDPR expects an identifiable, reachable controller, so this needs his decision. The notice has not been reviewed by a lawyer.
- **What would change this:** a real contact from Hayk; his own Google OAuth client (then the sentence about Neon's sign-in screen goes); a new processor or new stored field (the notice must change with it).

## 16. A stats page, an explicit bright/dark theme, and "today's practice" as the main action

- **Date / status:** 2026-11-23, active. Hayk asked for a stats page with streak and progress, more UX improvements, and a bright theme, because the app only followed the phone's dark setting.
- **Why:** The theme is a choice now (bright, dark, or follow the device), one tap in the header, applied before the first paint so a saved theme never flashes the other one. The Առաջընթաց tab shows the streak, four totals, the expected score over 30 days against 18, answers per day, an activity calendar, progress by topic, the most-missed questions and mock exams. A day counts for the streak with at least one answer, and a streak survives until the end of the next day. Charts are plain HTML/SVG; their colours passed the dataviz palette validator in both themes (light `#2f62d6` / `#d97a00`, dark `#5a8aee` / `#d27c05`), and blue/orange stays readable for red-green colour blindness.
- **UX additions, chosen as the largest gaps:** a one-tap "today's practice" (mistakes, half-learned, then new questions in exam-value order) with a daily goal; question search; a per-part breakdown on the exam result; an install button using Chrome's prompt; a larger text size; a separate settings page.
- **Alternatives rejected:** a chart library (Plotly is over 3 MB on a phone for six small charts); syncing preferences (they are per device, and it would need a backend change); a spaced-repetition scheduler (the mix is simpler and the "known" rule already exists); bookmarks for now (needs a new synced table).
- **What would change this:** Hayk wanting the goal or theme to follow the account, or review intervals instead of the simple mix.

## 15. Shortcuts live in the app: an Armenian guide per group, a hint after each answer, and a road-sign interface

- **Date / status:** 2026-11-23, active. Hayk asked for a shortcut text per group, the shortcuts in the app, UI/UX improvements, and a fix for "15 questions from 7 groups", which read as if the exam had far more than 20 questions.
- **Why:** Topics now open with the 20 squares of the exam and group the topics under its four parts; a traffic-rule topic shows its average share (3, 3, 2, 2, 2, 1, 2, which add up to 15). Each topic page holds its guide (`app/src/content/guides.ts`). `scripts/build_hints.py` reuses the rule functions of `mine_patterns.py`, so a hint after an answer counts the same thing as PATTERNS.md (254 of 1,050 questions get one, and it says so when the question is an exception). Hints never show during a mock exam. Sign shapes carry meaning: round blue = rule, warning triangle = tendency, red circle = never pick, yellow diamond = exception. Noto Sans Armenian (`@fontsource-variable/noto-sans-armenian` 5.3.0, self-hosted, about 47 KB for Armenian) replaces whatever font each phone happened to have.
- **Checked:** all 254 cited question numbers exist in the November edition; 162 stated facts were compared by script with the official answer; no sideways overflow at 320, 360, 390 and 1280 px on 10 pages.
- **Alternatives rejected:** keeping the count on every topic row ("15 from 7 groups", the confusion itself); showing hints before answering (practice results would mean nothing); a separate shortcuts-only section with no link to practice (the guide is most useful next to the questions); showing the 4 weakest tells as per-question hints.
- **What would change this:** Hayk's reading of the Armenian text; a new edition (cited numbers must be mapped with `diff_editions.py`, and `build_hints.py` re-run).

## 14. Progress is saved to accounts: Google sign-in, Neon in its own project, and the app keeps working without an account

- **Date / status:** 2026-11-23, active. Hayk asked for progress saving "like in nemeceren", then chose Google sign-in (Q3), device saving for people without an account (Q4) and a new Neon project (Q5). Existing local progress is dropped, because "there aren't really any" users.
- **Why:** Same stack as nemeceren (Neon Auth, a Hono function, Postgres), so nothing new to learn or pay for. A separate project means public sign-ups cannot touch nemeceren's learners or its monthly free limit. The app stays local-first: every answer is saved in the browser, then uploaded in idempotent batches, so a lost connection loses nothing. On first sign-in, guest progress moves into the account. Unlike nemeceren there is no allowlist, because anyone may join; the gates are Google sign-in, closed password sign-up, and a limit of 30,000 answers and 300 exams per account.
- **Checked:** `sync_check.py` in real Chrome with two separate devices: 19 checks passed. The Google redirect itself cannot be automated, so only a real sign-in on a phone proves it.
- **Alternatives rejected:** sign-in required (Hayk chose device saving); sharing nemeceren's project (shared limits and user list); storing one JSON document per user (each sync would re-upload everything); a closed list of accounts (every new user would need Hayk).
- **Known limits:** it uses Neon's shared Google credentials for now, so Google's screen names Neon, and Neon calls those development-only. A new edition of the questions still needs an id migration (#12).
- **What would change this:** Hayk adding his own Google OAuth client; Free-plan compute running out; browsers blocking the partitioned sign-in cookie.

## 13. The app is installable on Android: a manifest, our own icon, and a service worker that caches nothing

- **Date / status:** 2026-11-23, active. Hayk asked for it to install from Chrome "like nemeceren"; this is nemeceren's setup (its DECISIONS.md #89).
- **Why:** Chrome offers the install only with a web app manifest, icons of 192 and 512 px, and HTTPS. The service worker passes everything to the network, so a new deploy (for example a new edition of the questions) is always what loads, and it shows a short Armenian page when there is no internet.
- **Alternatives rejected:** vite-plugin-pwa / Workbox precaching (a new dependency, and a cached old version could keep teaching an outdated answer key after a deploy); full offline use (the pictures are 60 MB, too much to store on a phone unasked).
- **What would change this:** Hayk wanting to study without internet, then cache pictures per group on request.

## 12. Study app: same stack as the German app, official groups as topics, saved progress tied to the edition

- **Date / status:** 2026-11-23, active. Hayk asked to start the app; stack, Armenian only, shuffled options and the separate old set were decided on 2026-10-21. Using the 10 official groups as topics is my default for the open question.
- **Why:** React 19 + Vite + zod on GitHub Pages is already proven in the German app. Options are shuffled because the real exam shuffles them, except the 33 questions whose options are only picture labels ("1, 2, 3"). Topics follow the groups because the exam draws by them and they need no hand-made mapping of 1,050 questions. Saved progress carries the pool's edition because the site renumbered 181 questions on 2026-11-06: an old "4-81" is another question today, so a document from another edition is refused rather than silently applied to the wrong questions. The pass chance is exact (per-section subset table), and a test checks it against `results/patterns.json`.
- **Alternatives rejected:** finer sub-topics (needs a curated mapping; can come later without changing stored answers); ids based on question content (the wording itself gets corrected, as in 2-77); keeping progress across editions without a mapping (wrong questions marked as known).
- **What would change this:** Hayk prefers finer topics; or a new edition arrives while someone is studying, then add an id migration from `results/edition_diff_<date>.json` before deploying it.

## 11. The November 2026 edition replaces the October one; editions are compared by content

- **Date / status:** 2026-11-23, active
- **Why:** roadpolice.am regenerated all PDFs on 2026-11-06 with a new generator, so the parser's colors and font sizes were updated (all its checks still pass; Armenian and English agree on all 1,050). Every picture was re-encoded, so byte comparison is useless; `scripts/non_essential/diff_editions.py` compares wording, options and perceptual picture hash. Result: 0 added, 0 removed, 1 answer changed (6-84), 1 option corrected (2-77), 4 questions moved to another group, 181 renumbered inside their group. The shortcut numbers moved by at most 1 question.
- **Alternatives rejected:** keeping the October data (6-84 would teach the old key); treating the new numbers as new questions (they are the same 1,050).
- **What would change this:** Evidence that the exam computer still uses the October key for 6-84.

## 10. The "learn only where a fixed pick fails" strategy uses a text-based pick, which survives shuffled options

- **Date / status:** 2026-10-22, active; corrects #9, which treated the strategy as position-only (a "you should know" note pointed it out; Hayk: "sure", calculate it)
- **Why:** A fixed pick based on the option's text (the longest in characters, ties broken alphabetically by normalized text) gives the same answer under any shuffle, so you can learn exactly the questions where it fails. Measured: alone 609 answers for a 95% pass; after the held-out content rules and the never-pick list 518 (guess-the-rest: 714; guessing: 952). The pick itself is barely better than chance (right on 392 of 1,050; random averages 379): the saving comes from predictability. PATTERNS.md states the catch: on the exam you must recognize which questions are safe to answer by length, which still means knowing something about every question.
- **Alternatives rejected:** leaving 714 as the floor (wrong: the trick was only ruled out for positions); a fallback by option order on screen (changes with each shuffle); choosing the fallback by searching many text picks on the data (overfits; "longest" is the one with a measured, if weak, signal).
- **What would change this:** Evidence that exam takers cannot use the exceptions list reliably (then report 714 as the practical number), or a better text-based pick that holds up out of sample.

## 9. The exam shuffles the options: only content rules count; "longest" is measured in characters

- **Date / status:** 2026-10-22, active, revisited 2026-10-22 (#10: a text-based fixed pick survives shuffling) (Hayk: "pdf order is random"; "clarify ... what longest means based on characters or words")
- **Why:** On the real computer test the options appear in random order, so position rules ("3 options: the last") and the "learn the exceptions of a fixed position" strategies (533 and 598 answers for 95%) do not apply. The applicable result is the content-rule row: 714 answers for 95% (guessing 952). Position rules stay in the analysis as a description of how the questions were written. "Longest" stays character count (Python `len`, spaces and punctuation included): by words it is about as accurate but decides fewer questions because word counts tie (first aid 31/50 by characters vs 26/36 by words; law definitions 23/28 vs 18/25).
- **Alternatives rejected:** removing the order-kept strategies from the code (they show how large the fixed-position effect is; kept, labelled "does not apply"); switching "longest" to words (fewer questions decided, no accuracy gain).
- **What would change this:** A test mode that keeps the PDF order (e.g. a different exam program).

## 8. Rules found by reading every question join the rule list; tested on the questions removed in 2026

- **Date / status:** 2026-10-21, active (Hayk: "look into the questions group by group ... find cool stuff"; 2 reading subagents, one per half of the groups)
- **Why:** Option-level statistics had missed Hayk's group-3 rule (24/24 once scored per condition), so every group was read question by question. Findings were re-counted with independent code before use. The statistical ones joined `scripts/mine_patterns.py`: first aid longest (31/50, chance 15.8), law definitions longest (23/28, 13.2), bare "Պարտավոր է" (23/29, 13.6), group 8 middle number (7/7), pedestrians + someone (10/10), tram yes (7/7), backing no (8/10), and a never-pick list (55 options, 0 right) used when guessing. "Both/all" is restricted to text questions: 54/97 there, 5/15 with a picture. Because these rules were found on the whole pool, CV cannot remove that selection; so they are also scored on the 118 old questions removed in 2026, which nobody read: both/all 13/22 (7.2), "Արգելվում" 13/20 (8.0), 3-options-last 34/72 (24.0) hold; echo 7/19 (7.9) does not. Result: content rules + never-pick need 714 answers for 95% pass (guessing: 952). Facts (speed table, ages, first-aid numbers ...) are documented in PATTERNS.md, not modelled.
- **Alternatives rejected:** keeping only rules mined by code (misses statement-level logic); trusting the readers' counts (re-counted instead; one over-broad pattern of mine, "heat" in first aid, was the only disagreement and the readers were right); dropping echo (it passes CV in-pool; kept, flagged as failing out of sample).
- **What would change this:** A new pool (score every rule on its new questions first), or evidence on the real exam's option order (decides between the two rule-list rows).

## 7. Old pool: no English cross-check; matching normalizes picture labels and needs option or picture similarity

- **Date / status:** 2026-10-21, active; supersedes the English cross-check planned in #5
- **Why:** The old English PDFs are a different, smaller edition (group 1: 132 answer lines vs 147 in Armenian, 22 vs 25 pages), so card k is not the same question in both. The check used instead: of the 660 old questions whose wording and options are unchanged in 2026, none has a different answer (independent parsers for old and new PDFs). Matching needed two fixes found by reading the flagged pairs: old picture labels are Armenian (Ա/Բ/Գ), new ones Latin (A/B/C), which made identical options look different; and 33 group-3 questions share one stem, so "same wording" only counts if options (rapidfuzz >= 60) or pictures still resemble each other. Result: 976 of 1,094 old questions matched, 557 identical; reading every flagged pair left 3 real key changes (1-34, 1-35, 2-75).
- **Alternatives rejected:** aligning old English to old Armenian by picture hash (only works for picture questions and adds a weaker check than the 660-question one); reporting the raw "answer text differs" count (110 flags, almost all rewording).
- **What would change this:** An old English edition of the same size turning up (then the card-by-card check works).

## 6. Shortcut analysis: per-question guess baseline, folds grouped by wording, exact pass model, "exceptions" baseline

- **Date / status:** 2026-10-21, active, revisited 2026-10-22 (#9: the exam shuffles the options) (Hayk asked for the same shortcut analysis as in the German project)
- **Why:** Options vary from 2 to 5, so a rule is scored against the sum of 1/k over the questions it fires on, not a flat 25%. 26% of questions share their wording with another (only the picture differs), so cross-validation folds are grouped by normalized wording; otherwise word rules learn answers from twins. P(pass) is exact (dynamic program per section over which questions are drawn, then convolved: 2 of 82, 2 of 59, 1 of 51, 15 of 858, at least 18 of 20), so no simulation noise. A "position only" strategy was added after the first run: with the usual-position fallback the memorize count fell from 601 to 476 for 50%, although that fallback is no better than guessing held out (253 vs 255); the drop came from "learn only what your fixed rule gets wrong", which works for any fixed rule. Against that baseline the real patterns save 22 answers at 95% (598 -> 576). Verdict in PATTERNS.md.
- **Alternatives rejected:** Monte Carlo for P(pass) (noisy, slower, the exact model is cheap); random folds (leak twins); reporting only the rule list vs guessing (would credit the patterns with ~350 answers of saving that any fixed rule gets).
- **What would change this:** Evidence on whether the computer test keeps the PDF option order (decides which rows of the table apply), or a published per-group quota for the 15 traffic-rule questions (then draw per group).

## 5. Recover the previous pool (June 2026) from the Wayback Machine and match it to the current one

- **Date / status:** 2026-10-21, active; the English cross-check described below is superseded by #7 (Hayk, not sure of the exam date: "get both pls")
- **Why:** By point 16 of Decision 385-Ն new questions may be used only 30 days after publication; the current PDFs were published 2026-10-02, so an exam before about 2026-11-01 may still draw from the previous pool. roadpolice.am now answers 404 for the old files (/exam/hy_group_N.pdf), but the Wayback Machine captured them on 2026-06-08 (the old PDFs are Word exports created 2022-04-13, so the old pool dates from 2022). The old PDFs have no question numbers and no green answer, so the old Armenian text is checked against the old English PDFs, and the questions found in both pools must agree with the current answers. Matching is one-to-one: same wording and options first, then same wording, then fuzzy text (rapidfuzz 3.14.6, score >= 85); same-wording twins are told apart by perceptual picture hash (imagehash 4.3.2), since old pictures are 600x300 and new ones 1200x600, so byte hashes never match.
- **Alternatives rejected:** ignoring the old pool (wrong if the exam is before November); third-party apps for the old pool (unofficial copies; the archive has the official files); difflib for fuzzy matching (1,116 x 1,050 comparisons take minutes in pure Python, rapidfuzz takes seconds); hand-written picture hashing (imagehash is the standard package for this).
- **What would change this:** The exam date passing 2026-11-01 (then the old pool is history; keep the data, drop it from practice), or roadpolice.am publishing a list of changes.

## 4. The official PDFs stay out of git; a manifest pins them, the extracted pictures are committed

- **Date / status:** 2026-10-21, active
- **Why:** The 10 Armenian A/B/C PDFs are 84 MB together (the English ones as much again), and everything in them ends up in the repo anyway: the text in `data/questions.json`, the pictures in `data/images/` (715 files, 66.1 MB, the JPEG bytes exactly as embedded). `official/manifest.json` records URL, the site's version stamp, size and SHA-256 per file, so a later download shows at once which groups changed. The pictures are kept as the original bytes (no re-encoding) so they can be compared with a later download byte for byte; the app can still serve smaller copies.
- **Alternatives rejected:** committing the PDFs (doubles the repo for no new content); Git LFS (another tool for files that are rebuilt from a public URL anyway); re-encoding the pictures to WebP now (loses the byte-for-byte comparison; decide when the app needs it).
- **What would change this:** roadpolice.am replacing the PDFs without a way to get the old ones back while we need to diff old vs new (then keep dated copies, e.g. as GitHub release assets).

## 3. Extract by layout with PyMuPDF 1.28.2, reading the answer twice

- **Date / status:** 2026-10-21, active
- **Why:** The PDFs come from a generator (ReportLab) with fixed positions and colors, so each line is classified by x position, font size and color (`scripts/build_dataset.py` docstring has the table), and pictures come with their position, so each is tied to the question it sits in. The correct answer is read twice, from the "Պատ.՝ N" line and from the option printed in green; they agree on all 1,050 questions. The build fails on any line that fits no role, a count different from the group header, numbering gaps, or more than one picture per question. Result: 1,050 questions (groups of 145, 82, 59, 179, 136, 95, 129, 55, 119, 51), 715 with a picture; two random pages compared by eye with the extracted text: identical.
- **Alternatives rejected:** `pdftotext` (poppler) - turns the Armenian into junk bytes (it falls back to the fonts' WinAnsi encoding); pypdf - extracts Armenian correctly but gives no positions or colors, so pictures could only be matched to questions by order on the page; OCR - not needed, the text layer is correct; PyMuPDF 2.0 - same API, but pulls in onnxruntime, numpy and networkx for a layout model we do not use.
- **What would change this:** A new PDF layout (the build will stop with "line fits no role"), or roadpolice.am publishing the questions in a structured form.

## 2. A/B/C category set only, Armenian only; English PDFs used only as a cross-check

- **Date / status:** 2026-10-21, active (Hayk: "just a regular car, automatic"; app language "only armenian")
- **Why:** A car licence is category B, which uses the A/B/C question set; automatic vs manual gearbox does not change the theory exam. The dataset and the app carry only the Armenian text. The English PDFs are downloaded and parsed with the same code to check that the two official versions agree: same number of questions, options and answer number for all 1,050, and byte-identical pictures (`results/crosscheck_en.json`: 0 differences). Nothing English is shipped.
- **Alternatives rejected:** the D/T set (buses, tractors: not Hayk's licence); Russian or English as app languages (Hayk chose Armenian only); skipping the English check (it costs nothing and is an independent second reading of the answer key).
- **What would change this:** Someone else using the app who needs Russian or English (the same parser reads those PDFs).

## 1. Questions come from the official roadpolice.am PDFs, downloaded directly

- **Date / status:** 2026-10-21, active (Hayk asked for a Playwright browsing session; asked "why not just use playwright"; the direct download was explained and the work went on)
- **Why:** https://www.roadpolice.am/hy/viv-exam is a list of 100 PDF links (10 groups x 5 languages x 2 category sets), and each PDF holds the question, the options, the correct answer and the picture. A browser would download the same files; a script does it reproducibly (`scripts/download_pdfs.py`, ~105 s for 20 files) and only re-downloads groups whose version stamp changed. The pool was regenerated on 2026-10-02 (Armenian group 4 again on 2026-10-05), so third-party apps and pages may be stale: repatarmenia.org still quotes 1,116 questions, the official pool now has 1,050.
- **Alternatives rejected:** clicking through with Playwright (same files, slower, the MCP server hung in the German project); third-party apps such as drv.am or varord.am (unofficial copies, maybe of the old pool; still useful later as a cross-check).
- **What would change this:** The site dropping the PDFs for an interactive test only (then Playwright), or the PDFs disagreeing with what the real exam shows.
