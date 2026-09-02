/**
 * 薬機法（旧薬事法）・景品表示法で問題になりやすい表現の参考辞書。
 * ここでの判定は一般的な目安であり、法的助言ではない。最終判断は専門家・
 * 各モールの規約・厚労省/消費者庁のガイドラインで確認すること。
 */

export type NgCategory = "薬機法" | "景表法" | "注意";

export interface NgEntry {
  /** 検出語（部分一致） */
  word: string;
  category: NgCategory;
  /** なぜ問題になりやすいか */
  note: string;
  /** 言い換え・回避の方向性 */
  suggest: string;
}

export const NG_DICTIONARY: NgEntry[] = [
  // ── 薬機法：医薬品的な効能効果の標榜 ──
  { word: "治る", category: "薬機法", note: "疾病の治療効果を暗示（化粧品・食品・雑貨で不可）", suggest: "使用感・お手入れの表現に留める" },
  { word: "治療", category: "薬機法", note: "医療行為を想起させる", suggest: "「ケア」「サポート」等へ" },
  { word: "完治", category: "薬機法", note: "治療効果の断定", suggest: "表現を削除" },
  { word: "効く", category: "薬機法", note: "効能効果の標榜", suggest: "「気になる方に」等の訴求へ" },
  { word: "効果", category: "注意", note: "文脈により効能標榜になりうる", suggest: "客観的事実（成分量・試験名）に紐づける" },
  { word: "改善", category: "薬機法", note: "身体機能の改善を暗示", suggest: "「整える」「うるおいを与える」等へ" },
  { word: "予防", category: "薬機法", note: "疾病予防効果の標榜", suggest: "医薬品・医薬部外品以外は不可。表現削除" },
  { word: "回復", category: "薬機法", note: "身体機能の回復を暗示", suggest: "表現を削除" },
  { word: "デトックス", category: "薬機法", note: "体内浄化・排出効果の暗示", suggest: "「すっきり」等の使用感へ" },
  { word: "解毒", category: "薬機法", note: "医薬品的作用", suggest: "表現を削除" },
  { word: "血行促進", category: "薬機法", note: "血行に対する薬理作用の標榜", suggest: "医薬部外品の承認範囲のみ可。一般品は削除" },
  { word: "免疫力", category: "薬機法", note: "免疫への作用の暗示", suggest: "表現を削除" },
  { word: "痩せる", category: "薬機法", note: "痩身効果の標榜", suggest: "「スタイルケア」等、事実の範囲へ" },
  { word: "脂肪燃焼", category: "薬機法", note: "身体機能への作用", suggest: "表現を削除" },
  { word: "ダイエット効果", category: "薬機法", note: "痩身効果の標榜", suggest: "「置き換え」「低カロリー」等の事実へ" },
  { word: "アンチエイジング", category: "薬機法", note: "老化防止の暗示", suggest: "「エイジングケア＝年齢に応じたお手入れ」の定義内へ" },
  { word: "老化防止", category: "薬機法", note: "老化を防ぐ効果の標榜", suggest: "表現を削除" },
  { word: "育毛", category: "薬機法", note: "医薬部外品の承認が必要", suggest: "承認品以外は「ボリューム感」等へ" },
  { word: "発毛", category: "薬機法", note: "医薬品的効能", suggest: "表現を削除" },
  { word: "シミが消える", category: "薬機法", note: "色素沈着の治療的効果", suggest: "「メイクで隠す」「乾燥による…を防ぐ（部外品）」等へ" },
  { word: "シワがなくなる", category: "薬機法", note: "シワ改善は承認範囲が限定", suggest: "「乾燥による小じわを目立たなくする（効能評価済）」等へ" },
  { word: "殺菌", category: "薬機法", note: "医薬品的作用（雑貨・化粧品で不可）", suggest: "「清潔に保つ」等へ" },
  { word: "除菌", category: "注意", note: "対象・試験条件の明記が必要。医療的文脈は不可", suggest: "試験機関・対象菌・条件を併記" },
  { word: "抗菌", category: "注意", note: "SIAAマーク等の裏付けが必要", suggest: "加工部位・試験を明記" },
  { word: "ウイルス除去", category: "薬機法", note: "医薬品的作用の標榜", suggest: "表現を削除、または限定条件を明記" },
  { word: "花粉症に", category: "薬機法", note: "疾病名＋効果の標榜", suggest: "「花粉が気になる季節に」等へ" },
  { word: "疲労回復", category: "薬機法", note: "身体機能への効果", suggest: "「リフレッシュ」等へ" },
  { word: "便秘", category: "薬機法", note: "疾病名。改善・解消は不可", suggest: "「食物繊維入り」等の事実へ" },
  { word: "血圧", category: "薬機法", note: "血圧低下作用の標榜は不可（特保等を除く）", suggest: "表現を削除" },
  { word: "血糖値", category: "薬機法", note: "血糖に対する作用の標榜は不可（特保等を除く）", suggest: "表現を削除" },
  { word: "更年期", category: "薬機法", note: "疾病・症状名", suggest: "表現を削除" },
  { word: "不妊", category: "薬機法", note: "疾病・症状名", suggest: "表現を削除" },
  { word: "生理痛", category: "薬機法", note: "症状名＋緩和は医薬品的", suggest: "表現を削除" },
  { word: "細胞", category: "注意", note: "「細胞に働きかける」等は作用機序の標榜になりうる", suggest: "成分の説明に留める" },
  { word: "ホルモン", category: "注意", note: "ホルモンへの作用の暗示は不可", suggest: "表現を削除" },

  // ── 景表法：最上級・優良誤認・断定 ──
  { word: "最高", category: "景表法", note: "客観的根拠のない最上級表現（優良誤認）", suggest: "根拠となる調査・数値を併記、または削除" },
  { word: "最強", category: "景表法", note: "最上級表現", suggest: "削除、または比較条件を明記" },
  { word: "日本一", category: "景表法", note: "No.1表示。調査出典・範囲・時点が必要", suggest: "出典・調査期間・対象を脚注で明記" },
  { word: "世界一", category: "景表法", note: "No.1表示", suggest: "出典を明記、または削除" },
  { word: "業界初", category: "景表法", note: "「初」表示は客観的裏付けが必要", suggest: "根拠・調査主体を明記" },
  { word: "No.1", category: "景表法", note: "No.1表示のガイドライン順守が必要", suggest: "出典・時点・範囲を近接明記" },
  { word: "ナンバーワン", category: "景表法", note: "No.1表示", suggest: "出典を近接明記" },
  { word: "完全", category: "景表法", note: "「完全」「完璧」は誇大になりやすい", suggest: "範囲を限定（例：完全ガイド→網羅的に紹介）" },
  { word: "完璧", category: "景表法", note: "誇大表現", suggest: "削除" },
  { word: "絶対", category: "景表法", note: "断定・保証表現", suggest: "「〜を目指せます」等へ" },
  { word: "必ず", category: "景表法", note: "効果・結果の保証", suggest: "「個人差があります」を併記、または削除" },
  { word: "確実に", category: "景表法", note: "結果の保証", suggest: "削除" },
  { word: "100%", category: "景表法", note: "成分含有以外での使用は保証表現になりやすい", suggest: "含有率など事実に限定" },
  { word: "永久", category: "景表法", note: "永続性の保証", suggest: "「長期間」等へ、条件を明記" },
  { word: "誰でも", category: "景表法", note: "全員に効果がある旨の暗示", suggest: "対象・条件を限定" },
  { word: "万能", category: "景表法", note: "誇大表現", suggest: "用途を具体的に列挙" },
  { word: "特効", category: "薬機法", note: "特効薬を想起させる", suggest: "削除" },
  { word: "即効", category: "注意", note: "速効性の保証は誇大になりやすい", suggest: "「使ってすぐ実感したい方に」等へ" },

  // ── 二重価格・価格表示 ──
  { word: "通常価格", category: "注意", note: "二重価格。最近相当期間の販売実績が必要", suggest: "実売期間・価格の根拠を保持（証跡）" },
  { word: "定価", category: "注意", note: "メーカー希望小売価格が存在しない商品では不可", suggest: "「当店通常価格」等へ、根拠を保持" },
  { word: "セール", category: "注意", note: "対象・期間・割引率の明確化が必要", suggest: "期間と対象を明記" },
  { word: "返金保証", category: "注意", note: "条件・手続き・期間の明記が必要", suggest: "適用条件を近接明記" },
];

export interface NgHit {
  index: number;
  length: number;
  entry: NgEntry;
}

/** 入力テキストから辞書一致箇所を抽出（重複・内包はスキップ）。 */
export function scanNg(text: string): NgHit[] {
  const hits: NgHit[] = [];
  for (const entry of NG_DICTIONARY) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(entry.word, from);
      if (i === -1) break;
      hits.push({ index: i, length: entry.word.length, entry });
      from = i + entry.word.length;
    }
  }
  hits.sort((a, b) => a.index - b.index || b.length - a.length);
  const merged: NgHit[] = [];
  let end = -1;
  for (const h of hits) {
    if (h.index >= end) {
      merged.push(h);
      end = h.index + h.length;
    }
  }
  return merged;
}

export const CATEGORY_COLOR: Record<NgCategory, string> = {
  薬機法: "#bf0000",
  景表法: "#a1701c",
  注意: "#0f4fd6",
};
