# Selector Strategy

Preferred selectors:

1. id
2. accessibility id
3. testID (React Native)

Example:

- tapOn:
    id: login_button

Avoid:

- deep hierarchy selectors
- visible text when possible
- index selectors

Example of fragile selector:

- tapOn: "Continue"

Better:

- tapOn:
    id: continue_button