> Research notes from a close reading of every question in these groups (2026-10-21, by a subagent; the counts were re-verified independently before they went into PATTERNS.md). The scripts mentioned below lived in a session scratchpad and are not in the repo; the predicates are written out here, and the statistical rules that matter are re-implemented in `scripts/mine_patterns.py`.

# Groups 2, 8, 9, 10: shortcuts and compressible logic

Source: `data/questions.json` (official A/B/C pool, 1,050 questions), answer key as published. All 307
questions of groups 2 (82), 8 (55), 9 (119) and 10 (51) were read in full with their answers (Armenian, and
the official English PDF for wording checks). Every number below comes from a script in
`scratchpad/deep/tg/` (nothing in the repo was changed). Normalisation: `և` -> `եւ`, lower case, collapsed
whitespace. "Chance" = sum of 1/k over the questions where a rule fires (k = number of options).

Two kinds of finds, kept apart on purpose:

- **Fact** = a short rule from the rulebook that answers several questions. Checked: the correct option
  matches it in every listed question, and no other question in the pool says otherwise.
  `tg_verify_facts.py`: **145 claims, 0 mismatches.**
- **Tell** = a test-writer habit (length, wording). Statistical, and measured **on the same data I read**,
  so the accuracy figures are in-sample and somewhat optimistic.

## Best finds (ranked by questions answered x reliability)

| # | Find | Kind | Answers | Right | Score* | Chance |
|---|---|---|---|---|---|---|
| 1 | Group 9 fact sheet (beacons, hazard lights, signal timing, lights, rail crossing, overtaking zones, 4 numbers) | fact | 45 of 119 | 45 | 45 | - |
| 2 | Group 8 fact sheet: **60 / 90 / 50 / 20 km/h**, 4 m / 4-6 m tow, people-when-towing, cargo 1 m / 0.4 m, children 12 | fact | 41 of 55 | 41 | 41 | - |
| 3 | Group 10: cross out folk remedies, then pick the **longest** remaining option | tell | 50 | 34 | 34 | 15.8 |
| 4 | Group 10 fact sheet: 9 body positions, 5 numbers, "scene safety first", bleeding types | fact | 28 of 51 | 28 | 28 | - |
| 5 | Group 2 fact sheet: ages 17/18/19/21, 750 kg, 15 days, 10 y / 3 y / 3 months, 5 min, 300 m, 50 cc, "motorcycle seat" family | fact | 27 of 82 | 27 | 27 | - |
| 6 | "Both / all listed" in groups 2, 8, 9 (the exceptions are 11 memorable false statements) | tell | 36 | 25 | 25 | 11.0 |
| 7 | Group 2 definitions ("... է համարվում"): pick the **longest** option | tell | 27 | 22 | 22 | 12.7 |
| 8 | Group 9 "allowed?" questions: pick **"Արգելվում է"** | tell | 22 | 17 | 17 | 8.6 |
| 9 | Never pick (pool-wide): any option with **"30 կմ/ժ"**, **"վարորդի հայեցողությամբ"**, or a **"գնացք"** condition | elimination | 30 options in 28 q | 0 of 30 correct | +5.0 expected | - |
| 10 | Group 10 never pick: alcohol/iodine/oil/ointment/ash/heat/snow-rubbing/slapping/valerian/drugs/pull-out/push-back | elimination | 22 options in 14 q | 0 of 22 correct | +4.5 expected | - |
| 11 | Bare "Պարտավոր է / Պարտադիր է" (it is obligatory) | tell | 10 | 9 | 9 | 4.2 |
| 12 | Group 8, 5-option number questions: the **middle value** | tell | 8 | 7 | 7 | 1.6 |
| 13 | Truck <= 3.5 t counts as a passenger car for speed limits and sign plates (cross-group) | fact | 9 (3 in g8/g9) | 8 | 8 | - |

\*Score = questions answered x reliability = number right. For the tells, the honest gain is "right minus
chance". The facts and tells overlap. Applied together (facts first, then the tells on the rest), the
expected score is 63/82 in group 2 (77%), 49.5/55 in group 8 (90%), 89/119 in group 9 (75%) and 47/51 in
group 10 (92%). Pure guessing gives 39% / 33% / 37% / 32% (`tg_combined.py`, in-sample). The facts still
have to be learned; the point is that each one covers several questions.

