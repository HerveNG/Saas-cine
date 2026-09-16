import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase-server";
import { getAIQuota } from "../../../../lib/ai/quota";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  try {
    return NextResponse.json(await getAIQuota(supabase, user.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de charger le quota IA." }, { status: 500 });
  }
}
