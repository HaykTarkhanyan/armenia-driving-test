> Research notes from a close reading of every question in these groups (2026-10-21, by a subagent; the counts were re-verified independently before they went into PATTERNS.md). The scripts mentioned below lived in a session scratchpad and are not in the repo; the predicates are written out here, and the statistical rules that matter are re-implemented in `scripts/mine_patterns.py`.

# Groups 1, 4, 5, 6, 7: answer shortcuts and compressible logic

Analysis of `data/questions.json` (2026-10-21), groups 1 (145), 4 (179), 5 (136), 6 (95), 7 (129) = 684
questions, 639 with a picture, 45 text-only. Every question was read with its correct answer (Armenian,
plus the official English PDF text for reading). Every rule below is a predicate run in code on the
Armenian text. Columns: **fires** = questions (or options) the rule applies to, **right** = how often it
gives the keyed answer, **chance** = sum of 1/k over those questions (what blind guessing gets).
"Fact" = a real traffic rule that compresses memorizing; "tell" = a statistical habit of the question
writers. Raw results: `agent_picture_groups.json` next to this file (rebuild: `final_rules.py`, ~2 s).

## Best finds (ranked by questions decided x reliability)

| # | Finding | Kind | Fires | Right | Chance | Exceptions |
|---|---|---|---|---|---|---|
| 1 | **Fact table** (section "Compressible facts" below): 26 rules that answer 102 questions | facts | 102 | 99 | - | the 3 railroad-parking questions contradict each other |
| 2 | **Pedestrians are never left out.** In a "to whom must you yield" list, the option that adds pedestrians to another party is right; "only pedestrians" is never right; any option asserting a duty toward pedestrians wins | fact | 18 | 18 | ~6 | none |
| 3 | **Invented exemptions are always wrong**: a "Yes, if / Permitted only ..." option built on passing, a hand signal, beacons, "no train", "no oncoming traffic", "no public transit", daylight, 3.5 t, 30 km/h, the sidewalk or residents | fact/tell | 24 options in 21 q | 0 | 7.4 | none |
| 4 | **Maneuver decides who yields** (yield questions with one "you go first / no one / not obliged" option): right turn -> you go first 8/10; straight or U-turn -> that option is wrong 16/17; left turn -> wrong 15/21 (weak) | fact + tell | 48 | see text | see text | 1-141, 6-54 (right); 1-44 (straight) |
| 5 | **"Must we yield to the tram?" is always Yes** (the question names the tram). When the tram only appears inside an option ("yield to the tram"), it is right just 3/8 | tell (wording) | 7 | 7 | 3.5 | none |
| 6 | **Backing (հետընթաց) -> No / Prohibited** | fact | 10 | 8 | 4.5 | 1-101, 1-120 |
| 7 | **U-turn "permitted if visibility >= 100 m"** is right whenever offered, unless the question names a bridge | fact | 6 | 5 | 2.5 | 1-87 (bridge) |
| 8 | **The known "both/all" tell does not work on picture questions here.** Text-only: 8/9. With picture: 50/151 (chance 47.6). In A/B/C sign/location lists the "all" option is an anti-tell: 4/23 | caveat | 151 | 50 | 47.6 | - |
| 9 | Bare Yes + bare No + a conditional "Yes, if ..." -> the bare **No** | tell | 46 | 24 | 15.0 | 22 (listed in JSON) |
| 10 | Group 7 "is stopping/parking permitted here?" (bare Yes/No) -> **No** | tell | 29 | 18 | 12.3 | 11 |
| 11 | Group 4 and 7 text-option questions: the **longest option** | tell | 82 / 61 | 42 / 28 | 29.2 / 19.2 | many |
| 12 | **Contradiction in the key**: parking near a railroad crossing is 25 m (7-6), 15 m (7-43) and "at the crossing and within 50 m" (7-68). Same in the 2022 PDFs | contradiction | 3 | - | - | - |
| 13 | **Shared pictures leak answers**: 15 pictures are used by 2-3 questions (7-81/7-82, 7-119/7-126, 5-11/5-13, ...) | giveaway | 31 | - | - | - |

How to read the ranking: #1-#7 are worth learning as rules (near-perfect, small to medium reach).
#9-#11 are weak tells for questions you have not learned; each gains only 9-13 answers over guessing
across the whole set of fired questions. #8 matters because it stops the pool-wide "pick both/all"
habit from costing points in the picture groups.

### Theories tested and disproven

