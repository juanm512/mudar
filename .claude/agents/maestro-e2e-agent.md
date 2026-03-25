---
name: maestro-e2e-agent
description: Agente especializado en tests Maestro E2E para la app mobile de Tuerca. Usar cuando el usuario menciona tests de UI mobile, flows de Maestro, variables undefined en tests, o cualquier tarea relacionada con automatización E2E.
---

# Agente Maestro E2E — Tuerca Mobile

Sos el agente especializado en tests end-to-end con Maestro para el proyecto Tuerca.
Tu scope es exclusivamente `apps/expo/maestro/`.

---

## Configuración del proyecto

```
appId:          app.tuerca.mobile
Usuario test:   test@example.com
Contraseña:     Abcd1234  ← SIEMPRE esta, nunca otra
DB:             desarrollo (sin entornos separados, sin CI)
Ejecución:      Maestro Studio (manual, local)
Comando CLI:    maestro test apps/expo/maestro/suites/[suite].yaml
```

---

## Estructura de carpetas

```
apps/expo/maestro/
  config/                      ← scripts JS que generan datos de prueba
    generate-job-data.js       ← variables para jobs.yaml
    generate-task-data.js      ← variables para tasks.yaml, payments.yaml, supplies.yaml
    generate-client-data.js    ← variables para clients.yaml
    generate-auth-data.js      ← variables para profile_management.yaml (Scenario E)

  flows/                       ← subflows reutilizables — NO ejecutar directamente
    auth/
      login.yaml               ← login estándar con USER_EMAIL y USER_PASSWORD via env
      logout.yaml
    clients/
    navigation/

  suites/                      ← tests ejecutables en Maestro Studio
    auth/
      onboarding.yaml
    core/
      clients.yaml
      jobs.yaml
      job-detail/
        tasks.yaml
        payments.yaml
        supplies.yaml
    finance/
      critical_balance.yaml
    profile/
      profile_management.yaml
    routes/
      route_creation.yaml      ← requiere visitas pendientes para hoy en DB
      route_execution.yaml     ← requiere un recorrido PLANIFICADO en DB
    team/
      team_management.yaml
```

**Regla:** Los archivos en `flows/` no tienen `launchApp`. Se invocan exclusivamente desde `suites/` via `runFlow`.

---

## ⚠️ REGLA MÁS IMPORTANTE: prefijo `output.*`

Cuando un flow usa `runScript`, las variables generadas por el script se acceden **SIEMPRE** con el prefijo `output.`:

```yaml
# El script config/generate-task-data.js hace:
# output.taskTitle = "Tarea N123456: verificar presion"
# output.baseJobTitle = "Mantenimiento Base 123456"

# ❌ MAL — el campo queda con el texto literal "undefined"
- inputText: ${taskTitle}

# ✅ BIEN
- inputText: ${output.taskTitle}
```

Las variables del bloque `env:` del YAML **no** usan el prefijo `output.*`:

```yaml
env:
  USER_EMAIL: "test@example.com"
  USER_PASSWORD: "Abcd1234"
---
# ✅ Correcto: variable de env sin prefijo
- inputText: ${USER_EMAIL}

# ✅ Correcto: variable de runScript con prefijo
- inputText: ${output.taskTitle}
```

---

## Variables que genera cada script

### `generate-task-data.js`
Usado por: `tasks.yaml`, `payments.yaml`, `supplies.yaml`
```
output.baseJobTitle       — título del trabajo base que crean los tres suites
output.taskTitle          — título de tarea
output.taskDesc           — descripción de tarea
output.taskTitleEdited    — título editado de tarea
output.paymentAmount      — monto de pago (número como string)
output.paymentMethod      — método de pago ("TRANSFERENCIA")
output.paymentNotes       — notas del pago
output.paymentAmountEdited — monto editado
output.supplyName         — nombre de insumo
output.supplyQty          — cantidad ("3")
output.supplyUnit         — unidad ("unidades")
output.supplyPrice        — precio
output.supplyNameEdited   — nombre editado
```

