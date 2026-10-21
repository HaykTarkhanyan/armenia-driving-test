# Shortcuts and logic in the Armenian theory exam (A/B/C pool, 1,050 questions)

Analysis of `data/questions.json`, 2026-10-21. Raw results: `results/patterns.json`. Interactive report:
`reports/patterns_report.html`. Rebuild: `uv run python scripts/build_old_pool.py` (~20 s), then
`uv run python scripts/mine_patterns.py` (~45 s), then `uv run python scripts/build_pattern_report.py`
(~2 s). Every group was also read question by question (notes in `_knowledge/shortcut_hunt_*.md`,
whose fact tables were checked in code there); every statistical count below was re-checked
independently, and the rules marked so are in `scripts/mine_patterns.py`.

## Verdict

**No trick gets near a pass; the exam needs 18 of 20. But the pool is full of logic that turns
memorizing into understanding.** Guessing everything scores 7.2 of 20; the full rule list below 9.0, or 9.3 with "the longest option" for everything else.

**The real exam shows the options in random order** (Hayk, 2026-10-22), not in the PDF order. So
every rule below is about the content of an option, never its position.

Answers to learn (in the best order) for a given pass chance, by what you do with the rest:

| What you do with the questions you did not learn | Score if you learn nothing | 50% | 80% | 90% | 95% | 99% |
|---|---|---|---|---|---|---|
| Guess | 7.2 / 20 | 763 | 872 | 920 | 952 | 997 |
| Rules + never-pick list, guess the rest | 9.0 / 20 | 542 | 634 | 682 | 714 | 759 |
| **Rules + never-pick list, else the longest option; learn only where that fails** | **9.3 / 20** | **418** | **478** | **502** | **518** | **540** |
| Always the longest option, learn only where it fails (no other rules) | 7.3 / 20 | 509 | 569 | 593 | 609 | 631 |

- **The "learn only where it fails" trick.** For a question you did not learn, a random guess is right
  about 1 time in k, but you cannot know in advance which ones. A **fixed** pick that depends only on
  the option's text (here: the longest option in characters, ties broken alphabetically) gives the same
  answer however the options are shuffled, so you can find out now which questions it gets right and
  skip learning exactly those. "Always the longest" is barely smarter than chance (right on 392 of
  1,050 questions; random guessing averages 379): the whole saving comes from it being predictable.
  Combined with the rules: **518 answers for a 95% pass instead of 952**.
- **The catch:** on the exam you must reliably tell "a question I learned" from "a question where the
  longest option wins", i.e. recognize the second kind as safe to answer by length. That still means
  knowing something about every question, so the real saving is smaller than on paper. The row without
  the trick (714) needs no such bookkeeping.
- If you know a share of every section and guess the rest: 80% known -> 52% pass, 90% -> 87%,
  95% -> 97.5%, 98% -> 99.8%.
- Does not apply, because the exam shuffles the options: the same trick with a fixed **position**
  ("always option 2": 598 for 95%; "rules + usual position": 533). A position changes with every
  shuffle; the text of an option does not. (These rows are in the report and in `results/patterns.json`.)

**"Longest" means the most characters** (letters, spaces and punctuation), which is what the code
counts. Counting words gives about the same accuracy but decides fewer questions, because word counts
tie more often: first aid 31 of 50 by characters, 26 of 36 by words; law definitions 23 of 28 by
characters, 18 of 25 by words. On the screen: the option that takes the most room; if two look the
same, the rule does not decide.

## The best finds

| # | Find | Evidence |
|---|---|---|
| 1 | Group 3: every condition with **"կառուցվածքով նախատեսված / չնախատեսված"** prohibits driving; only 28 conditions do not | 24 of 24; Hayk's rule |
| 2 | **Never pick** an option with "30 կմ/ժ", "վարորդի հայեցողությամբ", a train condition, "Միայն հետիոտ...", or a first-aid folk remedy | 55 options, 0 right |
| 3 | In a **text** question, the **"both / all of the above"** option | 54 of 97 (chance 31); 13 of 22 on unseen questions |
| 4 | The only option starting **"Արգելվում"** (prohibited); in group 9 "allowed?" questions 16 of 21 | 52 of 90 (chance 35); 13 of 20 unseen |
| 5 | **First aid**: the longest option, in characters (the complete procedure) | 31 of 50 (chance 16) |
| 6 | **Law definitions** ("... է համարվում"): the longest option, in characters (the full legal wording) | 23 of 28 (chance 13) |
| 7 | A bare **"Պարտավոր է / Պարտադիր է"** (it is obligatory) | 23 of 29 (chance 14) |
| 8 | **Yield lists**: the option naming pedestrians together with someone else; "only pedestrians" never | 10 of 10; 0 of 8 |
| 9 | **"Must you yield to the tram?"**: yes | 7 of 7 |
| 10 | **Group 8, five numbers**: the middle value by size, not by position (the speed and distance questions) | 7 of 7 |
| 11 | **Fact sheets**: about 30 facts per group answer 25-75% of each group | 0 contradictions, except the 3 key errors below |
| 12 | **Three errors in the official key** (horn, railway parking twice) and **3 answers that changed** in October 2026 | checked against the law |

