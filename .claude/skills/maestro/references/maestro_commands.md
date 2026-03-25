# Maestro CLI Commands

Install:

brew install maestro

Run tests:

maestro test .maestro/

Run specific flow:

maestro test login.yaml

Run with env variables:

MAESTRO_DEVICE_ID=<device> maestro test .maestro/

List devices:

maestro devices

Inspect UI hierarchy:

maestro hierarchy

Record interaction:

maestro record

Debug failing test:

maestro test flow.yaml --debug

Continuous mode (auto rerun):

maestro test .maestro/ --continuous