"""Build reports/patterns_report.html from results/patterns.json (see mine_patterns.py).

    uv run python scripts/build_pattern_report.py   # ~3 s, no recomputation

One standalone file (plotly inlined, no CDN), table of contents on top, every section collapsible.
"""

import html
import json
import time

import plotly.graph_objects as go

from common import ROOT, setup_logging

log = setup_logging("build_pattern_report")

RED, BLUE, ORANGE, GREY = "#D90012", "#0033A0", "#F2A800", "#7a7a7a"
STRATEGY_LABELS = {
    "guess": "Guess what you did not learn",
    "position_only": "Always the usual position, learn its exceptions (needs PDF option order)",
    "rules_order_kept": "Rule list + usual position, learn the exceptions (needs PDF option order)",
    "rules_shuffled": "Content rules, guess the rest (works with shuffled options)",
}
STRATEGY_COLORS = {"guess": GREY, "position_only": ORANGE, "rules_order_kept": RED, "rules_shuffled": BLUE}
SECTION_LABELS = {"law": "Road Traffic Safety Law", "faults": "Faults / conditions prohibiting driving",
                  "first_aid": "First aid", "traffic_rules": "Traffic rules"}

_first_fig = True


def fig_html(fig: go.Figure) -> str:
    global _first_fig
    fig.update_layout(template="plotly_white", margin=dict(l=60, r=40, t=50, b=60), height=420,
                      font=dict(family="Segoe UI, Arial, sans-serif", size=13))
    out = fig.to_html(full_html=False, include_plotlyjs="inline" if _first_fig else False,
                      config={"displaylogo": False})
    _first_fig = False
    return out


def table(headers: list[str], rows: list[list], widths: list[int]) -> str:
    cols = "".join(f'<col style="width:{w}%">' for w in widths)
    head = "".join(f"<th>{html.escape(h)}</th>" for h in headers)
    body = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f"<table><colgroup>{cols}</colgroup><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def section(sid: str, title: str, body: str) -> tuple[str, str]:
    return (f'<li><a href="#{sid}">{html.escape(title)}</a></li>',
            f'<details open id="{sid}"><summary>{html.escape(title)}</summary><div class="body">{body}</div></details>')


