import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteOne = vi.hoisted(() => vi.fn());
const findOne = vi.hoisted(() => vi.fn());
const deleteMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "user-1",
    email: "a@example.com",
    plan: "free",
  })),
}));

vi.mock("@/lib/db/mongodb", () => ({
  getMongoEnvError: () => null,
  getCollections: async () => ({
    links: { deleteOne, deleteMany, updateOne: vi.fn() },
    groups: { findOne, deleteOne, deleteMany },
  }),
  withMongoTransaction: async (fn: (session: null) => Promise<unknown>) => fn(null),
}));

import { DELETE as deleteLink } from "@/app/api/trash/links/[id]/route";
import { DELETE as deleteGroup } from "@/app/api/trash/groups/[id]/route";

beforeEach(() => {
  deleteOne.mockReset();
  findOne.mockReset();
  deleteMany.mockReset();
});

describe("permanent trash deletes", () => {
  it("only deletes a link that is already in trash", async () => {
    deleteOne.mockResolvedValue({ deletedCount: 0 });
    const response = await deleteLink(new Request("http://localhost/api/trash/links/link-1"), {
      params: Promise.resolve({ id: "link-1" }),
    });
    expect(response.status).toBe(404);
    expect(deleteOne).toHaveBeenCalledWith({
      _id: "link-1",
      userId: "user-1",
      deletedAt: { $ne: null },
    });
  });

  it("refuses to purge a group that is still active", async () => {
    findOne.mockResolvedValue(null);
    const response = await deleteGroup(
      new Request("http://localhost/api/trash/groups/group-1"),
      { params: Promise.resolve({ id: "group-1" }) },
    );
    expect(response.status).toBe(404);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
