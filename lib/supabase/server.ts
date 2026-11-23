import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Cliente para Server Components, Server Actions y Route Handlers.
//
// Con `cacheComponents: true`, `cookies()` solo se puede leer en contexto
// dinámico: llama a esta función dentro de un <Suspense> o en una ruta
// dinámica, nunca en el cuerpo prerenderizado de una página o layout.
// No guardes el cliente en una variable global: crea uno por request.
export async function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Un Server Component no puede escribir cookies. Se ignora porque
          // proxy.ts ya refresca la sesión en cada request.
        }
      },
    },
  });
}