def main() -> None:
    t0 = time.time()
    r = json.loads((ROOT / "results" / "patterns.json").read_text(encoding="utf-8"))
    st = r["strategies"]
    parts = []

    # 1. verdict
    targets = ["0.5", "0.8", "0.9", "0.95", "0.99"]
    rows = [[STRATEGY_LABELS[k], f"{v['expected_score_nothing_memorized']:.1f} / 20",
             *[str(v["memorize_needed"][t]) for t in targets]] for k, v in st.items()]
    verdict = (
        "<p><b>No trick gets close to passing.</b> The exam needs 18 of 20 right. Guessing everything gives "
        f"{st['guess']['expected_score_nothing_memorized']:.1f} of 20 on average; the best rule list "
        f"{st['rules_order_kept']['expected_score_nothing_memorized']:.1f}. Below: how many of the "
        f"{r['n']} answers you have to learn (in the best order) for a given pass chance, depending on what you "
        "do with the rest.</p>"
        + table(["What you do with the questions you did not learn", "Score if you learn nothing",
                 "Learn for 50%", "80%", "90%", "95%", "99%"], rows, [40, 12, 12, 9, 9, 9, 9])
        + "<p><b>Where the savings really come from.</b> The two middle rows look much cheaper than guessing, but "
        "almost all of that is not a pattern: any fixed choice (even \"always option 1\") is right on about 1 in "
        "k questions, so if you learn exactly the questions where your fixed choice fails, the rest answer "
        "themselves. Compare the two: the content rules add only "
        f"{st['position_only']['memorize_needed']['0.95'] - st['rules_order_kept']['memorize_needed']['0.95']} "
        "answers of saving at 95%. And the trick needs two things: the computer test must show the options in "
        "PDF order (not verified), and you must reliably remember <i>which</i> questions you learned as "
        "exceptions. If options are shuffled, the honest row is the last one.</p>")
    parts.append(section("verdict", "Verdict", verdict))

    # 1b. group 3 conditions
    g3 = r["group3"]
    d = g3["design_rule"]
    contra = "".join(f"<li>{html.escape(c['condition'])}: questions {', '.join(c['questions'])}</li>" for c in g3["contradictions"])
    ok_list = "".join(f"<li>{html.escape(t)}</li>" for t in g3["not_prohibiting"])
    parts.append(section("group3", "Group 3: the rule that is never wrong",
                         f"<p>All {g3['questions']} questions of group 3 (faults and conditions that prohibit driving, 2 per "
                         "test) read \"operating is prohibited if: A / B / both\". So each question says, condition by "
                         f"condition, whether it prohibits. Of {g3['conditions']} conditions, {g3['conditions_prohibiting']} "
                         f"prohibit ({g3['conditions_prohibiting'] / g3['conditions']:.0%}): <b>prohibited is the default</b>.</p>"
                         f"<p><b>Every condition with \"կառուցվածքով նախատեսված / չնախատեսված\" (provided / not provided by "
                         f"the design) prohibits: {d['prohibiting']} of {d['conditions']}.</b> It appears in {d['questions_fired']} "
                         f"questions; there the answer is never the other single condition ({d['answer_other_single']} times), "
                         f"it is \"both\" {d['answer_both']} times and that condition {d['answer_design_option']} times.</p>"
                         f"<p>Contradiction in the official key (the official English says \"The horn does not operate\" in all "
                         f"of them):</p><ul>{contra}</ul><p>In 3-42 the answer is 1, i.e. a broken horn would not prohibit; "
                         "in the other three it does. Learn 3-42 as an exception.</p>"
                         f"<details><summary>The {len(g3['not_prohibiting'])} conditions that do <i>not</i> prohibit "
                         f"(everything else does)</summary><ul>{ok_list}</ul></details>"))

    # 1c. never pick
    rows = [[html.escape(x["pattern"]), x["options"], x["right"], ", ".join(x["questions"][:12]) + (" ..." if len(x["questions"]) > 12 else "")]
            for x in r["never_pick"]]
    parts.append(section("never", "Never pick these options",
                         f"<p>Options with these words are never the answer anywhere in the pool "
                         f"({sum(x['options'] for x in r['never_pick'])} options, "
                         f"{sum(x['right'] for x in r['never_pick'])} right). Cross them out first; the analysis "
                         "guesses among the remaining options. The \"30 km/h\" one is the best story: the pool keeps "
                         "offering \"overtaking is allowed if the slow vehicle goes under 30 km/h\", an exemption "
                         "that does not exist.</p>"
                         + table(["Option contains", "Options", "Right", "Questions"], rows, [34, 10, 8, 48])))

    # 2. pass chance by share known
    kf = r["know_fraction"]
    fig = go.Figure(go.Bar(x=[f"{x['known_share']:.0%}" for x in kf], y=[x["p_pass"] * 100 for x in kf],
                           marker_color=BLUE, text=[f"{x['p_pass']:.1%}" for x in kf], textposition="outside"))
    fig.update_layout(title="Pass chance if you know this share of every section (and guess the rest)",
                      yaxis=dict(title="P(pass), %", range=[0, 112]), xaxis_title="Share of questions you know")
    parts.append(section("know", "How much you need to know",
                         "<p>A simpler way to read the exam: if you know a share of the questions, spread evenly, "
                         "and guess the rest, this is your pass chance. 90% gets you 87%; you need about 95% "
                         "to be safe.</p>" + fig_html(fig)))

    # 3. memorize curves
    fig = go.Figure()
    for k, v in st.items():
        fig.add_trace(go.Scatter(x=[c["known"] for c in v["curve"]], y=[c["p_pass"] * 100 for c in v["curve"]],
                                 mode="lines", name=STRATEGY_LABELS[k], line=dict(color=STRATEGY_COLORS[k], width=3)))
    fig.update_layout(title="Pass chance vs answers learned (best order)", xaxis_title="Answers learned",
                      yaxis=dict(title="P(pass), %", range=[0, 101]), legend=dict(orientation="h", y=-0.25),
                      height=520)
    parts.append(section("curves", "Pass chance vs answers learned",
                         "<p>\"Best order\": questions that are more likely to be drawn come first (a "
                         "faults question, group 3, is drawn with 3.4%, a traffic-rule question with 1.7%), "
                         "and with a rule list, the questions the rules get wrong come first.</p>" + fig_html(fig)))

    # 4. answer positions
    fig = go.Figure()
    colors = [GREY, BLUE, RED, ORANGE, "#2a9d8f"]
    for p in range(5):
        xs, ys = [], []
        for k, v in r["positions"].items():
            if str(p + 1) in v["answer_share"]:
                xs.append(f"{k} options ({v['questions']} q)")
                ys.append(v["answer_share"][str(p + 1)] * 100)
        fig.add_trace(go.Bar(x=xs, y=ys, name=f"answer is option {p + 1}", marker_color=colors[p],
                             text=[f"{y:.0f}%" for y in ys], textposition="outside"))
    fig.update_layout(barmode="group", title="Where the correct answer sits, by number of options",
                      yaxis=dict(title="share of questions, %", range=[0, 60]), legend=dict(orientation="h", y=-0.2))
    parts.append(section("positions", "Answer position",
                         "<p>2 options: a perfect 50/50. 3 options: the last is right 40% of the time (33% by "
                         "chance). 5 options: the first is almost never right (2 of 49); half of those 49 are picture "
                         "questions whose options are just labels (1-5) in the picture.</p>" + fig_html(fig)))

    # 5. rules
    rows = []
    for x in r["rules"]:
        rows.append([html.escape(x["description"]) + (" <i>(needs PDF order)</i>" if x["needs_option_order"] else ""),
                     x["fires"], x["right"], x["expected"], x["lift"], f"{x['ci95'][0]:.2f}-{x['ci95'][1]:.2f}",
                     f"{x['p_value']:.2g}" if x["p_value"] is not None else "", "yes" if x["significant_bonferroni"] else ""])
    parts.append(section("rules", "Every rule tested (whole pool)",
                         "<p>\"Expected\" is what guessing gets on the same questions (1/k each). Lift = right / "
                         "expected. Bonferroni: still significant after correcting for testing "
                         f"{len(r['rules'])} rules. These were chosen after looking at the data, so the held-out "
                         "section below is the honest number.</p>"
                         + table(["Rule", "Fires", "Right", "Expected", "Lift", "95% CI of precision", "p", "Bonferroni"],
                                 rows, [38, 8, 8, 9, 7, 12, 7, 11])))

    # 6. cross-out
    rows = [[html.escape(x["feature"]), x["options"], x["correct"], x["expected"],
             f"{x['share_correct']:.0%}" if x["share_correct"] is not None else "", f"{x['ci95'][0]:.2f}-{x['ci95'][1]:.2f}"]
            for x in r["crossout"]]
    parts.append(section("crossout", "Options you can (weakly) cross out",
                         "<p>Options containing \"միայն\" (only) are right 24% of the time, against 32% if they "
                         "were average: a mild hint, not a rule. Nothing comes close to \"never right\".</p>"
                         + table(["Option feature", "Options", "Correct", "Expected", "Share correct", "95% CI"],
                                 rows, [40, 12, 12, 12, 12, 12])))

    # 7. held-out
    h = r["heldout"]
    rows = [[k.replace("_", " "), v["fires"], v["right"], v["expected"], v["lift"]] for k, v in h.items()]
    full = r["decision_list_full_pool"]
    lst = "".join(f"<li>{html.escape(x['description'])}</li>" for x in full["order_kept"])
    fallback = ", ".join(f"{k} options: option {p}" for k, p in full["order_kept_fallback"].items())
    parts.append(section("heldout", "Held-out test (the honest numbers)",
                         "<p>5-fold cross-validation, folds grouped by question wording (26% of questions share "
                         "their wording with another one, only the picture differs; a split that separates twins "
                         "would leak answers). Each list is re-built on 4 folds and scored on the 5th.</p>"
                         + table(["Method", "Fires", "Right", "Expected by guessing", "Lift"], rows, [40, 15, 15, 15, 15])
                         + f"<p>The rule list built on the whole pool (order kept), first match decides:</p><ol>{lst}</ol>"
                         f"<p>then the usual position ({fallback}). Held out, that fallback is no better than "
                         "guessing (lift 0.99). The word model weighs every option word and is not something a "
                         "person can memorize; its top words are content (\"70կմ\", \"վազանց\"), i.e. it "
                         "memorizes, it does not find tricks.</p>"))

    # 7b. out of sample
    oos = r["out_of_sample"]
    rows = [[html.escape(x["description"]) + (" <i>(needs PDF order)</i>" if x["needs_option_order"] else ""),
             x["fires"], x["right"], x["expected"], f"{x['p_value']:.2g}"]
            for x in sorted(oos["rules"], key=lambda x: x["p_value"])]
    parts.append(section("unseen", "Test on questions nobody had seen",
                         f"<p>The {oos['questions']} questions of the 2022 pool that were removed in 2026 were never "
                         "read while the rules were found, so they are a true out-of-sample test (small). "
                         "Consistent with the main pool: \"both / all\", the only \"Արգելվում\" option and "
                         "\"3 options: the last\". The echo rule does not hold up. With this many rules, one or two "
                         "p-values under 0.05 are expected by chance (\"shortest\" here: nothing in the main pool). "
                         f"Never-pick options among them: {oos['never_pick']['options']}, right "
                         f"{oos['never_pick']['right']}.</p>"
                         + table(["Rule", "Fires", "Right", "Guessing gets", "p"], rows, [52, 12, 12, 12, 12])))

    # 7c. old vs new pool
    diff = json.loads((ROOT / "results" / "pool_diff.json").read_text(encoding="utf-8"))["summary"]
    parts.append(section("oldnew", "Old pool (2022, online until autumn 2026) vs new pool",
                         f"<p>Old: {diff['old_questions']} questions, new: {diff['new_questions']}. Matched one to one: "
                         f"{diff['matched']} ({diff['identical']} identical). Removed: {len(diff['old_only'])} "
                         f"(mostly bus, truck and tractor questions that moved to the D/T pool); added: "
                         f"{len(diff['new_only'])} (most in group 2, the law). Of the 660 questions with unchanged "
                         "wording and options, none changed its answer. Real answer changes among the reworded ones, "
                         "found by reading every flagged pair: <b>1-34 and 1-35</b> (3+ lanes one way: the far-left "
                         "lane is now allowed both for overtaking and for turning, the old key said turning only) and "
                         "<b>2-75</b> (the right to drive starts with the licence card or its new digital version: "
                         "\"both\").</p>"))

    # 8. method
    sec = r["pool"]["sections"]
    rows = [[SECTION_LABELS[s], ", ".join(map(str, v["groups"])), v["questions"], v["drawn"], f"{v['draw_chance']:.1%}"]
            for s, v in sec.items()]
    parts.append(section("method", "Exam model and method",
                         "<p>Decision 385-Ն, point 17: each test draws 20 questions by section; at least 18 right "
                         "to pass (point 20). The law gives no quota per group inside the traffic rules, so those "
                         "15 are assumed drawn evenly from all 858. P(pass) is computed exactly (a dynamic program "
                         "over which questions are drawn, without replacement), not simulated. The 3 "
                         "psychological questions are not in the pool and are assumed passed.</p>"
                         + table(["Section", "PDF groups", "Questions", "Drawn per test", "Chance per question"],
                                 rows, [36, 22, 14, 14, 14])
                         + "<p>Source: <code>results/patterns.json</code> (built by <code>scripts/mine_patterns.py</code>, "
                         f"seed {r['seed']}).</p>"))

    toc = "".join(p[0] for p in parts)
    body = "".join(p[1] for p in parts)
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Answer Shortcuts</title>
<style>
body{{font-family:"Segoe UI",Arial,sans-serif;max-width:1100px;margin:0 auto;padding:16px;color:#1b1b1f;background:#fff;line-height:1.5}}
h1{{margin-bottom:4px}} .sub{{color:#555;margin-top:0}}
nav{{background:#f4f6fa;border-radius:8px;padding:8px 16px;margin:16px 0}}
details{{border:1px solid #dde1e8;border-radius:8px;margin:14px 0}}
summary{{cursor:pointer;font-weight:600;font-size:1.15em;padding:10px 14px;background:#f8f9fb;border-radius:8px}}
.body{{padding:4px 16px 12px}}
table{{border-collapse:collapse;table-layout:fixed;width:100%;margin:8px 0;font-size:.93em}}
th,td{{border-bottom:1px solid #e3e6ec;padding:5px 8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}}
th{{background:#f4f6fa}}
</style></head><body>
<h1>Answer shortcuts in the Armenian theory exam (A/B/C, {r['n']} questions)</h1>
<p class="sub">Built from results/patterns.json. Pass mark {r['pass_mark']} of 20.</p>
<nav><b>Contents</b><ol>{toc}</ol></nav>
{body}
</body></html>"""
    out = ROOT / "reports" / "patterns_report.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding="utf-8")
    log.info(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB) in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
