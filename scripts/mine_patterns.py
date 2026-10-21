"""Answer shortcuts ("patterns") in the 1,050 A/B/C questions: what works, by how much, and what it saves.

    uv run python scripts/mine_patterns.py   # ~30-45 s (measured 29-43 s), writes results/patterns.json

The JSON is the record; scripts/build_pattern_report.py turns it into reports/patterns_report.html.

Questions have 2-5 options, so every rule is scored against each question's own guess chance (1/k):
"expected" = sum of 1/k over the questions where the rule fires. Measured per rule: fires, right,
expected, precision, lift (right / expected), Wilson 95% CI, exact one-sided p-value of doing this
well by guessing (Poisson-binomial), Bonferroni flag.

Honest numbers need held-out scoring: 26% of the questions share their wording with another one, so
cross-validation folds are grouped by normalized question text (twins never sit on both sides).
The decision list and the word model are re-mined on each training split and scored on the held-out
split; the held-out predictions feed the exam model.

Exam model (Decision 385-Ն, point 17; _knowledge/exam_rules.md): 2 of group 2 (82), 2 of group 3 (59),
1 of group 10 (51), 15 of groups 1 and 4-9 (858, assumed drawn evenly: the law gives no per-group
quota), pass = at least 18 of 20. P(pass) is exact: per section a dynamic program over "which
questions are drawn" (without replacement, each question with its own chance of being answered
right), then the four sections are convolved.

Position rules ("in 3-option questions pick the last") only help if the computer test shows the
options in PDF order, which is not verified, so the strategies are scored twice: order kept, and
shuffled (position rules off, everything else on).
"""

import json
import math
import random
import re
import time
import unicodedata
from collections import Counter, defaultdict

import numpy as np

from common import DATA, ROOT, setup_logging

log = setup_logging("mine_patterns")

SEED = 509
K_FOLDS = 5
PASS_MARK = 18
PASS_TARGETS = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99]
SECTIONS = {  # name: (groups, questions drawn per test)
    "law": ((2,), 2),
    "faults": ((3,), 2),
    "first_aid": ((10,), 1),
    "traffic_rules": ((1, 4, 5, 6, 7, 8, 9), 15),
}
MIN_SUPPORT = 8          # a rule must fire on at least this many training questions to enter the list
MIN_LIFT = 1.3           # ... and beat guessing by 30% on them
MIN_TOKEN_OPTIONS = 6    # a word needs this many options to get a weight
ALPHA = 0.05

STOPWORDS = set("""
է են էր էին եւ կամ որ ի ու այն այդ այս իր նրա նրանց մեջ համար հետ վրա մինչեւ դեպի կողմից միայն
թե եթե ոչ չէ չեն բոլոր բոլորը երկու դեպքում դեպքերում պետք
""".split())
STOPWORDS.discard("միայն")  # "only" is a candidate signal, keep it as a feature


# ---------------------------------------------------------------- text helpers

def norm(s: str) -> str:
    s = unicodedata.normalize("NFC", s).replace("և", "եւ").lower()
    return re.sub("[՛՜՞]", "", s)  # emphasis, exclamation, question marks sit inside words


def tokens(s: str) -> list[str]:
    return [t for t in re.findall(r"[\w]+", norm(s)) if t not in STOPWORDS and not t.isdigit()]


NUM_RE = re.compile(r"\d+(?:[.,]\d+)?")


def numeric_values(q) -> list[float] | None:
    vals = []
    for o in q["options"]:
        m = NUM_RE.findall(o)
        if len(m) != 1:
            return None
        vals.append(float(m[0].replace(",", ".")))
    return vals if len(set(vals)) == len(vals) else None


def unique_index(flags: list[bool]):
    hits = [i for i, f in enumerate(flags) if f]
    return hits[0] if len(hits) == 1 else None


# ---------------------------------------------------------------- picker rules
# Each returns the index of the option it picks, or None if it does not fire.

ALL_RE = re.compile(r"բոլոր|երկու դեպքում|երկուսն էլ|երկու պատասխան")
NONE_RE = re.compile(r"ոչ մեկ|ոչ մի ")
PICTURE_LABEL = re.compile(r"^[\dA-ZԱ-Ֆa-z]{1,2}$")


def is_picture_label(q) -> bool:
    return all(PICTURE_LABEL.match(o.strip()) for o in q["options"])