| Theory | Result |
|---|---|
| Tram goes first in "order of passage" questions | tram is first in 3 of 10 correct orders (5-28, 5-35, 5-49); second in 5, last in 1 |
| Distractors are built by perturbing the right order, so the option sharing most positions with the others is right (medoid) | 2 right of 12 where it picks a unique option (chance 4.0): worse than guessing |
| The passenger car / automobile is the one that yields (2-3 option "who must yield?") | 8/13, chance 6.3; and in "who has the right-of-way?" the non-car wins only 3/7. No hierarchy by vehicle type |
| "No one" (Ոչ ոքի / Ոչ մեկին) in yield lists | 7/27, chance 8.0. When "no one" and "both/all" are both offered, "no one" is right 1/14 (5-75) |
| Longest option, groups 1, 5, 6 | 32/78 (28.8), 43/107 (40.7), 28/71 (26.9): nothing |
| "Car yields" or "bus/truck has priority" inside 2-vehicle picture questions | picture-driven, see above |

## Compressible facts (each checked against every question listed; no contradiction unless marked)

| Fact | Questions it answers |
|---|---|
| U-turn is prohibited on pedestrian crossings, in tunnels, on and under bridges/overpasses, at railroad crossings, and where visibility in either direction is < 100 m; elsewhere "permitted if visibility >= 100 m" | 1-8, 1-10, 1-21, 1-76, 1-87, 1-89, 1-108, 1-142, 1-144 |
| A "No left turn" sign, a "Left only" sign and one-way signs on the crossing road do **not** ban a U-turn | 1-118, 4-132 ("none"), 4-172 ("all") |
| No U-turn by backing at an intersection; no fixing a wrong entry by backing; backing prohibited at intersections and pedestrian crossings; if you cannot see, ask someone to guide you | 1-95, 1-99, 1-103, 1-114 |
| Warning signs: 50-100 m before the hazard in populated areas, 150-300 m outside | 4-4, 4-55, 4-142, 4-161 (>= 50 m), 4-136 (>= 50 m) |
| "Intersection area" sign may stand at most 30 m away | 4-80 |
| Box junction (waffle marking / sign): do not enter if the jam would make you stop there; you may enter only to turn or U-turn | 4-79, 4-81, 4-82, 4-83, 5-70, 6-76 |
| A stop line alone (green signal, no STOP sign) does not oblige you to stop. The STOP sign does: at the stop line; with no stop line, before the edge of the crossing roadway, not at the sign (4-95, picture checked); at a railroad, right at the stop line or sign. 4-60 keys "stop before the sign and yield" because it is the only option there that stops (wording tension with 4-95, not a contradiction) | 4-89, 7-25, 4-60, 4-78, 4-75, 4-95 |
| Railroad: stop right at the stop line / STOP sign; with nothing marked, >= 10 m from the nearest rail; with a barrier, >= 5 m before it; stopping is prohibited on the crossing itself | 7-36, 7-42, 7-46, 7-67, 4-71 |
| Railroad parking distance: **contradictory** (25 m in 7-6, 15 m in 7-43, crossing + 50 m in 7-68) | 7-6, 7-43, 7-68 |
| Stopping is prohibited if fewer than 3 m remain between your car and a solid line (a broken line does not count) | 7-41 (2.5 m is the only option < 3), 7-38 |
| Solid yellow line (road edge or curb top) = no stopping and no parking; broken yellow = no parking | 7-3, 7-12, 7-19, 7-20 |
| Lane marked "A" = public transit only | 7-21, 7-47, 7-59, 7-125 |
| Double solid centre line = 4 or more lanes; arrows on the road = lane ends; lengthening dashes = turns solid soon; orange markings override white | 7-16, 7-129, 7-17, 7-102, 7-127, 7-117 |
| Bicycle-path crossing marking | 7-15, 7-26 |
| "Dangerous shoulder" sign + roadwork plaque = entering the shoulder is dangerous (not "no stopping") | 4-28, 4-59, 4-120 |
| Controller: right arm forward -> traffic from his left goes in all directions; arms out to the sides or down -> from left and right: straight and right | 6-4, 6-12, 6-20, 6-23, 6-30 |
| Signals: yellow + red = still prohibited, green comes next; flashing green = still permitted, about to end; priority signs lose to signals; reversible-lane signals off = do not use that lane | 6-16, 6-27, 6-66, 6-39, 6-42 |
| Flashing yellow = unregulated intersection: "wait for green" is wrong | 5-108, 5-113 |
| A paved road is the main road over an unpaved one; if you cannot tell, assume you are on the secondary road | 5-104, 5-112, 5-136 |
| Entering a signed roundabout: yield to traffic already in it ("I came from the right" is wrong) | 5-23, 5-39, 5-78 |
| Steep grade: the downhill driver yields to the uphill one | 1-26, 1-33 |
| Simultaneous lane change: the car on the left yields | 1-24, 1-27 |
| In populated areas, yield to public transit leaving a marked stop | 1-28, 1-36 |
| Turn signals are always required and never give priority | 1-97, 1-105, 1-109, 1-128, 1-132 |
| Into or out of a yard / adjacent area: yield to bicyclists (entering) or road traffic (leaving), never obstruct pedestrians | 1-73, 1-129, 1-130, 1-135, 1-141 |
| Lanes: 3-lane two-way road -> never the leftmost lane (1-5), the centre lane for any of passing / going around / left turn / U-turn (1-11), left turn from the centre lane (1-19); 3+ lanes one way -> far-left lane allowed both to overtake and to turn left / U-turn (1-34, 1-35) | 1-5, 1-11, 1-19, 1-34, 1-35 |

