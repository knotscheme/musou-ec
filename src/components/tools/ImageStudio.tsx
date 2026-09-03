"use client";

import { Hub } from "@/components/tools/_hub";
import ImageResize from "@/components/tools/ImageResize";
import ImageMultisize from "@/components/tools/ImageMultisize";
import ImageBadge from "@/components/tools/ImageBadge";
import ImageMerge from "@/components/tools/ImageMerge";

export default function ImageStudio() {
  return (
    <Hub
      slug="image-studio"
      tabs={[
        { label: "リサイズ・圧縮", hint: "複数画像をまとめてリサイズ・再圧縮（サーバー送信なし）。", Comp: ImageResize },
        { label: "画像結合", hint: "複数画像を一括で読み込み、順番入れ替え・つなぎ目の余白を付けて1枚に結合。", Comp: ImageMerge },
        { label: "モール規定サイズ書き出し", hint: "1枚を楽天・Yahoo・Amazon・Instagram などの規定サイズへ一括トリミング＆書き出し。", Comp: ImageMultisize },
        { label: "帯・SALEバッジ合成", hint: "セール告知の帯・バッジを複数画像へ一括合成。", Comp: ImageBadge },
      ]}
    />
  );
}