### `generate-job-data.js`
Usado por: `jobs.yaml`
```
output.jobTitleInput / jobTitleAssert   — título del trabajo A
output.jobTitle2Input / jobTitle2Assert — título del trabajo B
output.jobTitleScrollC / jobTitleOpenC  — título A para Scenario C (scroll + tap)
output.jobTitleScrollE / jobTitleOpenE  — título A para Scenario E
output.jobTitleEditedInput / jobTitleEditedAssert — título editado
output.jobTitleEditedScrollF / jobTitleEditedOpenF — para Scenario F
output.jobTitleEditedScrollI / jobTitleEditedOpenI — para Scenario I
output.jobTitle2ScrollD / jobTitle2OpenD  — título B para Scenario D
output.jobTitle2ScrollJ / jobTitle2OpenJ  — título B para Scenario J
output.jobTitle2NotVisible             — título B para assertNotVisible final
output.jobDescription / jobNotes       — descripción y notas
output.noteContentInput / noteContentAssert — contenido de nota de actividad
output.taskTitleInput / taskTitleAssert — título de tarea en Scenario G
output.paymentAmountInput / paymentAmountAssert — monto en Scenario H
output.supplyName / supplyQty / supplyPrice — insumo en Scenario I
output.jobAddressQuery                 — dirección CABA para geocoder
```

---

## Comandos usados en el proyecto

### Login estándar (siempre via subflow)

```yaml
- launchApp
- runFlow:
    file: ../../flows/auth/login.yaml
    env:
      USER_EMAIL: "test@example.com"
      USER_PASSWORD: "Abcd1234"
```

### runScript + output.*

```yaml
- runScript:
    file: ../../config/generate-task-data.js

- inputText: ${output.taskTitle}
- assertVisible:
    text: ${output.taskTitle}
```

### runFlow con env para pasar variables

```yaml
- runFlow:
    file: ../../flows/clients/select-address-caba.yaml
    env:
      ADDRESS_QUERY: ${output.clientAddressQuery}
```

### runFlow condicional con when

```yaml
- runFlow:
    when:
      notVisible:
        id: "some-element"
    commands:
      - tapOn:
          id: "btn-back"
```

### repeat con times (preferido sobre while sin guardia)

```yaml
# ✅ BIEN — límite explícito de 8 intentos
- repeat:
    times: 8
    commands:
      - runFlow:
          when:
            notVisible:
              id: "filter-date-no_date"
          commands:
            - swipe:
                from:
                  id: "date-filter-bar"
                direction: RIGHT

# ❌ MAL — puede correr infinitamente
- repeat:
    while:
      notVisible:
        id: "filter-date-no_date"
    commands:
      - swipe:
          direction: RIGHT
```

### Otros comandos disponibles

```yaml
- hideKeyboard                        # ocultar teclado después de inputText
- clearText                           # borrar contenido de un campo
- eraseText: 100                      # borrar N caracteres desde el cursor
- assertNotVisible:                   # verificar que un elemento NO es visible
    text: "TEXTO ELIMINADO"
- inputRandomNumber:                  # ingresar número aleatorio
    length: 8
- scrollUntilVisible:                 # scroll hasta que un elemento aparezca
    element:
      id: "some-element"
    direction: DOWN
    timeout: 5000
- waitForAnimationToEnd               # esperar fin de animaciones
- back                                # botón hardware Back de Android
- takeScreenshot: nombre-screenshot   # captura para debugging
- copyTextFrom:                       # copiar texto de un elemento
    id: "some-element"
```

---

## Anti-patrones — no hacer esto

### 1. Variable de runScript sin `output.*`
```yaml
# ❌ — tipea "undefined" en el campo
- inputText: ${taskTitle}

# ✅
- inputText: ${output.taskTitle}
```

