/**
 * ドラッグ&ドロップされた DataTransfer からファイル一覧を取り出す。
 * フォルダを落とした場合は webkitGetAsEntry で再帰的に展開する。サーバー不要。
 *
 * 返り値の path は「ドロップ起点からの相対パス」（例 "shoot/2024/IMG_0001.jpg"）。
 * 単体ファイルを落とした場合はファイル名のみ。
 */
export interface DroppedFile {
  file: File;
  path: string;
}

export async function filesFromDrop(dt: DataTransfer): Promise<DroppedFile[]> {
  const items = dt.items ? Array.from(dt.items) : [];
  const entries = items
    .filter((it) => it.kind === "file")
    .map(
      (it) =>
        (it as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.() ??
        null,
    );
  if (!entries.some(Boolean)) {
    return Array.from(dt.files ?? []).map((file) => ({ file, path: file.name }));
  }

  const out: DroppedFile[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const f = await new Promise<File | null>((res) =>
        (entry as FileSystemFileEntry).file(
          (x) => res(x),
          () => res(null),
        ),
      );
      if (f) out.push({ file: f, path: (entry.fullPath || "/" + f.name).replace(/^\/+/, "") });
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