def r_position(k: int, pos: int):
    return lambda q: pos if len(q["options"]) == k else None


def r_longest(q):
    lens = [len(o) for o in q["options"]]
    return unique_index([n == max(lens) for n in lens])


def r_shortest(q):
    lens = [len(o) for o in q["options"]]
    return unique_index([n == min(lens) for n in lens])


def r_all_both(q):
    return unique_index([bool(ALL_RE.search(norm(o))) for o in q["options"]])


def r_prohibited(q):
    return unique_index([norm(o).startswith("արգելվում") for o in q["options"]])


def r_permitted(q):
    return unique_index([norm(o).startswith("թույլատրվում") for o in q["options"]])


def r_without_only(q):
    flags = ["միայն" in norm(o) for o in q["options"]]
    return unique_index([not f for f in flags]) if sum(flags) >= 2 else None


def r_numeric(which: str):
    def rule(q):
        vals = numeric_values(q)
        if vals is None or len(vals) < 3:
            return None
        order = sorted(range(len(vals)), key=lambda i: vals[i])
        return {"min": order[0], "max": order[-1], "second_highest": order[-2],
                "middle": order[len(order) // 2] if len(order) % 2 else None}[which]
    return rule


RULES = {
    # name: (function, depends on option order, description)
    "pos_2_first": (r_position(2, 0), True, "2 options: the first"),
    "pos_3_last": (r_position(3, 2), True, "3 options: the last"),
    "pos_4_second": (r_position(4, 1), True, "4 options: the second"),
    "pos_5_third": (r_position(5, 2), True, "5 options: the third"),
    "longest": (r_longest, False, "the longest option"),
    "shortest": (r_shortest, False, "the shortest option"),
    "all_both": (r_all_both, False, "the only 'all / both' option (բոլոր, երկու դեպքում ...)"),
    "prohibited": (r_prohibited, False, "the only option starting 'Արգելվում'"),
    "permitted": (r_permitted, False, "the only option starting 'Թույլատրվում'"),
    "without_only": (r_without_only, False, "the only option without 'միայն' when 2+ others have it"),
    "numeric_min": (r_numeric("min"), False, "numbers: the smallest"),
    "numeric_max": (r_numeric("max"), False, "numbers: the largest"),
    "numeric_second_highest": (r_numeric("second_highest"), False, "numbers: the second highest"),
    "numeric_middle": (r_numeric("middle"), False, "numbers: the middle one (odd count)"),
}


# ---------------------------------------------------------------- statistics

def wilson(hits: int, n: int, z: float = 1.96):
    if n == 0:
        return (0.0, 0.0)
    p = hits / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (round(c - h, 3), round(c + h, 3))


def poisson_binomial_tail(ps: list[float], k: int) -> float:
    """P(at least k successes) for independent trials with success chances ps."""
    dist = np.zeros(len(ps) + 1)
    dist[0] = 1.0
    for p in ps:
        dist[1:] = dist[1:] * (1 - p) + dist[:-1] * p
        dist[0] *= 1 - p
    return float(dist[k:].sum())


def score_rule(qs, fn) -> dict:
    fired = [(q, fn(q)) for q in qs]
    fired = [(q, i) for q, i in fired if i is not None]
    right = sum(i == q["answer_index"] for q, i in fired)
    ps = [1 / len(q["options"]) for q, _ in fired]
    n = len(fired)
    return {
        "fires": n, "right": right, "expected": round(sum(ps), 1),
        "precision": round(right / n, 3) if n else None,
        "lift": round(right / sum(ps), 2) if n else None,
        "ci95": wilson(right, n),
        "p_value": poisson_binomial_tail(ps, right) if n else None,
    }


# ---------------------------------------------------------------- folds, word model, decision list

def folds(qs) -> list[int]:
    groups = sorted({norm(q["question"]) for q in qs})
    random.Random(SEED).shuffle(groups)
    fold_of_group = {g: i % K_FOLDS for i, g in enumerate(groups)}
    return [fold_of_group[norm(q["question"])] for q in qs]


def train_word_weights(train) -> dict[str, float]:
    """Smoothed log-ratio of P(correct | word in option) against each option's guess chance."""
    seen, right, expected = Counter(), Counter(), Counter()
    for q in train:
        k = len(q["options"])
        for i, o in enumerate(q["options"]):
            for t in set(tokens(o)):
                seen[t] += 1
                expected[t] += 1 / k
                right[t] += i == q["answer_index"]
    return {t: math.log((right[t] + 1) / (expected[t] + 1))
            for t in seen if seen[t] >= MIN_TOKEN_OPTIONS}


def word_pick(q, weights) -> int | None:
    scores = [sum(weights.get(t, 0.0) for t in set(tokens(o))) for o in q["options"]]
    return unique_index([s == max(scores) for s in scores]) if any(scores) else None


def build_decision_list(train, allow_order: bool) -> list[str]:
    """Greedy: repeatedly take the rule with the most net extra hits over guessing on the training
    questions not yet covered, if it fires often enough and beats guessing by MIN_LIFT."""
    chosen, remaining = [], list(train)
    candidates = {n: f for n, (f, order, _) in RULES.items() if allow_order or not order}
    while True:
        best = None
        for name, fn in candidates.items():
            if name in chosen:
                continue
            s = score_rule(remaining, fn)
            if s["fires"] < MIN_SUPPORT or s["lift"] < MIN_LIFT:
                continue
            gain = s["right"] - s["expected"]
            if best is None or gain > best[1]:
                best = (name, gain)
        if best is None:
            return chosen
        chosen.append(best[0])
        fn = RULES[best[0]][0]
        remaining = [q for q in remaining if fn(q) is None]


def best_positions(train) -> dict[int, int]:
    """Per option count, the answer position seen most often (ties: the earlier position)."""
    out = {}
    for k in range(2, 6):
        c = Counter(q["answer_index"] for q in train if len(q["options"]) == k)
        out[k] = min(range(k), key=lambda p: (-c[p], p))
    return out


def apply_list(q, names, fallback: dict[int, int] | None = None):
    for n in names:
        i = RULES[n][0](q)
        if i is not None:
            return n, i
    if fallback is not None:
        return "fallback_position", fallback[len(q["options"])]
    return None, None


# ---------------------------------------------------------------- exam model

def section_of(q) -> str:
    return next(s for s, (groups, _) in SECTIONS.items() if q["group"] in groups)


def section_score_dist(ps: list[float], m: int) -> np.ndarray:
    """Score distribution when m of these questions are drawn without replacement."""
    f = np.zeros((m + 1, m + 1))
    f[0, 0] = 1.0
    for p in ps:
        g = f.copy()
        g[1:, :] += f[:-1, :] * (1 - p)
        g[1:, 1:] += f[:-1, :-1] * p
        f = g
    return f[m] / math.comb(len(ps), m)


def pass_probability(p_by_section: dict[str, list[float]]) -> tuple[float, float]:
    total = np.array([1.0])
    for s, (_, m) in SECTIONS.items():
        total = np.convolve(total, section_score_dist(p_by_section[s], m))
    return float(total[PASS_MARK:].sum()), float((total * np.arange(len(total))).sum())


def memorize_curve(qs, p_strategy: dict[str, float]) -> dict:
    """Memorize in order of value (chance of being drawn x chance of being missed); P(pass) after
    each step on a grid, then the smallest count reaching each target."""
    draw = {s: m / sum(section_of(q) == s for q in qs) for s, (_, m) in SECTIONS.items()}
    order = sorted(qs, key=lambda q: (-draw[section_of(q)] * (1 - p_strategy[q["id"]]), q["group"], q["number"]))
    pos = {q["id"]: i for i, q in enumerate(order)}

    def evaluate(n_known: int):
        p_by = defaultdict(list)
        for q in qs:
            p_by[section_of(q)].append(1.0 if pos[q["id"]] < n_known else p_strategy[q["id"]])
        return pass_probability(p_by)

    grid = list(range(0, len(qs) + 1, 10)) + [len(qs)]
    curve = {n: evaluate(n) for n in sorted(set(grid))}
    needed = {}
    for t in PASS_TARGETS:
        hi = next((n for n in sorted(curve) if curve[n][0] >= t), None)
        if hi is None:
            needed[str(t)] = None
            continue
        lo = max(0, hi - 10)
        needed[str(t)] = next(n for n in range(lo, hi + 1) if evaluate(n)[0] >= t)
    hi = next(n for n in sorted(curve) if curve[n][1] >= PASS_MARK)
    needed["expected_18"] = next(n for n in range(max(0, hi - 10), hi + 1) if evaluate(n)[1] >= PASS_MARK)
    return {"order": [q["id"] for q in order],
            "curve": [{"known": n, "p_pass": round(curve[n][0], 4), "expected": round(curve[n][1], 2)}
                      for n in sorted(curve)],
            "needed": needed}


# ---------------------------------------------------------------- group 3: conditions, not options
# Every group-3 question reads "operating is prohibited if: A / B / both" (3 have A / B / C / all), so
# each question says, per listed condition, whether it prohibits: answer A -> A yes, B no; "both" ->
# both yes. Scoring options would miss that a wrong option can still be a prohibiting condition.

DESIGN_RE = re.compile(r"կառուցվածքով\s+(չ)?նախատեսված")
BOTH_RE = re.compile(r"երկու|բոլոր")
# One condition worded two ways in Armenian; the official English PDF has "The horn does not operate"
# in all four questions (3-15, 3-35, 3-42, 3-49), so they are compared as one.
SAME_CONDITION = {
    "չի աշխատում ձայնարկիչը": "չի աշխատում ձայնային ազդանշանի սարքը",
    "ձայնային ազդանշանի սարքով տրվող ազդանշանը չի աշխատում": "չի աշխատում ձայնային ազդանշանի սարքը",
}


def condition_key(text: str) -> str:
    t = re.sub(r"^եթե\s+", "", norm(text)).rstrip("։:.․ ")
    return SAME_CONDITION.get(t, t)


def group3_analysis(qs) -> dict:
    g3 = [q for q in qs if q["group"] == 3]
    conds = []
    for q in g3:
        *cs, last = q["options"]
        if not BOTH_RE.search(norm(last)):
            raise ValueError(f"{q['id']}: last option {last!r} is not 'both/all'; group 3 layout changed")
        for i, c in enumerate(cs):
            conds.append({"qid": q["id"], "text": c, "key": condition_key(c),
                          "prohibits": q["answer_index"] in (i, len(cs))})
    labels = defaultdict(set)
    for c in conds:
        labels[c["key"]].add(c["prohibits"])
    contradictions = [{"condition": k, "questions": [c["qid"] for c in conds if c["key"] == k]}
                      for k, v in sorted(labels.items()) if len(v) > 1]
    design = [c for c in conds if DESIGN_RE.search(norm(c["text"]))]
    fired = [q for q in g3 if any(DESIGN_RE.search(norm(o)) for o in q["options"][:-1])]
    last = lambda q: len(q["options"]) - 1
    return {
        "questions": len(g3),
        "answer_both_or_all": sum(q["answer_index"] == last(q) for q in g3),
        "conditions": len(conds),
        "conditions_prohibiting": sum(c["prohibits"] for c in conds),
        "distinct_conditions": len(labels),
        "contradictions": contradictions,
        "design_rule": {
            "conditions": len(design),
            "prohibiting": sum(c["prohibits"] for c in design),
            "questions_fired": len(fired),
            "answer_both": sum(q["answer_index"] == last(q) for q in fired),
            "answer_design_option": sum(q["answer_index"] != last(q) and bool(DESIGN_RE.search(norm(q["options"][q["answer_index"]])))
                                        for q in fired),
            "answer_other_single": sum(q["answer_index"] != last(q) and not DESIGN_RE.search(norm(q["options"][q["answer_index"]]))
                                       for q in fired),
        },
        "not_prohibiting": sorted({c["text"].rstrip("։:. ") for c in conds
                                   if labels[c["key"]] == {False}}, key=norm),
    }


# ---------------------------------------------------------------- main

def main() -> None:
    t0 = time.time()
    qs = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    for q in qs:
        q["picture_label"] = is_picture_label(q)
    out = {"n": len(qs), "seed": SEED, "pass_mark": PASS_MARK}

    # pool facts
    out["pool"] = {
        "options": dict(sorted(Counter(len(q["options"]) for q in qs).items())),
        "with_picture": sum(bool(q["image"]) for q in qs),
        "picture_label_questions": sum(q["picture_label"] for q in qs),
        "sections": {s: {"groups": list(g), "questions": sum(section_of(q) == s for q in qs), "drawn": m,
                         "draw_chance": round(m / sum(section_of(q) == s for q in qs), 4)}
                     for s, (g, m) in SECTIONS.items()},
        "guess_expected_per_test": None,
    }
    out["positions"] = {
        k: {"questions": len(sub), "answer_share": {p + 1: round(sum(q["answer_index"] == p for q in sub) / len(sub), 3)
                                                   for p in range(k)}}
        for k in range(2, 6) for sub in [[q for q in qs if len(q["options"]) == k]]
    }

    # every rule on the whole pool (descriptive; picked after looking at the data, see held-out below)
    rule_rows = []
    for name, (fn, order, desc) in RULES.items():
        s = score_rule(qs, fn)
        rule_rows.append({"rule": name, "description": desc, "needs_option_order": order, **s})
    for r in rule_rows:
        r["significant_bonferroni"] = r["p_value"] is not None and r["p_value"] < ALPHA / len(rule_rows)
        r["p_value"] = None if r["p_value"] is None else float(f"{r['p_value']:.3g}")
    out["rules"] = sorted(rule_rows, key=lambda r: (-(r["right"] - r["expected"]), r["rule"]))

    # cross-out signals: share of options with a feature that are correct, vs their guess chance
    feats = {
        "contains 'միայն' (only)": lambda o: "միայն" in norm(o),
        "contains 'ոչ մի / ոչ մեկ' (none)": lambda o: bool(NONE_RE.search(norm(o) + " ")),
        "contains 'եթե' (if)": lambda o: re.search(r"(^|\s)եթե(\s|$)", norm(o)) is not None,
        "contains 'բոլոր' (all)": lambda o: "բոլոր" in norm(o),
        "starts 'Ոչ' (No)": lambda o: norm(o).startswith("ոչ"),
        "starts 'Այո' (Yes)": lambda o: norm(o).startswith("այո"),
    }
    crossout = []
    for name, f in feats.items():
        n = right = 0
        expected = 0.0
        for q in qs:
            for i, o in enumerate(q["options"]):
                if f(o):
                    n += 1
                    right += i == q["answer_index"]
                    expected += 1 / len(q["options"])
        crossout.append({"feature": name, "options": n, "correct": right, "expected": round(expected, 1),
                         "share_correct": round(right / n, 3) if n else None, "ci95": wilson(right, n)})
    out["crossout"] = crossout
    out["group3"] = group3_analysis(qs)
    g3 = out["group3"]
    log.info(f"group 3: {g3['conditions_prohibiting']}/{g3['conditions']} conditions prohibit; 'provided by design' "
             f"{g3['design_rule']['prohibiting']}/{g3['design_rule']['conditions']}; contradictions {g3['contradictions']}")

    # held-out: decision lists and word model, grouped folds
    fold = folds(qs)
    held = {"order_kept": {}, "shuffled": {}, "words": {}, "position_only": {}}
    lists = {"order_kept": [], "shuffled": []}
    word_tops = []
    for f in range(K_FOLDS):
        train = [q for q, g in zip(qs, fold) if g != f]
        test = [q for q, g in zip(qs, fold) if g == f]
        for variant, allow in [("order_kept", True), ("shuffled", False)]:
            names = build_decision_list(train, allow)
            lists[variant].append(names)
            # order kept: when no rule fires, the most frequent answer position for that option count
            # beats a random guess at no cost; shuffled: guess
            fallback = best_positions(train) if allow else None
            for q in test:
                held[variant][q["id"]] = apply_list(q, names, fallback)
        # baseline for the "memorize only what your fixed rule gets wrong" effect: no content rules,
        # just the most frequent position; any fixed pick gets about 1/k right for free
        positions = best_positions(train)
        for q in test:
            held["position_only"][q["id"]] = ("fallback_position", positions[len(q["options"])])
        w = train_word_weights(train)
        word_tops.append(sorted(w.items(), key=lambda kv: (-abs(kv[1]), kv[0]))[:15])
        for q in test:
            held["words"][q["id"]] = word_pick(q, w)

    def heldout_summary(pred: dict) -> dict:
        fired = [(q, pred[q["id"]]) for q in qs if pred[q["id"]] is not None]
        right = sum(i == q["answer_index"] for q, i in fired)
        exp = sum(1 / len(q["options"]) for q, _ in fired)
        return {"fires": len(fired), "right": right, "expected": round(exp, 1),
                "precision": round(right / len(fired), 3) if fired else None,
                "lift": round(right / exp, 2) if fired else None}

    out["heldout"] = {
        "decision_list_order_kept": {**heldout_summary({k: v[1] for k, v in held["order_kept"].items()
                                                         if v[0] != "fallback_position"} | {
                                         k: None for k, v in held["order_kept"].items() if v[0] == "fallback_position"}),
                                     "lists_per_fold": lists["order_kept"]},
        "fallback_position": heldout_summary({k: (v[1] if v[0] == "fallback_position" else None)
                                              for k, v in held["order_kept"].items()}),
        "decision_list_shuffled": {**heldout_summary({k: v[1] for k, v in held["shuffled"].items()}),
                                   "lists_per_fold": lists["shuffled"]},
        "word_model": {**heldout_summary(held["words"]),
                       "top_words_per_fold": [[(t, round(v, 2)) for t, v in top] for top in word_tops]},
    }
    full_lists = {v: build_decision_list(qs, allow) for v, allow in [("order_kept", True), ("shuffled", False)]}
    out["decision_list_full_pool"] = {v: [{"rule": n, "description": RULES[n][2]} for n in names]
                                      for v, names in full_lists.items()}
    out["decision_list_full_pool"]["order_kept_fallback"] = {str(k): p + 1 for k, p in best_positions(qs).items()}

    # strategies -> per-question chance of a right answer without memorizing (held-out predictions)
    guess = {q["id"]: 1 / len(q["options"]) for q in qs}
    strategies = {"guess": guess}
    for variant in ("position_only", "order_kept", "shuffled"):
        strategies[variant if variant == "position_only" else f"rules_{variant}"] = {
            q["id"]: (1.0 if held[variant][q["id"]][1] == q["answer_index"] else 0.0)
            if held[variant][q["id"]][1] is not None else guess[q["id"]] for q in qs}
    out["strategies"] = {}
    for name, p in strategies.items():
        p_by = defaultdict(list)
        for q in qs:
            p_by[section_of(q)].append(p[q["id"]])
        p_pass, expected = pass_probability(p_by)
        mc = memorize_curve(qs, p)
        out["strategies"][name] = {"p_pass_nothing_memorized": p_pass, "expected_score_nothing_memorized": round(expected, 2),
                                   "memorize_needed": mc["needed"], "curve": mc["curve"],
                                   "study_order": mc["order"] if name != "guess" else None}
        log.info(f"{name}: nothing memorized -> expected {expected:.2f}/20, P(pass) {p_pass:.2e}; "
                 f"memorize for 50/80/95%: {mc['needed']['0.5']}/{mc['needed']['0.8']}/{mc['needed']['0.95']}")
    out["strategies"]["guess"]["study_order"] = memorize_curve(qs, guess)["order"]
    out["pool"]["guess_expected_per_test"] = out["strategies"]["guess"]["expected_score_nothing_memorized"]

    # "know a share of everything" view: P(pass) if you know a random fraction x of each section
    out["know_fraction"] = []
    for x in [0.8, 0.85, 0.9, 0.92, 0.94, 0.95, 0.96, 0.98, 1.0]:
        p_by = defaultdict(list)
        for q in qs:
            p_by[section_of(q)].append(x + (1 - x) / len(q["options"]))
        p_pass, expected = pass_probability(p_by)
        out["know_fraction"].append({"known_share": x, "p_pass": round(p_pass, 4), "expected": round(expected, 2)})

    (ROOT / "results").mkdir(exist_ok=True)
    (ROOT / "results" / "patterns.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in out["rules"][:8]:
        log.info(f"rule {r['rule']:24s} fires {r['fires']:4d} right {r['right']:4d} expected {r['expected']:6.1f} "
                 f"lift {r['lift']} p {r['p_value']} {'*' if r['significant_bonferroni'] else ''}")
    for k, v in out["heldout"].items():
        log.info(f"held-out {k}: fires {v['fires']} right {v['right']} expected {v['expected']} lift {v['lift']}")
    log.info(f"full-pool lists: {full_lists}")
    for row in out["know_fraction"]:
        log.info(f"know {row['known_share']:.0%} of each section -> P(pass) {row['p_pass']:.3f}")
    log.info(f"done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
