# GitHub Publication

Current local repo has no remote. Publish only after choosing owner and visibility.

Recommended private repo:

```bash
gh repo create maxpetrusenko/harness-bench --private --source . --remote origin --push
```

Recommended public repo after removing any private run artifacts:

```bash
gh repo create maxpetrusenko/harness-bench --public --source . --remote origin --push
```

Pre-push checks:

```bash
git status --short
npm test
npm run sdk:smoke
npm run smoke
```

The CI workflow runs tests and smoke checks on GitHub. Real harness runs are intentionally excluded from CI because they require local CLI auth and paid model access.
