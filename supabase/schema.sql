CREATE TYPE public.link_metadata_status AS ENUM ('pending', 'ready');

CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  custom_title TEXT,
  description TEXT,
  image_url TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  metadata_status public.link_metadata_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT links_url_key UNIQUE (url)
);

ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for testing"
ON public.links
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all for testing"
ON public.groups
FOR ALL
USING (true)
WITH CHECK (true);
