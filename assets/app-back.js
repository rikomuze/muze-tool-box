/* MUZE TOOL BOX：ホーム画面から開いたときだけ出す「もどる」バー
   ホーム画面アプリにはブラウザの戻るボタンがないので、各ツールの一番上に置く。
   ブラウザで開いたとき（戻るボタンがあるとき）は何もしない。 */
(function () {
  var HOME = 'https://rikomuze.github.io/muze-tool-box/';
  var standalone = false;
  try { standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) {}
  if (!standalone) return;
  if (/^\/muze-tool-box\/(index\.html)?$/.test(location.pathname)) return; // トップには出さない

  function goBack() {
    var fromHere = false;
    try { fromHere = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
    if (fromHere && history.length > 1) history.back();
    else location.href = HOME;
  }
  function mount() {
    if (document.getElementById('mtb-back')) return;
    var css = document.createElement('style');
    css.textContent =
      '#mtb-back{position:relative;z-index:50;display:flex;align-items:center;gap:8px;margin:0;padding:6px 12px;' +
      'padding-top:calc(6px + env(safe-area-inset-top,0px));background:#fff;border-bottom:1px solid rgba(40,37,54,.14);' +
      'font:700 14px/1.4 "Zen Kaku Gothic New","Hiragino Sans","Yu Gothic",sans-serif;color:#282536;letter-spacing:.02em}' +
      '#mtb-back button{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:4px 14px 4px 10px;border:1.5px solid #282536;' +
      'border-radius:999px;background:#fff;color:#282536;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '#mtb-back button:active{background:#f1ede6}' +
      '#mtb-back a{margin-left:auto;color:inherit;opacity:.6;font-size:12px;text-decoration:none}';
    document.head.appendChild(css);
    var bar = document.createElement('nav');
    bar.id = 'mtb-back';
    bar.setAttribute('aria-label', 'MUZE TOOL BOX');
    bar.innerHTML = '<button type="button"><span aria-hidden="true">←</span>もどる</button><a href="' + HOME + '">MUZE TOOL BOX</a>';
    bar.querySelector('button').addEventListener('click', goBack);
    document.body.insertBefore(bar, document.body.firstChild);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
