# Running Maestro in CI

Typical CI command:

maestro test .maestro/ --format junit

Artifacts:

- junit reports
- screenshots
- logs

Example GitHub Actions step:

- name: Run Maestro tests
  run: maestro test .maestro/