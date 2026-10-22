type ContentRow = { section_key: string; content: unknown };

export function mediaUsage(asset: { id: string; storage_path: string }, rows: ContentRow[]) {
  const id = asset.id.toLowerCase();
  const storage = asset.storage_path.toLowerCase();
  const encoded = storage.replaceAll("/", "%2f");
  return rows.filter(row => {
    const value = JSON.stringify(row.content ?? {}).toLowerCase();
    return value.includes(id) || value.includes(storage) || value.includes(encoded);
  }).map(row => row.section_key);
}