**No contradictions** in these four groups. The only key or data defect: **2-77 has two identical options**
(1 and 4 are both «B», «C», «D»), so neither can be the answer (the answer is 2, «C», «D», «T»).

**Negative results** (no tell): group 8 has no length tell (longest 10/27, chance 9.8). In group 9 the
longest option is an anti-tell: 25/108 right, chance 40.5, because the long options there are the
"allowed, if ..." traps. A bare "Այո" (yes) is not a tell: 5/12 in these groups (chance 5.2), 24/58
elsewhere (chance 24.8). Group 9 has 60 picture questions (who goes first, hand signals, overtaking
scenes). Most of them need the picture; the only text help for them is rows 8, 9 and 11.

---

## Group 2 - Road Traffic Safety Law (82 questions, 2 per exam)

### 2a. Fact sheet (27 questions, 0 contradictions)

| Fact | Questions |
|---|---|
| Licence age: A, B, C **18**; BE **19**; D/D1 for conscripts **19**; candidate driver (not AM) **17** | 2-2, 2-11, 2-3, 2-21, 2-42 |
| International licence: A/B at **18**, C at **21**. So a BC holder (2-79) and a BE/CE holder (2-80) both wait until **21** | 2-38, 2-39, 2-79, 2-80 |
| Trailer on a B/C/D licence: up to **750 kg** | 2-9, 2-45 |
| Register a bought vehicle within **15 days** | 2-22 |
| National licence **10 years**, international **3 years**, foreign Vienna-convention licence valid **3 months** after entry | 2-40, 2-41, 2-76 |
| Stop = up to **5 min** (or as long as boarding/loading takes); parking = over 5 min, except avoiding a collision, boarding, loading | 2-15, 2-43, 2-20 |
| Insufficient visibility = under **300 m** in fog/rain/snow | 2-14 |
| Moped = up to **50 cc** and up to **50 km/h** | 2-12 |
| Passenger car = up to **8** passenger seats | 2-35 |
| C1 does **not** cover trucks over **8500 kg** | 2-81 |
| Medical certificate for a first licence: **C, D, T** (the only option without B) | 2-77 |
| Motorcycle seat or handlebars puts a vehicle on the motorcycle side: quadricycles with a motorcycle seat = motorcycles (2-69); A also covers A1, AM, B1-with-moto-seat (2-72); B covers B1 **except** moto-seat ones (2-73); quadricycle yes, ATV ("քվադրոցիկլ") no on public roads (2-82) | 2-69, 2-72, 2-73, 2-82 |

Age tell (statistical, redundant with the table): "the highest age offered" is right 7/9 (chance 2.75);
exceptions 2-21 (19 of 18-21) and 2-80 (21 of 20/21/22).

### 2b. Definitions: the longest wording wins (tell)

Predicate: the question contains `համարվում|հավասարեցվում`, no both/all option, pick the uniquely longest
option (characters).

- Two-option definitions: **19/22** (chance 11.0). All definitions: **22/27** (chance 12.7).
- Exceptions to memorise: **2-16** public transport does NOT include taxis (the version adding
  "ինչպես նաեւ թեթեւ մարդատար տաքսի" is wrong); **2-35** car = up to 8 seats (the shorter one);
  **2-62** "կողանցում" (passing in lane) = WITHOUT leaving the lane; **2-34** night = from the end of dusk
  to dawn, not the clock-time option; **2-69** (see the fact table).
- Stricter version: in two-option questions, the option whose word set strictly contains the other's
  (the "superset", e.g. "գծանշված **կամ չգծանշված**", "**եւ (կամ) կարգավորողի**", "կամ ճանապարհից
  **մերձակա տարածք**", "**անսպասելի**") is right **10/12** (chance 6.0); exceptions 2-16 and 2-65 (a truck
  is any goods vehicle, the "over 3.5 t" add-on is wrong). Pool-wide the superset rule is only 13/21, so it
  belongs to group 2.
- "բացառությամբ" (except) present in only one option: 5/7 (chance 3.3), exceptions 2-7, 2-35. The law
  defines by exclusion: passenger, pedestrian, parking, bicycle, car all use "բացառությամբ" in the
  correct version, and the wrong twin says "այդ թվում" or "ինչպես նաեւ" (2-6, 2-31, 2-71).

