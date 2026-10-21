# Group 3: score the conditions, not the options (and the key contradicts itself on the horn)

**Symptom**

The option-level shortcut analysis found nothing special about "կառուցվածքով նախատեսված" (provided by
the design): options containing it were the clicked answer only 10 of 22 times. Hayk remembered it as
a reliable rule.

**Cause**

Every group-3 question reads "operating is prohibited if: A / B / both". An option can be "wrong"
while its condition still prohibits (answer = both). Decoded per condition (answer A -> A prohibits, B
does not; both -> both prohibit), the rule is perfect:

```
group 3: 87/121 conditions prohibit; 'provided by design' 24/24
design rule fires in 23 questions: answer both 12, that option 11, the other single option 0
```

**Contradiction in the official answer key**

```
3-15  ... / Չի աշխատում ձայնային ազդանշանի սարքը / both            answer 3  (horn prohibits)
3-35  Չի աշխատում ձայնային ազդանշանի սարքը / cooling ... / both     answer 1  (horn prohibits)
3-49  ... ձայնային ազդանշանի սարքով տրվող ազդանշանը չի աշխատում ... answer 3  (horn prohibits)
3-42  power steering ... / Եթե չի աշխատում ձայնարկիչը / both        answer 1  (horn does NOT)
```

The official English PDF says "The horn does not operate" in all four. An exact-text consistency
check missed it because the Armenian wording differs; `mine_patterns.py` now maps the variants to one
condition (`SAME_CONDITION`) and reports it.

**Consequences**

For any "A / B / both" question set, analyse at the level of the listed statements. Compare wording
variants through the official English before calling the key consistent.
