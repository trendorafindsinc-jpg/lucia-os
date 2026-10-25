-- SEO/social settings only affect public output after an explicit publish transaction.
ALTER TABLE website_seo_settings ADD COLUMN IF NOT EXISTS published_settings text;