Count: 26 rows, 102 question ids, 99 answered by a consistent rule; 3 (railroad parking) must be learned one by one.
Trick for those three: if "25 մ" is among the options, answer 25 m; if "15 մ" is, answer 15 m; in the
"Կայանումն արգելվում է" form, answer "at the crossing and within 50 m".

## The rules in detail

### Pedestrians (finding #2)

Predicate R1: question contains "զիջ" (or an option starts "Միայն հետիոտ"); pick the option that
contains "հետիոտ" and " և " and does not start with "Միայն". Fires 10, right 10, chance 3.2:
1-62, 1-73, 1-129, 1-130, 1-141, 5-102, 6-47, 6-60, 6-63, 6-78.
"Միայն հետիոտ..." (only pedestrians): fires 8, right 0 (1-129, 1-130, 1-141, 5-102, 6-47, 6-60, 6-63, 6-78).
Same idea, checked by hand (wording too varied for one regex): the option that keeps a duty toward
pedestrians wins in 1-135 ("both answers"), 5-69 ("Yes"), 5-80 ("both drivers"), 5-101 ("both cases"),
6-55 and 6-64 ("Yes, without hindering pedestrians"), 6-77 ("make sure no pedestrian is still crossing"),
7-51 ("slow down ... make sure the crossing is empty"). 18/18 in total. It does not help in 6-74, where
both options mention pedestrians.

### Qualifiers (findings #3, #7, and the "if no interference" split)

All 80 conditional options in my groups ("Yes, if ...", "Permitted only ...", "Permitted if ..." in a
question that also has a bare yes or no): right 21, chance 27.3. Conditionals in general are slightly
worse than guessing. The families split cleanly:

| Family (Armenian keyword) | Options | Right |
|---|---|---|
| passing (վազանց): "only for passing", "for the purpose of passing" | 6 | 0 |
| hand signal / beacons / train (ձեռքով, փարոսիկ, գնացք) | 3 | 0 |
| oncoming traffic (հանդիպակաց) | 3 | 0 |
| public transit present/absent (ընդհանուր օգտագործման ... բացակայ/առկա չեն) | 3 | 0 |
| sidewalk (մայթ) | 3 | 0 |
| daylight (լուսավոր) | 2 | 0 |
| 3.5 t mass | 2 | 0 |
| 30 km/h | 2 | 0 |
| residents (բնակիչ/բնակվող) | 2 | 0 |
| only one vehicle class ("only motorcycles", "only passenger cars") | 6 | 1 (7-74, public transit) |
| for picking up / dropping off a passenger | 4 | 1 (7-49) |
| **visibility 100 m** | 6 | **5** (1-87 bridge is the exception) |
| **"if it does not interfere with ..."** (խոչընդոտ), question not about backing | 6 | **5** (1-81 wrong) |
| "if it does not interfere ...", backing question | 5 | 1 (1-101) |

Predicate R4 (code): conditional option matching
`վազանց|ձեռքով|փարոսիկ|գնացք|հանդիպակաց|ընդհանուր օգտագործման.*(բացակայ|առկա չեն)|լուսավոր|3 5 ?տ|30 ?կմ|մայթ|բնակ(իչ|վող)`
and not starting with "Ոչ": 24 options in 21 questions, 0 right, chance 7.4. Pool-wide the "30 km/h"
family is 0/9 conditionals as well (groups 8 and 9 included).

