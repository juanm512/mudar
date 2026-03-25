# Avoid Flaky Tests

Prefer:

- assertVisible
- waitForAnimationToEnd
- waitFor

Example:

- assertVisible: "Dashboard"

Avoid:

- sleep
- fixed delays

If necessary:

- extendedWaitUntil:
    visible: "Dashboard"
    timeout: 10000