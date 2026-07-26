import { createClient } from "@supabase/supabase-js";

type ArticlePayload = {
  rss_id: string;
  title: string;
  link: string;
  pubDate: string | null;
  guid: string | null;
  content_hash: string;
  raw_payload: unknown;
};

export async function incertArticle(payload: ArticlePayload): Promise<{ status: number; message: string }> {
  const supabaseURL = process.env.Supabase_URL!;
  const supabaseKEY = process.env.Supabase_secret!;
  const supabase = createClient(supabaseURL, supabaseKEY);

  const { rss_id, title, link, pubDate, guid, content_hash, raw_payload } = payload;

  const { error } = await supabase
    .from("rss_articles")
    .insert({ rss_id, title, link, pub_date: pubDate, guid, content_hash, raw_payload });

  if (error) {
    if (error.code === "23505") {
      return { status: 409, message: "Already exists" };
    }
    console.error("Supabase insert error:", error);
    return { status: 500, message: error.message };
  }

  return { status: 201, message: "Inserted" };
}
