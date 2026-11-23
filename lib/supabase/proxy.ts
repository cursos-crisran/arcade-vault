import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Refresca la sesión de Supabase en cada request y propaga las cookies
// actualizadas a los Server Components (request) y al navegador (response).
// No redirige ni protege rutas: eso se decide en la spec de auth.
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // No ejecutes código entre createServerClient y getClaims(): un error
  // aquí provoca cierres de sesión aleatorios difíciles de depurar.
  // Si quitas getClaims(), los usuarios pueden perder la sesión.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
