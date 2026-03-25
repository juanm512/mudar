const ERROR_MAP: Record<string, string> = {
  "Invalid email": "El email no es válido",
  "Email already exists": "Ya existe una cuenta con ese email",
  "Invalid password": "Contraseña incorrecta",
  "Password too short": "La contraseña debe tener al menos 8 caracteres",
  "Password too long": "La contraseña es demasiado larga",
  "User not found": "No existe una cuenta con ese email",
  "Invalid credentials": "Email o contraseña incorrectos",
  "Invalid token": "El enlace no es válido o ya expiró",
  "Token expired": "El enlace expiró. Solicitá uno nuevo",
  "Email not verified":
    "Debés verificar tu email antes de ingresar. Revisá tu casilla.",
  "Too many requests":
    "Demasiados intentos. Esperá unos minutos e intentá de nuevo",
  "Social account already linked":
    "Esta cuenta de Google ya está vinculada a otro usuario",
}

export function translateAuthError(message?: string): string {
  if (!message) return "Ocurrió un error inesperado"
  return ERROR_MAP[message] ?? message
}