## Never pick

| Option contains | Options | Right |
|---|---|---|
| "30 կմ" (30 km/h): the pool keeps offering "overtaking is allowed if the slow vehicle goes under 30 km/h", an exemption that does not exist (9-30 even puts it in the question; the answer is still "prohibited") | 18 | 0 |
| "վարորդի հայեցողությամբ" (at the driver's discretion) | 6 | 0 |
| a train condition ("գնացք": "if no train is coming") | 6 | 0 |
| "Միայն հետիոտ..." (only pedestrians) | 8 | 0 |
| first-aid folk remedies: alcohol, iodine, ointment, ash, rubbing with snow, slapping, valerian | 11 | 0 |

Close to never (picture groups, read by hand): a "Yes, if / Permitted only ..." option built on passing,
a hand signal, beacons, no oncoming traffic, no public transport, daylight, 3.5 t, the sidewalk or
residents: 0 of 13 (my stricter regex; 0 of 24 in the reading notes). Two conditions are usually right
instead: "if visibility is at least 100 m" (U-turn, 5 of 6; the miss is on a bridge) and "if it does not
hinder ..." outside backing questions (5 of 6).

## Group by group

How much each group is worth: a question of group 3 is drawn with 3.4%, group 2 with 2.4%, group 10
with 2.0%, a traffic-rule question (groups 1, 4-9) with about 1.7%. Learn in that order.

### Group 3 - faults that prohibit driving (59 q, 2 per test)

Every question reads "operating is prohibited if: A / B / both" (3 have A / B / C / all), so each
question says, condition by condition, whether it prohibits. Scoring "is this option the answer" hides
that: the fuel-cap fault is a wrong option in 3-48 (answer: both) and the right one in 3-58.

- **Prohibited is the default:** 87 of 121 listed conditions prohibit; "both/all" is the answer in
  27 of 59.
- **"Provided by the design" always prohibits: 24 of 24.** Where it appears (23 questions) the answer
  is never the other single condition: "both" 12 times, that condition 11 times. The law agrees: annex 2
  of Decision 955-Ն lists missing or broken design equipment.
- **Only 28 conditions do not prohibit** (full list in the report): lights of a normal colour in their
  normal place (front: white, yellow or orange turn signals, yellow fog lights, white reflectors; rear:
  red or orange turn signals, red reflectors, white reversing lights); tread at or above the minimum
  (car 1.6 mm, truck 1.4-1.6 mm); fuel and coolant-temperature gauges, interior lights; engine running
  unevenly or overheating; dirty bumpers; signs that are not required ("doctor", the triangle on a
  motorcycle without sidecar); curtained rear windows when both side mirrors are there.
- Lights that **do** prohibit: yellow reflectors front or rear, red reversing lights, white rear turn
  signals, dirty or missing lamps, rear fog lamps wired to the brake lights.

### Group 2 - Road Traffic Safety Law (82 q, 2 per test)

- **Facts** (27 questions): licence ages A/B/C **18**, BE **19**, D/D1 for conscripts **19**,
  learner **17**; international licence A/B at **18**, C at **21** (so BC and BE/CE holders wait until
  21); trailer on a B licence up to **750 kg**; register a bought vehicle within **15 days**; national
  licence **10 years**, international **3 years**, a foreign licence valid **3 months** after entry; a stop
  is up to **5 min**; insufficient visibility under **300 m**; moped up to **50 cc** / **50 km/h**;
  passenger car up to **8** seats.
- **Definitions: the longest option** in characters (23 of 28; by words 18 of 25). The law defines by exclusion: the right definition
  says "բացառությամբ" (except), the wrong twin "այդ թվում" / "ինչպես նաեւ" (including / as well as).
  Exceptions to learn: 2-16 (public transport does not include taxis), 2-35 (car = up to 8 seats, the
  shorter one), 2-62 (passing in lane = without leaving the lane), 2-34 (night = end of dusk to dawn).
- **Both/all** 11 of 18. The false statements that make "all" wrong: cyclists need goggles (2-10, only
  the helmet), the seller is responsible for the car's condition (2-23), a power of attorney must be
  carried (2-27), any road user directing traffic is a regulator (2-30), the learner is liable (2-78,
  the instructor is), ATVs on public roads (2-82).

### Group 8 - speed, towing, cargo, people (55 q)

- **Speeds** (all 0 contradictions): **60** in settlements, for groups of children and for people in a
  truck body; **90** for a car or a truck up to 3.5 t outside settlements, and a car with a trailer on
  a motorway; **50** for any towing; **20** in a residential zone. A truck up to 3.5 t counts as a
  passenger car for limits and sign plates (8 of 9; exception 7-89, a parking plate).
- **Towing**: rigid bar up to **4 m**, rope **4-6 m**; no rope on ice; only motorcycles with a sidecar
  may be towed; people ride only in a towed car or a towed truck's cab, never in a towed bus.
- **Cargo**: "long load" sign when it sticks out more than **1 m** at the rear or **0.4 m** at the side;
  front seat without child seat from **12**; nobody rides in a truck trailer.
- **Five numbers: the middle value** (the third smallest, wherever it is shown), 7 of 7 (it is the
  speed table again).

### Group 9 - signals, beacons, lights, overtaking, crossings (119 q)

- **Facts** (45 questions): blue beacon + siren -> just yield; blue + red + siren -> slow down and yield;
  priority needs blue **and** siren; yellow beacon gives no priority; hazard lights for an accident, a
  towed vehicle, a forced stop where stopping is banned, and when dazzled (first action); signal in
  advance, a hand signal ends just before the manoeuvre, the indicator just after; dip the high beam at
  **150 m**; rear fog lamp only in insufficient visibility; horn only to prevent an accident; no
  overtaking at intersections, pedestrian crossings, rail crossings and **100 m** before them
  (law point 77); warning triangle **15 m** in, **30 m** outside settlements.
- **"Allowed?" -> "Արգելվում է"** 16 of 21 (only in group 9; elsewhere at chance). The "allowed, if ..."
  options are right 5 of 29 times here.
- **Both/all** 10 of 13. False statements: overtaking banned 150 m before a crossing (it is 100 m),
  the horn to announce overtaking, rear fog lamps in a convoy or tunnel.
- Same-wording questions here always share the answer (10 of 10 held out): learn one, know all.

### Group 10 - first aid (51 q, 1 per test)

- **The longest option** in characters, 31 of 50 (by words 26 of 36): the right answer is the full
  procedure. The 4 misses: 10-5 (seizure:
  do not touch), 10-8 (bruise: cold and raise), 10-26 (diabetic: sugar first), 10-46 (no drugs).
- **Positions**: head injury half-lying; fainting lying with legs up; asthma half-sitting; belly injury
  knees bent; chest injury sitting, leaning to the injured side; unconscious but breathing: recovery
  position; spine: on the back, do not move.
- **Numbers**: pulse **60-80**, breathing **12-18** per minute, tourniquet at most **1 h** (warm) /
  **0.5 h** (cold), cool a burn **20 min**. Scene safety first; spurting bright red = artery, tourniquet
  above the wound. Cold, not heat, for injuries, except frostbite (warm, never rub with snow).
- Never pick a folk remedy (see above).

### Groups 1, 4, 5, 6, 7 - the picture groups (684 q)

Mostly decided by the picture; group 5 "who goes first/second/last" (27) and order-of-passage lists
(21) have no text shortcut at all. What does work:

- **Who yields depends on the manoeuvre**: turning right, "you go first" is right 8 of 10; going
  straight or making a U-turn, "you go first / no one" is wrong 16 of 17 (reading notes; a stricter
  re-check finds fewer such questions but agrees on all of them: 4 of 4 and 0 of 2).
- **Pedestrians are never left out** (yield lists 10 of 10; "only pedestrians" 0 of 8). **Tram:
  yes, yield** (7 of 7). **Backing** (հետընթաց) -> no / prohibited (8 of 10).
- **Facts** (99 of 102 questions consistent): U-turn banned on crossings, in tunnels, on and under
  bridges, at rail crossings and where visibility is under 100 m; a "no left turn" sign does not ban a
  U-turn; warning signs 50-100 m before the hazard in settlements, 150-300 m outside; box junction: do
  not enter if you would have to stop in it; a stop line alone does not oblige you to stop, the STOP
  sign does; rail crossing: stop at the line or sign, otherwise 5 m before the barrier or 10 m from the
  rail; no stopping with less than 3 m to a solid line; solid yellow line = no stopping, broken yellow =
  no parking; lane "A" = public transport only; a paved road is the main road over an unpaved one;
  steep grade: downhill yields to uphill; simultaneous lane change: the car on the left yields.
- **Both/all does not work with pictures** (5 of 15), and a bare "Բոլոր / Ցանկացած" (all / any) option
  in sign lists is an anti-tell (10 of 42).
- 15 pictures are shared by 2-3 questions (7-81 / 7-82: same scene, stopping fine, parking not).

## Errors in the official key

The computer grades against the key, so answer as the key says; these are worth learning precisely
because the law points the other way. Law quotes: `_knowledge/answer_key_errors.md`.

| Question | Key | Law (Decision 955-Ն) |
|---|---|---|
| 7-6 parking distance from a rail crossing | 25 m | 50 m (point 86.4); 7-68 says 50 m |
| 7-43 same question, other options | 15 m | 50 m |
| 3-42 horn broken (worded "ձայնարկիչ") | does not prohibit (answer 1) | prohibits (annex 2, item 3); 3-15, 3-35, 3-49 agree with the law |

Also: 2-77 has the same option twice («B», «C», «D»); the key (option 2) is unaffected.

## Old pool vs new pool

The pool online until autumn 2026 (Word files from April 2022, recovered from the Wayback Machine):
1,094 questions. The new one: 1,050. Matched one to one: 976. Of the 660 with unchanged wording and
options, none changed its answer. Removed: 118, mostly bus, truck and tractor questions that moved to the
D/T pool. Added: 74, most of them in the law (group 2). Real answer changes, found by reading every
flagged pair:

- **1-34, 1-35**: with 3+ lanes in one direction the far-left lane is now allowed both for overtaking
  and for turning ("both"); the old key said turning only.
- **2-75**: the right to drive starts with the licence card **or its new digital version** ("both").

Anyone who studied with an app made before October 2026 has these three wrong. The removed questions:
`data/old_pool/questions.json` (`new_id` null).

## The statistics

Rules scored against each question's own guess chance (1/k). Whole pool:

| Rule | Fires | Right | Guessing gets | Survives Bonferroni (22 rules) |
|---|---|---|---|---|
| Both / all of the above (text questions) | 97 | 54 | 30.7 | yes |
| 3 options: the last in the PDF (a habit of the question writers; useless on the exam, which shuffles) | 568 | 229 | 189.3 | yes |
| The only option starting "Արգելվում" | 90 | 52 | 35.4 | yes |
| First aid: the longest (characters) | 50 | 31 | 15.8 | yes |
| The only option without "միայն" when 2+ others have it | 79 | 38 | 25.2 | yes |
| Law definitions: the longest (characters) | 28 | 23 | 13.2 | yes |
| Bare "Պարտավոր է / Պարտադիր է" | 29 | 23 | 13.6 | yes |
| Yield lists: pedestrians and someone else | 10 | 10 | 3.2 | yes |
| Group 8, five numbers: the middle value | 7 | 7 | 1.4 | yes |
| Echo: the option repeating the most words of the question | 149 | 73 | 54.8 | yes, but fails on unseen questions |
| Tram: yes / backing: no | 7 / 10 | 7 / 8 | 3.5 / 4.5 | no (small) |
| The longest option, pool-wide (characters; by words 260 of 630, chance 224) | 901 | 354 | 334.2 | no |

**Held out** (5 folds grouped by wording, the list rebuilt on 4 folds and scored on the 5th): 235
right of 418 where guessing gets 149 (content rules); the word model 395 of 882 (325), but its top
words are content ("70կմ", "վազանց"): it memorizes, it finds no tricks.

**On questions nobody had seen** (the 118 removed in 2026, never read while the rules were found):
both/all 13 of 22 (7.2), "Արգելվում" 13 of 20 (8.0) and the PDF habit "3 options: the last" 34 of 72 (24.0) hold up; echo
(7 of 19, 7.9) does not. With 22 rules tested, one or two p-values under 0.05 are expected by chance
("shortest" did that here and is nothing in the main pool). Most group rules fire only 1-8 times there.

**Caveats.** The group rules and facts were found by reading all questions, so their counts are
in-sample; the unseen test is small. The exam shuffles the options, so the position rules only show how
the questions were written; the strategy numbers above use content rules only. The 15
traffic-rule questions are assumed drawn evenly from 858 (the law gives no quota per group). The 3
psychological questions are not in the pool and are assumed passed.

**What does not work** (measured): near-twin options, formatting artefacts (punctuation, capitals,
quote style, եւ/և), negations, "if/except" conditions, "the pool answers itself" by word overlap (35%,
chance), tram first in order of passage (3 of 10), "the car yields" (8 of 13, chance 6.3), "no one"
in yield lists (7 of 27), the longest option in groups 1, 5, 6, 8.