Over all of group 2 the plain "longest" rule is weaker: 35/68 (chance 27.2), because of the
both/all and number questions.

### 2c. Both / all listed (tell): 11/18 (chance 5.7)

The listed duties and inclusions are true; the false statements are outsiders. The 7 exceptions, as
false statements:

| Question | False statement (why "all" is wrong) |
|---|---|
| 2-10 | cyclists must wear goggles (only the helmet is required) |
| 2-23 | the seller or the last inspection station is responsible for the vehicle's condition (only owner/user) |
| 2-27 | a power of attorney must be carried (only licence + registration, or their digital versions) |
| 2-30 | any road user directing traffic is a "regulator" (only an authorised person) |
| 2-57 | (picture) only the left picture shows an intersection |
| 2-78 | the learner is liable for a violation (the instructor is) |
| 2-82 | ATVs may be used on public roads |

Decoded true lists: forced stop = traffic light, jam, breakdown/illness/load, all three (2-13);
pedestrian-equivalents = wheelchairs with or without motor at walking speed, people pushing carts, sleds,
prams, bicycles, mopeds, motorcycles (2-17, 2-36); before driving check brakes + steering + tread depth
(2-24); lend the car to police for an emergency AND to medics going your way (2-25); after a crash stop,
hazard lights, leave the objects (2-26); lane change both forms (2-59); sidewalk both forms (2-70);
licence right starts on receiving the card or its digital version (2-75).

---

## Group 8 - speed, towing, cargo, carrying people (55 questions)

### 8a. Fact sheet (41 of 55 questions, 0 contradictions)

| Fact | Questions |
|---|---|
| **60 km/h**: in settlements; organised groups of children; people in a truck body | 8-5, 8-4, 8-2, 8-35 |
| **90 km/h**: car outside settlements; truck <= 3.5 t outside settlements (8-38: the "50 + truck plate" sign does not apply to it); car with a trailer on a motorway | 8-1, 8-7, 8-38, 8-22 |
| **50 km/h**: any towing, flexible or not, anywhere | 8-12, 8-14, 8-17, 8-19, 8-26 |
| **20 km/h**: residential zone | 8-34, 8-37 |
| Tow distance: rigid **<= 4 m**, flexible **4-6 m** | 8-9, 8-23, 8-21 |
| On ice: flexible tow banned; rigid or partial loading allowed | 8-13, 8-16, 8-18 |
| Only motorcycles **with** a sidecar may be towed | 8-20, 8-25 (and 8-18 option 3 false) |
| People while towing: in a towed **car** or a towed truck's **cab**; never bus/trolleybus or towed truck body; in a body only on the **towing** truck; partial loading: towing truck's cab only | 8-11, 8-15, 8-33, 8-10, 8-24 |
| Towed vehicle: hazard lights on; without them, the warning triangle goes on the **rear of the towed** vehicle | 8-36, 8-8 |
| "Long load" sign needed when cargo sticks out more than **1 m** at the rear (1.2 yes, 0.6 no) or more than **0.4 m** at the side (0.5 yes, 0.3 no) | 8-51, 8-54, 8-48, 8-55 |
| Children: front seat without a child seat from **12**; under 12 not on a motorcycle's rear seat, not in an open-sided truck body | 8-28, 8-30, 8-50 |
| Nobody rides in a truck **trailer** | 8-29, 8-32 |
| B+C driver may carry up to **8** people in a truck | 8-49 |
| Warning sign outside settlements: **150-300 m** before the hazard | 8-3 |

(The 1 m / 0.4 m thresholds are the usual rulebook values. The pool only pins them between 0.6-1.2 m and
0.3-0.5 m, and never contradicts them.)

### 8b. Tells in group 8

- **5-option number question -> middle value**: 7/8 (chance 1.6). 8-1, 8-9, 8-12, 8-17, 8-19, 8-22, 8-26
  are all option 3 of a sorted list; exception 8-21 (4-6 m is option 4). In other groups only 1/3
  (4-4 yes; 7-6, 7-41 no). It duplicates the speed facts, but it gets those 7 questions without knowing
  anything.
