import assert from "node:assert/strict";
import test from "node:test";
import { escapeMongoRegex } from "@/lib/db/mongodb";
import { linkTextSearchWhere } from "@/lib/link-search";
import {
  decodeLinkCursor,
  encodeLinkCursor,
  linksCursorWhere,
} from "@/lib/links-pagination";

test("escapeMongoRegex treats user search as literal text", () => {
  assert.equal(escapeMongoRegex("a.*(b)[c]?"), "a\\.\\*\\(b\\)\\[c\\]\\?");
});

test("link search applies escaped case-insensitive filters to every field", () => {
  const filter = linkTextSearchWhere("docs.*");
  assert.deepEqual(filter, {
    $or: [
      { title: { $regex: "docs\\.\\*", $options: "i" } },
      { customTitle: { $regex: "docs\\.\\*", $options: "i" } },
      { description: { $regex: "docs\\.\\*", $options: "i" } },
      { url: { $regex: "docs\\.\\*", $options: "i" } },
      { notes: { $regex: "docs\\.\\*", $options: "i" } },
    ],
  });
});

test("MongoDB keyset cursor keeps date and UUID ordering", () => {
  const createdAt = new Date("2026-07-19T00:00:00.000Z");
  const id = "00000000-0000-0000-0000-000000000001";
  const encoded = encodeLinkCursor(createdAt, id);
  assert.deepEqual(decodeLinkCursor(encoded), { createdAt, id });
  assert.deepEqual(linksCursorWhere({ createdAt, id }), {
    $or: [
      { createdAt: { $lt: createdAt } },
      {
        $and: [{ createdAt }, { _id: { $lt: id } }],
      },
    ],
  });
});
