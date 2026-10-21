# Answer shortcuts in the Armenian theory exam (A/B/C pool, 1,050 questions)

Analysis run 2026-10-21 on `data/questions.json`. Raw results: `results/patterns.json`. Interactive
report: `reports/patterns_report.html`. Rebuild: `uv run python scripts/mine_patterns.py` (~30-45 s),
then `uv run python scripts/build_pattern_report.py` (~2 s, after the first run ~13 s).

## Verdict

**No trick gets anywhere near a pass. You have to learn the questions.** The exam needs 18 of 20.
Guessing everything scores 7.2 of 20 on average, the best rule list 8.1.

Answers to learn (in the best order) for a given pass chance, by what you do with the rest:

| What you do with the questions you did not learn | Score if you learn nothing | 50% | 80% | 90% | 95% | 99% |
|---|---|---|---|---|---|---|
| Guess | 7.2 / 20 | 763 | 872 | 920 | 952 | 997 |
| Always the usual position, learn its exceptions (needs PDF option order) | 7.7 / 20 | 498 | 558 | 582 | 598 | 620 |
| Rule list + usual position, learn the exceptions (needs PDF option order) | 8.1 / 20 | 476 | 536 | 560 | 576 | 598 |
| Content rules, guess the rest (works if options are shuffled) | 7.9 / 20 | 646 | 745 | 793 | 825 | 870 |

Read the middle rows with care. Almost all of their saving is not a pattern: **any** fixed choice
(even "always option 1") is right on about 1 in k questions, so if you learn exactly the questions
where your fixed choice fails, the rest answer themselves. The real patterns add only **22 answers**
of saving at 95% on top of that (598 -> 576). The trick also needs two things that may not hold:
the computer test must show the options in PDF order (not verified), and you must reliably know
which questions you learned as exceptions. If the options are shuffled, the honest row is the last:
the content rules save about 120 answers compared with guessing.

The simpler way to see it: if you know a share of every section and guess the rest,

| Share known | 80% | 85% | 90% | 92% | 94% | 95% | 96% | 98% |
|---|---|---|---|---|---|---|---|---|
| P(pass) | 52% | 70% | 87% | 92% | 96% | 97.5% | 98.6% | 99.8% |

## What carries a (small) signal

Scored against each question's own guess chance (1/k; options vary from 2 to 5). Whole pool:

| Rule | Fires | Right | Guessing gets | Lift | Survives Bonferroni (14 rules) |
|---|---|---|---|---|---|
| The only option starting "Արգելվում" (prohibited) | 90 | 52 | 35.4 | 1.47 | yes |
| The only option without "միայն" when 2+ others have it | 79 | 38 | 25.2 | 1.51 | yes |
| 3 options: the last (needs PDF order) | 568 | 229 | 189.3 | 1.21 | yes |
| The only "all / both" option (բոլոր, երկու դեպքում ...) | 154 | 62 | 47.4 | 1.31 | no (p 0.007) |
| 5 options: the third (needs PDF order) | 49 | 18 | 9.8 | 1.84 | no (p 0.005) |
| The longest option | 901 | 354 | 334.2 | 1.06 | no |

Nothing else beat guessing: the shortest option, "Թույլատրվում" (permitted), the largest/smallest/
middle number, 2-option position (exactly 50/50: 144 vs 143.5). Options with "միայն" (only) are right
24% of the time against 32% if average: a weak hint to look twice, not a rule.

Held out (5-fold cross-validation, folds grouped by wording so that twin questions never sit on
both sides): the rule list fires on 393 questions and gets 172 right where guessing gets 124 (lift
1.39). The usual-position fallback is no better than guessing held out (253 vs 255). A model that
weighs every option word does 395 vs 325, but its top words are content ("70կմ", "վազանց"): it
memorizes, it does not find tricks.

## What to learn first

Each test draws by section (Decision 385-Ն, point 17), so a question's chance of being on your test
depends on its group:

| Section | PDF group | Questions | Per test | Chance per question |
|---|---|---|---|---|
| Faults / conditions prohibiting driving | 3 | 59 | 2 | 3.4% |
| Road Traffic Safety Law | 2 | 82 | 2 | 2.4% |
| First aid | 10 | 51 | 1 | 2.0% |
| Traffic rules | 1, 4-9 | 858 | 15 | 1.7% (if drawn evenly) |

So: group 3 first (59 short text questions, twice as likely per question as a traffic-rule
question), then group 2, then group 10, then the traffic rules. The ordered list is
`strategies.guess.study_order` in `results/patterns.json`.

## Caveats

- Whether the computer test keeps the PDF option order is unknown. Position rules and the
  "exceptions" trick depend on it; the content rules do not.
- The law gives no quota per group inside the traffic rules; the model draws those 15 evenly from
  all 858. A fixed quota per group would shift the chances per question a little.
- The 3 psychological questions are not in the pool and are assumed passed.
- The rules were chosen after looking at the data; the held-out numbers are the honest ones.