- Both/all: 4/5 (chance 1.3); exception 8-20 (motorcycles without sidecar may NOT be towed). Lists 8-40,
  8-42, 8-47, 8-52 are all true. 8-42: exceeding the vehicle's design maximum, exceeding the speed sticker,
  crawling without need, braking sharply without need are ALL prohibited.
- "Allowed, if/only ..." options: 3/9 right (8-10, 8-16, 8-31). Group 8 is the one place where the
  qualified permission is often right, because towing and carrying people are permitted with conditions.
- No length tell (see the top).

---

## Group 9 - signals, beacons, lights, overtaking, rail crossings (119 questions)

### 9a. Fact sheet (45 questions, 0 contradictions)

| Fact | Questions |
|---|---|
| **Blue + siren**: just **yield** (the "slow down and yield" option is wrong). **Blue + red + siren**: **slow down and** yield, also to the escorted vehicles. Priority needs blue **and** siren together | 9-2, 9-15, 9-17, 9-24, 9-66 |
| Stationary vehicle with a **red** flashing beacon: stop, go on only when permitted | 9-1, 9-13 |
| **Yellow/orange** beacon: a warning only, no priority, you need not yield | 9-14, 9-22, 9-114 |
| Moon-white beacon + siren: to attract the attention of police and others | 9-23 |
| **Hazard lights**: accident; towed vehicle; forced stop where stopping is banned; dazzled by headlights (first action) | 9-51, 9-52, 9-54, 9-55, 9-69, 9-37 (+8-36) |
| Signal **in advance**; a **hand** signal stops just **before** the manoeuvre; the **indicator** stops just **after** it | 9-5, 9-6, 9-7, 9-10, 9-105 |
| General alarm = **1 long + 3 short** | 9-9, 9-11 |
| Dark: high **or** low beam; moped/motorcycle: low beam by day, always | 9-35, 9-39, 9-3, 9-36 |
| Dip the high beam at **>= 150 m**; rear fog lamp only in insufficient visibility; spotlight only outside settlements with no traffic either way | 9-41, 9-40, 9-42 |
| Rail crossing: machinery only in **transport position**; cross only at designated places; never open or bypass a barrier, even on duty | 9-44, 9-47, 9-45, 9-46 |
| No overtaking: at intersections (regulated or not, also on the main road), on pedestrian crossings, on rail crossings and **100 m** before them; start after the crossing | 9-26, 9-28, 9-29, 9-92, 9-25, 9-67, 9-81 |
| Warning sign in settlements **50-100 m**; warning triangle **15 m** in / **30 m** outside settlements | 9-43, 9-53 (+4-4, 4-55, 4-142, 8-3) |
| Horn only to prevent an accident | 9-38 (+4-146) |

### 9b. "Allowed?" -> "Արգելվում է" (tell)

Predicate: an option starts with `արգելվում է` and another starts with `թույլատրվում է`; pick
`արգելվում է`.

- Group 9: **17/22** (chance 8.6). Overtaking and rail-crossing subset: 13/17 (chance 6.7).
- Exceptions: 9-33, 9-74, 9-86 (pictures where overtaking IS allowed), 9-47 (machinery in transport
  position), 9-61 (yellow light: you may continue if you cannot stop without sharp braking).
- This is specific to group 9: the same rule in the other groups is 30/57 (chance 23.0).
- Related: the "allowed / yes, **if** ..." option is right only 5 of 29 times in group 9 (9-44, 9-47,
  9-61, 9-64, 9-87).

### 9c. Both/all: 10/13 (chance 4.0)

Exceptions as false statements: 9-28 "overtaking is banned 150 m before a rail crossing" (it is 100 m);
9-38 "horn in settlements to announce overtaking"; 9-40 "rear fog lamps in a convoy at night, in tunnels,
while unloading" (only in insufficient visibility). All other lists are fully true: rail crossing ->
barrier + lights + signs + attendant (9-48); regulated intersection = lights or regulator (9-57);
overtake on a 2-lane road only if the oncoming lane is free AND nobody is overtaking you (9-85).

### 9d. Obligatory signals (tell)

Bare "Պարտավոր է / Պարտադիր է" vs "not obligatory": **9/10** in these groups (2-5, 9-3, 9-65, 9-73,
9-98, 9-100, 9-106, 9-108, 9-113 right; exception **9-95**, a picture). Other groups: 14/19. The two
text exceptions to "always signal": the curve of a "Dangerous turn" sign (9-4), and 9-95.

