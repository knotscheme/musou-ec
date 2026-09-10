/**
 * ドラッグ&ドロップされた DataTransfer からファイル一覧を取り出す。
 * フォルダを落とした場合は webkitGetAsEntry で再帰的に展開する。サーバー不要。
 */
export async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const items = dt.items ? Array.from(dt.items) : [];
  const entries = items
    .filter((it) => it.kind === "file")
    .map(
      (it) =>
        (it as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.() ??
        null,
    );
  if (!entries.some(Boolean)) return Array.from(dt.files ?? []);

  const out: File[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const f = await new Promise<File | null>((res) =>
        (entry as FileSystemFileEntry).file(
          (x) => res(x),
          () => res(null),
        ),
      );
      if (f) out.push(f);
      return;
    }
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries はバッチで返すため、空になるまで繰り返す
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((res) =>
        reader.readEntries(
          (e) => res(e),
          () => res([]),
        ),
      );
      if (!batch.length) break;
      for (const e of batch) await walk(e);
    }
  };
  for (const e of entries) if (e) await walk(e);
  return out;
}
