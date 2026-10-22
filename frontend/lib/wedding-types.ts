export type PublicWedding = {
  wedding: {
    id: string;
    groom_name: string;
    bride_name: string;
    wedding_date: string;
  };
  content: Record<string, Record<string, unknown>>;
  imageUrls: Record<string, string>;
};

export type ResolvedInvitation = {
  guest_name: string;
  wedding_slug: string;
  guest_group: "groom" | "bride";
};
