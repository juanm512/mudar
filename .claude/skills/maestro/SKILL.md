---
name: maestro-mobile-testing
description: |
  Use this skill whenever the user mentions mobile UI testing, E2E tests for iOS or Android,
  Maestro flows, mobile automation, Expo/React Native UI tests, or wants to create,
  debug or run automated tests using Maestro CLI or Maestro Studio.

  This skill helps generate Maestro flows, debug flaky tests, run tests locally,
  integrate with CI pipelines, and inspect UI hierarchy. Trigger this skill
  even if the user does not explicitly mention Maestro but asks about
  mobile UI automation or end-to-end testing.
---

# Maestro Mobile Testing Skill

This skill helps create, debug, and run **end-to-end UI tests** for mobile apps using **Maestro**.

Supported environments:

- Android Emulator
- iOS Simulator
- Expo / React Native
- Native Android
- Native iOS

The skill assumes **local development with Maestro CLI and Maestro Studio**.

---

# When to use this skill

Use this skill when the user:

- Wants to create **mobile UI tests**
- Mentions **Maestro**
- Wants **E2E tests for React Native / Expo**
- Needs to **debug flaky mobile tests**
- Wants to run tests **locally or in CI**
- Needs help writing **Maestro flows**
- Wants to inspect **UI hierarchy**

---

# Core Workflow

When generating tests, follow this process.

1️⃣ Understand the user goal

Example goals:

- Login flow test
- Checkout flow
- Onboarding flow
- Navigation test
- Smoke tests

2️⃣ Identify target screens and elements

Use:


maestro hierarchy


or Maestro Studio inspector.

3️⃣ Create a flow file

Example structure:


maestro/
flows/
login.yaml
checkout.yaml
config.yaml


---

# Example Flow

```yaml
appId: com.example.app

---

- launchApp

- tapOn:
    id: "loginButton"

- inputText:
    id: "emailInput"
    text: "test@example.com"

- inputText:
    id: "passwordInput"
    text: "password123"

- tapOn:
    id: "submitLogin"

- assertVisible:
    text: "Welcome"
Debugging Tools

Use these tools when flows fail.

Inspect UI
maestro hierarchy
Run a single test
maestro test maestro/flows/login.yaml
Run all tests
maestro test maestro
Continuous testing
maestro test maestro --continuous
Maestro Studio Workflow

Using Maestro Studio:

Launch the app

Record interactions

Export YAML flow

Refine selectors

Run via CLI

Studio is ideal for:

discovering selectors

recording flows

debugging element hierarchy

Anti-Flaky Strategies

Prefer:

assertVisible
waitForAnimationToEnd

Avoid:

sleep

Example:

- waitForAnimationToEnd
- assertVisible:
    text: "Dashboard"
Reusable Flows

Create reusable flows.

Example:

flows/
  login.yaml
  open-settings.yaml

Call them via runFlow.

- runFlow: login.yaml
Local CI Simulation

To simulate CI locally:

maestro test maestro --format junit

Generate report:

maestro test maestro --format junit --output report.xml
Example Test Structure
maestro/
  flows/
    login.yaml
    onboarding.yaml
  config.yaml

config example:

flows:
  - flows
Best Practices

✔ Use accessibility IDs
✔ Use reusable flows
✔ Avoid fragile text selectors
✔ Keep tests deterministic
✔ Keep flows short and modular

Example Prompts that should trigger this skill

"Create Maestro tests for my React Native login screen"

"Help me debug a Maestro flow"

"How do I automate mobile UI tests?"

"Write E2E tests for Expo app"

"Run Maestro tests locally"

Example Prompts that should NOT trigger this skill

"Write unit tests in Jest"

"Test backend API"

"Fix React component bug"



## References

The following reference documents contain detailed guidance for Maestro usage.  
Consult them when generating tests or debugging flows.

references/maestro_commands.md
references/selectors_guide.md
references/flows_and_reusability.md
references/stability_and_flaky_tests.md
references/maestro_studio_workflow.md
references/ci_execution.md


## Testing Principles

Always follow these principles when generating Maestro tests:

1. Prefer stable selectors (id, accessibility id, testID).
2. Avoid sleep commands whenever possible.
3. Use assertions to verify navigation.
4. Break complex scenarios into reusable flows.
5. Keep tests deterministic and independent.