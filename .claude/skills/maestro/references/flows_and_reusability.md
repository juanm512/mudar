# Reusable Flows

Use subflows to avoid duplication.

Example:

login.yaml

appId: com.example.app
---
- launchApp
- tapOn: "Login"
- inputText: "test@example.com"
- tapOn: "Submit"

Reuse:

- runFlow: login.yaml

- runFlow:
    file: flows/login.yaml
    env:
      USER_EMAIL: test@test.com