---

## Group 10 - first aid (51 questions, 1 per exam)

### 10a. Fact sheet (28 questions, 0 contradictions)

| Fact | Questions |
|---|---|
| **Positions**: head injury -> half-lying, head and torso raised; fainting -> lying, **legs up**; asthma -> **half-sitting**; belly injury -> lying, **knees bent**; chest injury -> sitting, leaning on the **injured** side; unconscious but breathing -> **recovery position** on the side; spine -> on the back on a hard flat surface, do not move | 10-1, 10-9, 10-32, 10-30, 10-31, 10-13, 10-15, 10-42, 10-39 |
| **Numbers**: pulse **60-80**/min; breathing **12-18**/min; tourniquet max **1 h warm / 0.5 h cold**; cool a burn **20 min** | 10-19, 10-20, 10-43, 10-51 |
| **Order**: scene safety first (10-17); if the scene cannot be made safe, do not go near, call, keep others away (10-10); garage: open doors, engine off (10-23); wire on a victim: push it off with an insulator (10-28); wire on a car: people stay inside (10-35); then consciousness + breathing (10-11, 10-24); the unconscious victim first (10-2) | 10-17, 10-10, 10-23, 10-28, 10-35, 10-11, 10-24, 10-2 |
| **Bleeding**: spurting is the most dangerous (10-27); bright red spurting = artery, press it and put the tourniquet ABOVE the wound (10-45); veins / small arteries: pressure bandage at the wound (10-47); dark steady flow: raise the limb + pressure bandage (10-7); heavy bleeding: pressure bandage + press the artery (10-16) | 10-27, 10-45, 10-47, 10-7, 10-16 |
| Pedestrian hit by a low car: adult -> legs and head; child 3-5 -> pelvis and chest | 10-33, 10-34 |

### 10b. Tells

1. **Never pick a folk remedy or a harmful action** (elimination). Predicate on the option:
   `սպիրտ|յոդ|ալկոհոլ|ձեթ|մոխիր|քսուք|օղի|վալերիան|ապտակ|ջուր լցնել|շփել|տաքացնող|տաք ջեռակ|բացել (հեղուկով|բշտ)|հեռացնել օտար|մտցնել|կտրել|դեղեր`
   (alcohol, iodine, vodka, oil, ash, ointment, valerian, slapping, splashing water, rubbing with snow,
   warming compress, hot-water bottle, opening blisters, pulling out an impaled object, pushing organs back,
   cutting, drugs). **22 options in 14 questions, 0 correct.** Expected right goes from 4.2 to 8.7 of 14;
   10-36, 10-40, 10-48, 10-51 are fully solved. (I built this list after reading the group, so it is a
   content rule, not an independent test.)
2. **Longest option**: 31/50 (chance 15.8). After crossing out the folk options: **34/50**. When the
   longest is at least 30% longer than the runner-up: **17/22** (chance 7.0). The correct first-aid answer is
   the full procedure ("cool 20 min, do not open blisters, cover, do not bandage, give water"). After
   the folk cross-out it misses 16 of 50, but 12 of those are already in the fact sheet. On the 23
   questions the fact sheet does not cover it gets **19**. The 4 misses: 10-5 (seizure: do NOT touch, let
   it end), 10-8 (bruise: cold compress AND raise, not "below heart level"), 10-26 (diabetic who forgot the
   insulin: give sugar first), 10-46 (giving drugs is prohibited).
3. Cold, not heat, for injuries (10-8, 10-22, 10-41, 10-51); the one exception is frostbite: warm up, never
   rub with snow, no alcohol (10-40).

---

## Pool-wide "never pick" traps (elimination, checked on all 1,050 questions)

