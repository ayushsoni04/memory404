-- Promote the permanent inbox to "General" while preserving its links and position.
DO $$
DECLARE
  general_id UUID;
  uncategorized_id UUID;
BEGIN
  SELECT id INTO general_id FROM "groups" WHERE name = 'General' LIMIT 1;
  SELECT id INTO uncategorized_id FROM "groups" WHERE name = 'Uncategorized' LIMIT 1;

  IF uncategorized_id IS NOT NULL AND general_id IS NULL THEN
    UPDATE "groups" SET name = 'General', "sort_order" = 0 WHERE id = uncategorized_id;
  ELSIF uncategorized_id IS NOT NULL AND general_id IS NOT NULL THEN
    UPDATE "links" SET "group_id" = general_id WHERE "group_id" = uncategorized_id;
    UPDATE "groups" SET "parent_group_id" = general_id WHERE "parent_group_id" = uncategorized_id;
    DELETE FROM "groups" WHERE id = uncategorized_id;
  END IF;

  SELECT id INTO general_id FROM "groups" WHERE name = 'General' LIMIT 1;
  IF general_id IS NOT NULL THEN
    UPDATE "groups" SET "sort_order" = "sort_order" + 1 WHERE id <> general_id;
    UPDATE "groups" SET "sort_order" = 0 WHERE id = general_id;
  END IF;
END $$;
