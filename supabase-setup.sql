-- 在 Supabase SQL Editor 中執行此檔案

-- 建立瀏覽計數資料表
CREATE TABLE IF NOT EXISTS page_views (
  slug        TEXT PRIMARY KEY,
  page_title  TEXT,
  view_count  BIGINT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 啟用 Row Level Security
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- 允許任何人讀取
CREATE POLICY "public_read" ON page_views
  FOR SELECT USING (true);

-- 只允許透過 RPC 函式寫入（不允許直接 INSERT/UPDATE）
CREATE POLICY "no_direct_write" ON page_views
  FOR INSERT WITH CHECK (false);

-- 建立原子性累加的 RPC 函式（繞過 RLS，以 SECURITY DEFINER 執行）
CREATE OR REPLACE FUNCTION increment_view_count(
  page_slug  TEXT,
  page_title TEXT DEFAULT NULL
)
RETURNS TABLE(slug TEXT, view_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO page_views (slug, page_title, view_count, updated_at)
  VALUES (page_slug, COALESCE(page_title, page_slug), 1, NOW())
  ON CONFLICT (slug) DO UPDATE
    SET view_count  = page_views.view_count + 1,
        updated_at  = NOW()
  RETURNING page_views.slug, page_views.view_count;
$$;

-- 授權 anon role 呼叫此函式
GRANT EXECUTE ON FUNCTION increment_view_count TO anon;
GRANT SELECT ON page_views TO anon;
