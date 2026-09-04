/**
 * MUSOU-EC 「あったらいいな」アンケート 集計用 Google Apps Script
 * ------------------------------------------------------------------
 * スプレッドシートに紐づくコンテナバインド or スタンドアロンどちらでも可。
 * 使い方は同ディレクトリの README.md を参照。
 *
 * フロント（src/lib/wishlist.ts）は下記 JSON を no-cors で POST する:
 *   投票 : { kind:"vote", owner, ts, id, active }
 *   投稿 : { kind:"idea", owner, ts, id, text, mall }
 * no-cors のため Content-Type ヘッダは落ちるが、本文は e.postData.contents で受け取れる。
 */

var SHEET_RESPONSES = 'responses';
var SHEET_IDEAS = 'ideas';
var HEADERS_RESPONSES = ['受信日時', 'kind', 'owner', 'id', 'active', 'ts(ISO)', 'raw'];
var HEADERS_IDEAS = ['受信日時', 'owner', 'id', 'mall', 'text'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return _json({ ok: false, error: 'busy' });
  }
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        // application/x-www-form-urlencoded で来た場合の保険
        if (e.parameter && e.parameter.payload) body = JSON.parse(e.parameter.payload);
      }
    }
    var ss = _ss();
    var now = new Date();
    var tsIso = body.ts ? new Date(Number(body.ts)).toISOString() : '';

    _appendRow(ss, SHEET_RESPONSES, HEADERS_RESPONSES, [
      now,
      body.kind || '',
      body.owner || '',
      body.id || '',
      body.active === undefined ? '' : body.active,
      tsIso,
      e && e.postData ? e.postData.contents : '',
    ]);

    if (body.kind === 'idea') {
      _appendRow(ss, SHEET_IDEAS, HEADERS_IDEAS, [
        now,
        body.owner || '',
        body.id || '',
        body.mall || '',
        body.text || '',
      ]);
    }
    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 集計の取り出し用（任意）。
 * GET /exec?token=XXXX  … スクリプトプロパティ ADMIN_TOKEN と一致したときだけ返す。
 * 返り値: { voteCounts: { "<id>": <active合計> }, ideas: [ {ts, owner, id, mall, text} ] }
 */
function doGet(e) {
  var token = (e && e.parameter && e.parameter.token) || '';
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN') || '';
  if (!expected || token !== expected) {
    return _json({ ok: false, error: 'forbidden' });
  }
  var ss = _ss();
  var voteCounts = {};
  var resp = ss.getSheetByName(SHEET_RESPONSES);
  if (resp && resp.getLastRow() > 1) {
    var rows = resp.getRange(2, 1, resp.getLastRow() - 1, HEADERS_RESPONSES.length).getValues();
    rows.forEach(function (r) {
      if (r[1] !== 'vote') return;
      var id = r[3];
      var delta = r[4] === true || r[4] === 'true' || r[4] === 1 ? 1 : -1;
      voteCounts[id] = (voteCounts[id] || 0) + delta;
    });
    Object.keys(voteCounts).forEach(function (k) {
      if (voteCounts[k] < 0) voteCounts[k] = 0;
    });
  }
  var ideas = [];
  var is = ss.getSheetByName(SHEET_IDEAS);
  if (is && is.getLastRow() > 1) {
    var irows = is.getRange(2, 1, is.getLastRow() - 1, HEADERS_IDEAS.length).getValues();
    ideas = irows.map(function (r) {
      return { ts: r[0], owner: r[1], id: r[2], mall: r[3], text: r[4] };
    });
  }
  return _json({ ok: true, voteCounts: voteCounts, ideas: ideas });
}

function _ss() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID プロパティが未設定です（スタンドアロンの場合は必須）');
  return SpreadsheetApp.openById(id);
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
