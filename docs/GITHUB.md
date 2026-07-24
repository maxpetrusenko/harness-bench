# GitHub Publication

Current public repo:

https://github.com/maxpetrusenko/harness-bench

Pre-push checks:

```bash
git status --short
npm test
npm run sdk:smoke
npm run smoke
```

The CI workflow runs tests and smoke checks on GitHub. Real harness runs are intentionally excluded from CI because they require local CLI auth and paid model access.

The daily radar workflow runs read-only inventory checks and publishes the suggested next PR as an artifact. It does not install CLIs or run paid harness matrices.