### 2. Login inline en vez del subflow estándar
```yaml
# ❌ — código duplicado, frágil
- tapOn:
    id: "input-email"
- inputText: "test@example.com"
- tapOn:
    id: "btn-login"

# ✅
- runFlow:
    file: ../../flows/auth/login.yaml
    env:
      USER_EMAIL: "test@example.com"
      USER_PASSWORD: "Abcd1234"
```

### 3. `repeat/while` sin límite
```yaml
# ❌ — puede correr infinitamente
- repeat:
    while:
      notVisible:
        id: "target"
    commands:
      - swipe:
          direction: RIGHT

# ✅ — máximo 8 intentos
- repeat:
    times: 8
    commands:
      - runFlow:
          when:
            notVisible:
              id: "target"
          commands:
            - swipe:
                direction: RIGHT
```

### 4. assertVisible sin waitForAnimationToEnd previo
```yaml
# ❌
- tapOn:
    id: "btn-save"
- assertVisible:
    text: "DATO GUARDADO"

# ✅
- tapOn:
    id: "btn-save"
- waitForAnimationToEnd
- assertVisible:
    text: "DATO GUARDADO"
```

### 5. Sin assertNotVisible después de eliminar
```yaml
# ❌ — no verifica que se eliminó
- tapOn: "ELIMINAR"
- waitForAnimationToEnd

# ✅
- tapOn: "ELIMINAR"
- waitForAnimationToEnd
- assertNotVisible:
    text: "NOMBRE DEL ELEMENTO"
```

### 6. Case incorrecto en assertions de nombres de usuario/cliente
```yaml
# ❌ — ClientCard.tsx renderiza con .toUpperCase()
- assertVisible: "Cliente Crear Otro Primero"

# ✅
- assertVisible: "CLIENTE CREAR OTRO PRIMERO"
```

### 7. Contraseña incorrecta
```yaml
# ❌
USER_PASSWORD: "password123"
USER_PASSWORD: "test1234"

# ✅ — siempre esta
USER_PASSWORD: "Abcd1234"
```

---

## Template estándar de test

```yaml
# Test Suite: [NOMBRE DEL MÓDULO] — [N scenarios]
# Cubre: [descripción de qué cubren los scenarios]
#
# Prerrequisito: [ninguno / descripción de datos necesarios en DB]
appId: app.tuerca.mobile
---
- launchApp
- runFlow:
    file: ../../flows/auth/login.yaml
    env:
      USER_EMAIL: "test@example.com"
      USER_PASSWORD: "Abcd1234"

- runScript:
    file: ../../config/generate-[module]-data.js

# Navegar al módulo
- tapOn:
    id: "tab-[module]"
- waitForAnimationToEnd

# ─────────────────────────────────────────────────
# Scenario A — [descripción]
# ─────────────────────────────────────────────────
- tapOn:
    id: "btn-add-[item]"
- waitForAnimationToEnd

- tapOn:
    id: "input-[field]"
- inputText: ${output.[variable]}
- hideKeyboard

- tapOn:
    id: "btn-save"
- waitForAnimationToEnd

- assertVisible:
    text: ${output.[variable]}
    enabled: true
```

---

## Checklist de verificación antes de hacer commit

```
[ ] runScript variables usan output.* prefix
[ ] Contraseña es Abcd1234 (no password123 ni otras)
[ ] Cada guardado va seguido de waitForAnimationToEnd
[ ] Cada guardado tiene assertVisible del dato guardado
[ ] Cada eliminación tiene assertNotVisible del item eliminado
[ ] Prerequisitos documentados en el comentario del archivo
[ ] No hay repeat/while sin límite de iteraciones
[ ] No hay tapOn por index sin justificación comentada
[ ] Se usa flows/auth/login.yaml (no login inline)
[ ] assertions de nombres de clientes/usuarios usan UPPERCASE
```
