-- Keep public navigation stable until an explicit publish transaction updates it.
ALTER TABLE website_structures ADD COLUMN IF NOT EXISTS published_structure text;