### Who yields, by maneuver (finding #4)

Yield-topic questions (question or an option contains "զիջ") with exactly one "free" option (go first /
"Ոչ ոքի" / "Ոչ մեկին" / "Պարտավոր չ..." / bare "Ոչ" / right-of-way) and at least one yield option,
maneuver read from the question:

| Maneuver in the question | Fires | Free option right | Chance | Exceptions |
|---|---|---|---|---|
| "աջ շրջադարձ" (right turn) | 10 | **8** | 4.4 | 1-141 (yard: bicyclist + pedestrians), 6-54 (green filter arrow: yield to all) |
| "ուղիղ" (straight) | 12 | 1 | 4.3 | 1-44 is the only "go first" |
| "հետադարձ" (U-turn) | 5 | 0 | 2.2 | - |
| "ձախ շրջ" (left turn) | 21 | 6 | 7.8 | 1-52, 5-64, 5-73, 5-90, 5-114, 6-51 |
| none named | 35 | 15 | 15.5 | no signal |

The right-turn half is close to a real rule (a right turner crosses nobody's path); 6-54 is the
documented exception (moving on a green arrow of an additional section, you yield to everyone; I
checked the picture). The straight / U-turn half is a writers' habit: they put you on a secondary road
or next to a tram whenever you go straight.

### Tram (finding #5)

Question text contains "տրամվայ" and "զիջ" (whole pool): fires 7, right 7 with the bare Yes ("Պարտավոր
ենք" / "Այո"): 5-96, 5-111, 5-123, 5-126, 5-127, 6-18 (tram must yield on green to vehicles still in the
intersection), 6-56. When the question does not name the tram and an option says "yield to the tram":
right 3 of 8 (5-85, 6-59, 6-65 right; 5-77, 5-108, 6-51, 6-58, 6-68 wrong). In group 6 "permitted to
proceed" lists, options that include the tram are 0/4 (6-21, 6-29, 6-38 x2).

### Backing (finding #6)

Question contains "հետընթաց" and offers a bare "Ոչ" / "Արգելվում է": that option is right 8 of 10
(1-95, 1-100, 1-107, 1-114, 1-116, 1-122, 1-124, 1-140). Exceptions: 1-101 (U-turn by backing into a yard
entrance, "if it does not interfere" - right) and 1-120 (backing toward a passenger on a straight road
with no crossing, bridge or intersection - I checked the picture: nothing forbids it).

### The known "both/all" tell, split (finding #8)

Single option matching `^բոլոր|երկու|թվարկ(ված|ած) բոլոր|բոլոր թվարկ|^ցանկացած|^բոլորին|երեք դեպքերում էլ`:

| Scope | Fires | Right | Chance |
|---|---|---|---|
| group 1 | 47 | 21 | 14.8 |
| group 4 | 36 | 9 | 11.1 |
| group 5 | 34 | 16 | 11.2 |
| group 6 | 18 | 6 | 6.2 |
| group 7 | 25 | 6 | 7.1 |
| groups 1,4,5,6,7, text-only | 9 | 8 | 2.9 |
| groups 1,4,5,6,7, with picture | 151 | 50 | 47.6 |
| A/B/C sign or location lists (groups 4, 5, 7): "all" | 23 | 4 | 6.8 |
| group 1 path questions: "any path" | 11 | 4 | 3.7 |
| 3-option "A / B / both" forms in my groups | 29 | 10 | 9.7 |

So: keep the tell for text-only questions; in sign/location lists avoid "all" (right only in 4-158,
4-163, 4-172, 7-97); in groups 1 and 5 it is mildly positive; in 4 and 7 it is negative.

### Weak tells (findings #9-#11)

- R6: question has a bare Yes, a bare No and a conditional yes -> bare No: 24/46, chance 15.0.
- R7: groups 4 + 7, stopping/parking question ("կանգառ|կայան|կանգ առն|կանգնել") with bare Yes and No ->
  No: 21/40, chance 16.8; group 7 alone 18/29, chance 12.3. Group 4 alone is the other way round (3/11).
- R10: longest option (unique, by characters) in questions without bare yes/no and without letter or
  number options: group 4 42/82 (chance 29.2, z ~2.9), group 7 28/61 (chance 19.2, z ~2.4). Groups 1, 5,
  6 show nothing, which is why the pool-wide figure (354/901) looked flat. Chosen after looking; treat
  as a tie-breaker only.
- R8: "did X violate ...?" with a bare Yes -> Yes: 4/4 (4-99, 4-151, 7-54, 7-73). Small.

## Group 1 (145 questions; 124 with a picture, 21 text-only)

| Template | n | Text shortcut? |
|---|---|---|
| yield / right-of-way (lists, 2-vehicle, statements) | 43 | partly: maneuver rule, pedestrians, facts (1-24, 1-26, 1-28, 1-33, 1-36, 1-121, 1-129, 1-130); 2-vehicle "who must yield" is picture-only |
| which path (Միայն A / Միայն B / Ցանկացած) | 16 | no; picture-only ("any" 4/11). Cues seen: crosswalk signs (1-111) and the "No left turn" sign that still allows a U-turn (1-118) |
| permitted directions / lanes | 14 | facts for the text ones (1-5, 1-11, 1-19, 1-34, 1-35); known "narrowest direction is rarely right" |
| backing | 12 | yes: No 8/10 + facts (1-99, 1-103) |
| U-turn (statements and yes-no) | 18 | yes: prohibited-places list + 100 m rule |
| yield yes-no | 11 | 6 Yes / 5 No: picture-only except the maneuver rule |
| other yes-no | 11 | no |
| who violated | 4 | no |

Exception worth knowing: 1-44 (straight ahead, must you yield to the car pulling out on the left with a
blue light on? No). 1-137 says No even with 100 m visibility (something else in the picture forbids it;
not checked).

## Group 4 (179 questions; 178 with a picture)

| Template | n | Text shortcut? |
|---|---|---|
| meaning of a sign / plaque / marking (text options) | 54 | weak: longest option (R10); facts for warning distances, shoulder, box junction |
| A/B/C combinations | 32 | no; only the anti-tell "avoid 'all'" |
| pick the sign by number (1..5) | 30 | none: pure picture (position effects are the known pool-wide ones) |
| yield / STOP sign situations | 11 | facts: STOP sign = stop and yield (4-60, 4-78, 4-75) |
| permitted directions / lanes | 10 | no (picture-dependent; 4-112 and 4-145, trucks of 3.5 t and 3 t, both answer "any direction") |
| stopping / parking yes-no | 9 | no (No only 3/9 here) |
| which path | 9 | no |

Speed signs are picture-only in text: "recommended" (blue square) is right in 4-52, 4-66, 4-68,
"maximum" in 4-64, 4-123, "minimum" in 4-14, 4-18, 4-105, 4-110.

## Group 5 (136 questions; 133 with a picture)

| Template | n | Text shortcut? |
|---|---|---|
| yield / right-of-way | 67 | partly: maneuver rule, pedestrians, tram wording, facts (5-23, 5-39, 5-78, 5-104, 5-108, 5-112, 5-113, 5-136) |
| which vehicle goes 1st / 2nd / 3rd / last (colours) | 27 | none: pure picture. Shared pictures help: 5-11 + 5-13 (red first, green last), 5-15 + 5-18 (green first, blue second), 5-25 + 5-47 (blue third, yellow last) |
| order of passage (vehicle lists) | 21 | none: tram-first and medoid both fail (see "disproven") |
| tram yes-no | 6 | yes: Yes 5/5 (5-76 is a non-tram No) |
| other | 10 | 5-70 (enter a jammed intersection only to turn), 5-97 / 5-128 (turn right alongside the truck if you do not hinder it), 5-100 (rules do not regulate it) |

Right-of-way options that justify priority with "it came from the right" (աջ կողմից / աջից) are wrong
in 1-83, 5-23, 5-39, 5-112 and right only in 1-27 (simultaneous lane change).

## Group 6 (95 questions; 88 with a picture)

| Template | n | Text shortcut? |
|---|---|---|
| yield at signals / with a controller | 28 | partly: maneuver rule, pedestrians; the tram is not privileged here (6-3, 6-67: tram yields) |
| meaning of signals / controller | 16 | yes for the 9 text ones: controller and signal facts |
| permitted directions / "traffic is permitted for" colour lists | 12 (more colour lists sit under "other", 15) | no; tram in a "permitted" list 0/4 |
| yield yes-no | 7 | 6 Yes / 1 No (6-61, right turn) - fits the maneuver rule |
| order / 1st-last | 7 | none |

Shared picture: 6-31 + 6-37 (prohibited for the blue-yellow car to the left; permitted: red straight and
right, blue-yellow straight).

## Group 7 (129 questions; 116 with a picture)

| Template | n | Text shortcut? |
|---|---|---|
| meaning of a marking | 29 | yes for the facts (yellow lines, "A" lane, arrows, dashes, orange), else the weak longest-option tell |
| stopping / parking yes-no | 28 | weak: No 18/29 (R7) |
| stopping / parking statements | 23 | text facts: railroad, 3 m, bridges (7-2), left side in a populated one-lane road is allowed (7-35), long rest outside towns only off the road (7-40) |
| A/B/C combinations | 12 | no; avoid "all" |
| who violated | 11 | no ("both/all" 6/16, chance 4.3, small) |

Shared pictures that answer each other: 7-81 + 7-82 (same scene: stopping there is fine, parking is a
violation), 7-119 + 7-126 (stopping Yes, parking Prohibited), 7-3 + 7-12 + 7-19 (the yellow curb line),
7-23 + 7-27 (the yield line).

## Twins: same wording, same options, different answer

10 clusters in my groups flip the answer between pictures (1-31/6-3, 1-111/1-112/1-118, 4-17/4-45,
4-118/7-92, 5-2/5-13, 5-3/5-16/5-42, the "second" and "first" colour clusters, 5-37/6-7, 6-87/6-88).
The ones I opened all have a visible cue:

| Twins | Cue in the picture |
|---|---|
| 1-111 (Only A) vs 1-112 (Any path) | identical scene except pedestrian-crossing signs in 1-111 (no U-turn on the crossing) |
| 1-118 (Any path) | "No left turn" sign: U-turn still allowed |
| 4-118 (Prohibited) vs 7-92 (Permitted) | 4-118 has a "No stopping" sign; 7-92 shows the car 15 m from a bus-stop sign |
| 6-87 (straight and right) vs 6-88 (right only) | same controller pose; 6-88 has a "right only" lane arrow under the car |
| 1-57 vs 1-59 ("go round the truck on the right": wrong vs part of "both") | 1-57 is a two-lane rural road (going round means using the shoulder); 1-59 has a free lane on the right |

Not opened: 1-31/6-3, 4-17/4-45, 5-37/6-7 and the colour-ranking clusters. 15 pictures are reused by
2-3 questions in these groups, 31 questions in all (the pairs in the group 5, 6, 7 sections above plus
1-6/1-9, 4-3/4-22, 4-6/4-45, 4-18/4-27, 4-80/4-81, 6-10/6-11, 6-17/6-34); none contradicts its partner.

## Contradictions and giveaways

- **Contradiction**: 7-6 (options 300/150/100/50/25 m, key 25 m), 7-43 (options 15/50/100/150 m, key
  15 m), 7-68 ("at the crossing and within 50 m", key). The 2022 PDFs (`official/old_pool/hy_group_7.pdf`)
  have the same three keys, so this is old. Which one the law states is not checked here.
- Checked and not contradictions: 1-57 vs 1-59 (shoulder), 7-67 vs 7-68 (stopping vs parking), 1-87 vs
  the 100 m rule (bridge).
- Text that answers other questions: 1-10 and 1-21 give the 100 m family; 1-24's answer is spelled out
  in 1-27's right option; 5-78 states the roundabout rule used by 5-23 and 5-39; 5-104 and 5-136 state
  the paved-road rule that 5-112's right option repeats; 1-28 answers 1-36; 4-79 and 4-83 spell out, in
  the question, the full box-junction definition that is the right option of 4-81 and 4-82 (the longer
  "... that would force the driver to stop" version, not the shorter one); 6-4/6-20/6-30 and 6-12/6-23
  are the same two controller facts.

## Method and files

- Scratch scripts in this folder: `extract_en.py` (English text from the official English PDFs, read
  only), `dump.py` (per-group dumps), `a1_twins.py` ... `a17_templates.py` (one check each),
  `final_rules.py` -> `agent_picture_groups.json` (the numbers in this file). Nothing in the repo was
  modified.
- "Chance" is the sum of 1/k over the questions where a rule fires (for option-level rules, over the
  options). Elimination rules (#3, #4 straight/U-turn, R1b) remove options rather than pick one.
- All rules were found after reading the data; the counts are in-sample. The facts (#1, #2, #6, #7 and
  the right-turn half of #4) are traffic rules and should hold on new questions; the tells (#5, #9-#11)
  may not.
