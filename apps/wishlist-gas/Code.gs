/**
 * MUSOU-EC 「あったらいいな」アンケート 集計用 Google Apps Script
 * ------------------------------------------------------------------
 * スプレッドシートにバインドして使う（拡張機能 → Apps Script）。
 * 詳細は同ディレクトリの README.md を参照。
 *
 * フロント（src/lib/wishlist.ts）は下記を送る:
 *   投票 : { kind:"vote", owner, ts, id, active }
 *   投稿 : { kind:"idea", owner, ts, id, text, mall }
 * ・ブラウザからの no-cors リクエストは Content-Type ヘッダが落ちる／
 *   /exec への POST は 302 で GET に変わることがあるため、
 *   データは「本文(JSON)」と「クエリ文字列」の両方に載せて送ってくる。
 *   よって doPost / doGet どちらで受けても書き込めるようにしてある。
 */

var SHEET_RESPONSES = 'responses';
var SHEET_IDEAS = 'ideas';
var HEADERS_RESPONSES = ['受信日時', 'kind', 'owner', 'id', 'active', 'ts(ISO)', 'raw'];
var HEADERS_IDEAS = ['受信日時', 'owner', 'id', 'mall', 'text'];

function doPost(e) {
  return _handle(e);
}

function doGet(e) {
  // ?debug=1 … 書き込み先スプレッドシートの情報を返す（原因切り分け用・認証不要）
  if (e && e.parameter && e.parameter.debug) {
    try {
      var ss = _ss();
      var names = ss.getSheets().map(function (s) {
        return s.getName() + '(' + s.getLastRow() + '行)';
      });
      return _json({
        ok: true,
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        sheets: names,
        boundVia: SpreadsheetApp.getActiveSpreadsheet() ? 'active(bound)' : 'openById(property)',
      });
    } catch (err) {
      return _json({ ok: false, error: String(err) });
    }
  }
  // kind パラメータがあれば「書き込み」。無ければ集計 JSON（ADMIN_TOKEN 必須）。
  if (e && e.parameter && e.parameter.kind) return _handle(e);
  return _adminSummary(e);
}

function _handle(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return _json({ ok: false, error: 'busy' });
  }
  try {
    var body = _readBody(e);
    if (!body || !body.kind) return _json({ ok: false, error: 'no-kind' });

    var ss = _ss();
    var now = new Date();
    var tsIso = body.ts ? new Date(Number(body.ts)).toISOString() : '';
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : JSON.stringify(body);

    _appendRow(ss, SHEET_RESPONSES, HEADERS_RESPONSES, [
      now,
      body.kind || '',
      body.owner || '',
      body.id || '',
      body.active === undefined ? '' : String(body.active),
      tsIso,
      raw,
    ]);

    if (body.kind === 'idea') {
      _appendRow(ss, SHEET_IDEAS, HEADERS_IDEAS, [now, body.owner || '', body.id || '', body.mall || '', body.text || '']);
    }
    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** 本文(JSON) → だめならクエリ文字列 の順で読む */
function _readBody(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      /* fallthrough */
    }
  }
  if (e && e.parameter && e.parameter.kind) {
    var p = e.parameter;
    return {
      kind: p.kind,
      owner: p.owner || '',
      ts: p.ts || '',
      id: p.id || '',
      active: p.active === 'true' ? true : p.active === 'false' ? false : p.active,
      text: p.text || '',
      mall: p.mall || '',
    };
  }
  return null;
}

/** GET /exec?token=XXXX で集計を返す（管理画面用・任意） */
function _adminSummary(e) {
  var token = (e && e.parameter && e.parameter.token) || '';
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN') || '';
  if (!expected || token !== expected) return _json({ ok: false, error: 'forbidden' });

  var ss = _ss();
  var voteCounts = {};
  var resp = ss.getSheetByName(SHEET_RESPONSES);
  if (resp && resp.getLastRow() > 1) {
    var rows = resp.getRange(2, 1, resp.getLastRow() - 1, HEADERS_RESPONSES.length).getValues();
    rows.forEach(function (r) {
      if (r[1] !== 'vote') return;
      var delta = r[4] === true || r[4] === 'true' || r[4] === 1 ? 1 : -1;
      voteCounts[r[3]] = (voteCounts[r[3]] || 0) + delta;
    });
    Object.keys(voteCounts).forEach(function (k) {
      if (voteCounts[k] < 0) voteCounts[k] = 0;
    });
  }
  var ideas = [];
  var is = ss.getSheetByName(SHEET_IDEAS);
  if (is && is.getLastRow() > 1) {
    ideas = is.getRange(2, 1, is.getLastRow() - 1, HEADERS_IDEAS.length).getValues().map(function (r) {
      return { ts: r[0], owner: r[1], id: r[2], mall: r[3], text: r[4] };
    });
  }
  return _json({ ok: true, voteCounts: voteCounts, ideas: ideas });
}

function _ss() {
  // スクリプトプロパティ SPREADSHEET_ID を最優先（バインド先がズレていても確実に狙える）
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('SPREADSHEET_ID プロパティを設定してください');
}

function _appendRow(ss, name, headers, values) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  sh.appendRow(values);
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
