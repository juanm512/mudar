import { auth } from "@mudar/auth"

export async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers })
}