| Predicate on an option | Options | Correct | Questions |
|---|---|---|---|
| `30 ?կմ` (any "30 km/h" condition or value) | 18 | **0** | 4-36, 4-150, 6-42, 8-12, 8-14, 8-17, 8-19, 8-26, 8-34, 8-44 (x2), 9-27, 9-31, 9-32, 9-75, 9-82, 9-89, 9-90 |
| `հայեցողությ` (at the driver's discretion) | 6 | **0** | 7-55, 8-8, 9-45, 9-46, 9-101, 9-106 |
| `գնացք` ("if no train is coming") | 6 | **0** | 1-66, 9-46, 9-77, 9-78, 9-79, 9-80 |

The "30 km/h" one is the best story: the pool keeps offering "overtaking is allowed if the slow vehicle
goes under 30 km/h". That exemption does not exist, and 9-30 even puts it in the question ("if its speed
does not exceed 30 km/h") and the answer is still "prohibited". Elimination over the 28 affected
questions raises the expected score from 8.8 to 13.8; 8-44, 9-78 and 9-106 are fully solved.

## Cross-group fact: a truck of at most 3.5 t is treated as a passenger car

Truck signs and plates do not apply to it, car plates do, and it gets the car speed limit: 8-7 (90
outside settlements), 8-38 ("50" with a truck plate does not apply -> 90), 9-90 ("no overtaking for trucks"
does not apply -> may overtake), 4-93 ("80" with a car plate applies -> 80), 4-112 and 4-145 (truck
direction signs do not apply -> any direction), 4-119 and 4-167 (car plate covers it). **8 of 9**
consistent; the exception is **7-89**: a parking-method plate (half on the sidewalk) is for cars only, not
for a light truck. Options adding a 3.5 t condition are wrong in 4 of 5 cases (2-65, 4-36, 4-99, 4-151;
right only in 4-119).

## Near-duplicates and give-aways (no contradictions found)

Same fact asked more than once (learn once): 2-15 = 2-43; 2-29 = 2-44; 2-9 = 2-45; 2-17 + 2-36
(pedestrian-equivalents, both "all"); 2-37 is contained in 2-75; 8-2 = 8-35; 8-12 = 8-17 = 8-19 = 8-26 (+8-14);
8-9 = 8-23; 8-13 / 8-16 / 8-18; 8-15 = 8-33; 8-29 = 8-32; 8-20 / 8-25; 8-34 / 8-37; 9-1 = 9-13; 9-2 =
9-15; 9-7 = 9-10; 9-9 = 9-11; 9-25 = 9-67; 9-35 / 9-39; 9-44 = 9-47; 9-51 / 9-52 / 9-54 / 9-55; 9-97 =
1-132 (a signal gives no priority); 8-46 / 9-88 (the overtaken driver must not speed up); 10-15 / 10-42;
10-9 / 10-32; 10-30 / 10-31 / 10-32 share the same four positions (asthma / belly / faint).

Give-aways (one question's text answers another):

- 9-52's three options (accident, towed vehicle, forced stop in a no-stopping place) are all true, which
  answers 9-51, 9-55, 9-69 and 8-36.
- 8-47 option 4 says you must slow down for a vehicle with **blue and red** beacons + siren, which is 9-17.
  9-2 / 9-15 (blue only: just yield) are the contrast.
- 8-42 option 4 ("do not brake sharply unless needed") is the reason for 9-61 (continue on yellow if you
  cannot stop without sharp braking).
- 2-39 (international C at 21) answers 2-79 and 2-80.
- 2-31 (a bicycle excludes wheelchairs) agrees with 2-17 (wheelchair users are pedestrians).

Pairs that look like conflicts but are not: 9-2/9-15 vs 9-17 (blue only vs blue+red); 9-37 (dazzled:
hazard lights first) vs 8-47 (dazzled: slow down), which are steps of the same procedure; 8-27 option "rear
overhang 0.8 m" is a placement distractor, not the 1 m marking threshold of 8-51/8-54; 9-24/9-66 (priority
needs blue + siren) vs 9-17.

## Scripts (scratchpad only, `scratchpad/deep/tg/`)

`tg_common.py` (loader + rule scorer), `tg_tells.py` (length, superset), `tg_rules.py` / `tg_rules2.py`
(keyword rules, prohibited default, obligatory, folk remedies), `tg_both2.py` (both/all, definitions),
`tg_numeric.py` (position of the right value), `tg_facts.py` (pool-wide fact search),
`tg_verify_facts.py` (145 fact claims, 0 mismatches), `tg_elim.py`, `tg_cond.py`, `tg_combined.py`,
`tg_dups.py`. Run from the repo root with `uv run python <path>`; each takes about 1 s.
