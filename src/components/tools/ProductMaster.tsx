"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { CopyBox } from "@/components/CopyBox";
import { toCSV, downloadCSV } from "@/lib/csv";
import {
  CANON_ORDER,
  CANON_LABEL,
  FORMAT_LABEL,
  FORMAT_COLUMNS,
  type MallFormat,
  type CanonKey,
} from "@/lib/mallschema";
import { recordHistory } from "@/lib/history";

const SAMPLE: Partial<Record<CanonKey, string>> = {
  code: "musou-chair-01",
  name: "アウトドアチェア 軽量 折りたたみ 900g コンパクト キャンプ 椅子",
  catchcopy: "たった900g。設営10秒の軽量チェア",
  price: "4980",
  listPrice: "6800",
  stock: "50",
  jan: "4901234567894",
  brand: "MUSOU",
  material: "アルミ / 600Dポリエステル",
  size: "約W52×D48×H72cm（座面高40cm）",
  weight: "900g",
  color: "カーキ",
  description: "重量900gの超軽量アウトドアチェア。耐荷重120kg、専用収納袋つき。",
  image1: "https://example.com/img/chair-1.jpg",
  image2: "https://example.com/img/chair-2.jpg",
  image3: "https://example.com/img/chair-3.jpg",
  category: "アウトドアチェア",
  cost: "1800",
};

export default function ProductMaster() {
  const [data, setData] = useState<Partial<Record<CanonKey, string>>>(SAMPLE);

  function set(k: CanonKey, v: string) {
    setData((d) => ({ ...d, [k]: v }));
  }

  const perMall = useMemo(() => {
    const out: Record<MallFormat, { header: string[]; row: string[] }> = {} as never;
    (Object.keys(FORMAT_LABEL) as MallFormat[]).forEach((fmt) => {
      const keys = CANON_ORDER.filter((k) => k !== "cost" && (FORMAT_COLUMNS[fmt][k]?.length ?? 0) > 0);
      out[fmt] = {
        header: keys.map((k) => FORMAT_COLUMNS[fmt][k]![0]),
        row: keys.map((k) => data[k] ?? ""),
      };
    });
    return out;
  }, [data]);

  function downloadOne(fmt: MallFormat) {
    downloadCSV(`${fmt}-product`, [perMall[fmt].header, perMall[fmt].row]);
    recordHistory("product-master", `${FORMAT_LABEL[fmt]} 形式を出力`, data.name?.slice(0, 40) ?? "");
  }

  return (
    <ToolShell slug="product-master">
      <p className="text-sm text-[var(--muted)]">
        1件のマスターデータを入力すると、各モールの主要項目フォーマットへ展開します。二重入力の削減用。
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {CANON_ORDER.map((k) => (
          <label key={k} className="block text-sm">
            <span className="mb-1 block font-medium">{CANON_LABEL[k]}</span>
            {k === "description" ? (
              <textarea
                value={data[k] ?? ""}
                onChange={(e) => set(k, e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            ) : (
              <input
                value={data[k] ?? ""}
                onChange={(e) => set(k, e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            )}
          </label>
        ))}
      </div>

      <div className="space-y-4">
        {(Object.keys(FORMAT_LABEL) as MallFormat[]).map((fmt) => (
          <div key={fmt} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{FORMAT_LABEL[fmt]}</span>
              <button onClick={() => downloadOne(fmt)} className="rounded-md border px-3 py-1.5 text-xs font-semibold">
                CSVダウンロード
              </button>
            </div>
            <CopyBox
              text={toCSV([perMall[fmt].header, perMall[fmt].row])}
              rows={4}
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--muted)]">
        ※ 列名は一般的な目安です。モール固有の必須項目（配送方法、消費税区分、ジャンルID 等）は別途補完してください。
      </p>
    </ToolShell>
  );
}
