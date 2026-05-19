# AGENTS.md

## Verification Rule

After changing code, always verify the extension in the same way a user will run it.

- Run the relevant automated tests for the changed area.
- For extension behavior changes, run the VS Code F5 Extension Development Host flow.
- Review the **Live Architecture Map** output log after F5 starts.
- Confirm the log shows a real workspace folder, nonzero discovery where expected, and no layout, scanner, activation, or dashboard errors.
- Do not continue implementation or declare the task done until the tests and the F5 output log have both been checked.
- If F5 cannot be run because of an external blocker, record the blocker explicitly before continuing or stopping.
