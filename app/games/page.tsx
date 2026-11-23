import type { Metadata } from "next";
import { Suspense } from "react";
import { Library } from "@/components/library";
import { PageLoading } from "@/components/page-loading";
import { getFunctionalGames } from "@/lib/functional-games";

export const metadata: Metadata = {
  title: "Biblioteca | Arcade Vault",
};

export default function GamesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LibraryLoader />
    </Suspense>
  );
}

// Lee Supabase dentro del <Suspense>: `createClient()` usa `cookies()`.
async function LibraryLoader() {
  const games = await getFunctionalGames();
  return <Library games={games} />;
}
