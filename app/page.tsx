import { Suspense } from "react";
import { Home } from "@/components/home";
import { PageLoading } from "@/components/page-loading";
import { getFunctionalGames } from "@/lib/functional-games";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeLoader />
    </Suspense>
  );
}

// Lee Supabase dentro del <Suspense>: `createClient()` usa `cookies()`.
async function HomeLoader() {
  const games = await getFunctionalGames();
  return <Home games={games} />;
}
