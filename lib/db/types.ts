export type LinkMetadataStatus = "pending" | "ready";

export type UserDocument = {
  _id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: string;
  createdAt: Date;
};

export type GroupDocument = {
  _id: string;
  userId: string;
  name: string;
  sortOrder: number;
  parentGroupId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
};

export type LinkDocument = {
  _id: string;
  userId: string;
  url: string;
  title: string;
  customTitle: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  tags: string[];
  notes: string | null;
  groupId: string;
  metadataStatus: LinkMetadataStatus;
  createdAt: Date;
  deletedAt: Date | null;
};

export type UserRow = Omit<UserDocument, "_id"> & { id: string };
export type GroupRow = Omit<GroupDocument, "_id"> & { id: string };
export type LinkRow = Omit<LinkDocument, "_id"> & { id: string };

export function userDocumentToRow(document: UserDocument): UserRow {
  const { _id: id, ...fields } = document;
  return { id, ...fields };
}

export function groupDocumentToRow(document: GroupDocument): GroupRow {
  const { _id: id, ...fields } = document;
  return { id, ...fields };
}

export function linkDocumentToRow(document: LinkDocument): LinkRow {
  const { _id: id, ...fields } = document;
  return { id, ...fields };
}
