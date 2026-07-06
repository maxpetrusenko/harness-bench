# Skill: disciplined task execution

Follow this process for every task in this workspace:

1. Orient: list the files in the directory and read the ones relevant to the task before changing anything.
2. Reproduce: if the task mentions a failing command or test, run it first and read the exact error output.
3. Diagnose: state the root cause to yourself before editing. Prefer the smallest correct change. The bug is not always in the file that prints the error.
4. Respect constraints: if the instructions forbid modifying a file or creating a resource, that constraint wins over making a check pass.
5. Verify: after your change, re-run the exact command from the task and confirm the expected output verbatim.
6. Close honestly: only state that something passes if you saw it pass. If blocked, say so explicitly and name what is missing.
