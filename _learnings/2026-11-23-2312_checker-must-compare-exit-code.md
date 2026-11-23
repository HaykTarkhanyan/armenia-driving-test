# A checker that wraps another tool must also trust its exit code

**Symptom** The validator for the explanation batches reported `0 errors` on 469 explanations. After its parsing was fixed, the same files had 7 real Armenian lint errors:

```
g1a: 72 of 72 explanations, 4 errors
g4a: 88 of 88 explanations, 1 errors
g8_g10: 100 of 100 explanations, 2 errors
5 article-before-vowel, 2 aysinqn-but
```

**Cause** The validator looked for lines like `file:line: error:rule:`. The lint writes errors as `file:line: rule: text` and only hints as `file:line: hint:rule: text`. No error line matched the pattern, so errors were dropped without a message. The validator accepted exit codes 0 and 1 from the lint, so the lint's own exit 1 did not stop it either.

**Consequences**

- When a script wraps a tool and parses its output, compare the two signals. If the tool exits with failure and the parser found nothing, that is an error in the wrapper:

```python
if lint.returncode == 1 and not any(": lint " in row for row in errors):
    errors.append(f"the lint reported errors this script could not read: {lint.stdout[:200]}")
```

- Test a checker on an input that must fail before trusting a pass. The first test of this validator used a bad entry, but it failed on punctuation checks in the validator itself, so it never exercised the lint path.
- I told Hayk that the 469 explanations passed all checks before this was found. A green result from a new checker is a claim about the checker too.
