// Prueba de humo contra el proyecto real de Supabase, fuera de la app.
// Uso: bun run smoke:supabase  (bun carga .env.local automáticamente)
import { createClient } from "@supabase/supabase-js";

const failures: string[] = [];

function pass(name: string) {
  console.log(`OK    ${name}`);
}

function fail(name: string, reason: string) {
  console.error(`FALLO ${name}: ${reason}`);
  failures.push(name);
}

async function main() {
  // (a) variables de entorno
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);
  if (!url || !key) {
    fail("(a) variables de entorno", `falta ${missing.join(", ")}`);
    return;
  }
  pass("(a) variables de entorno");

  // (b) health de Auth con la clave publicable
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
    });
    if (res.status === 200) pass("(b) GET /auth/v1/health responde 200");
    else fail("(b) GET /auth/v1/health", `status ${res.status}`);
  } catch (e) {
    fail("(b) GET /auth/v1/health", String(e));
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // (c) getClaims sin sesión no devuelve error
  try {
    const { error } = await supabase.auth.getClaims();
    if (!error) pass("(c) auth.getClaims() sin sesión sin error");
    else fail("(c) auth.getClaims() sin sesión", error.message);
  } catch (e) {
    fail("(c) auth.getClaims() sin sesión", String(e));
  }

  // (d) PostgREST responde sin error de autenticación. El esquema public no
  // tiene tablas, así que se espera un error de tabla inexistente (PGRST205),
  // que prueba que la clave fue aceptada. 401/403 o "Invalid API key" fallan.
  try {
    const { error, status } = await supabase
      .from("__smoke_check__")
      .select("*")
      .limit(1);
    const authError =
      status === 401 ||
      status === 403 ||
      /api key|jwt|unauthorized/i.test(error?.message ?? "");
    if (authError) {
      fail("(d) consulta a PostgREST", `${status} ${error?.message}`);
    } else {
      pass(`(d) consulta a PostgREST sin error de autenticación (${status})`);
    }
  } catch (e) {
    fail("(d) consulta a PostgREST", String(e));
  }
}

await main();

if (failures.length > 0) {
  console.error(`\n${failures.length} comprobación(es) fallaron.`);
  process.exit(1);
}
console.log("\nTodas las comprobaciones pasaron.");
