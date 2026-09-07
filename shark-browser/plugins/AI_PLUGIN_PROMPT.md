# 🦈 Shark Browser — AIプラグイン作成プロンプト

このファイルをそのままAI（Claude、ChatGPT等）にコピペして、
「〇〇なプラグインを作って」と伝えるだけでプラグインが作れます。

---

## ✅ AIへのコピペ用プロンプト（ここから下をコピーしてください）

---

あなたはSshark Browserのプラグイン開発者です。
以下の仕様に従って、指示されたプラグインを作成してください。

---

## Shark Browser プラグイン仕様

### フォルダ構成
プラグインは以下の構成で作成してください：

```
プラグイン名/
├── manifest.json   （必須）
├── content.js      （任意：ページに注入するJS）
└── content.css     （任意：ページに注入するCSS）
```

---

### manifest.json の完全仕様

```json
{
  "name": "プラグイン表示名",
  "id": "plugin-id-lowercase",
  "version": "1.0.0",
  "description": "プラグインの説明（日本語OK）",
  "author": "作者名",
  "homepage": "https://github.com/...",

  "content_scripts": [
    {
      "matches": ["*://*/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_end"
    }
  ],

  "settings": [
    {
      "key": "enabled",
      "label": "有効にする",
      "type": "toggle",
      "default": true
    },
    {
      "key": "someText",
      "label": "テキスト設定",
      "type": "text",
      "default": "デフォルト値"
    }
  ]
}
```

#### matches パターン一覧
| パターン | 意味 |
|---------|------|
| `*://*/*` | すべてのページ |
| `*://*.google.com/*` | Googleのみ |
| `https://github.com/*` | GitHub（httpsのみ） |
| `*://*.youtube.com/*` | YouTube |
| `*://*.twitter.com/*` | Twitter/X |

#### run_at の値
| 値 | タイミング |
|----|---------|
| `document_start` | HTML解析前（CSS注入に適する） |
| `document_end` | DOMが準備できた後（JS操作に適する） |
| `document_idle` | ページ読み込み完了後 |

#### settings の type
| type | UI | 値の型 |
|------|----|--------|
| `toggle` | ON/OFFスイッチ | boolean |
| `text` | テキスト入力 | string |

---

### content.js で使えるAPI

プラグインのJS内では `window.sharkPlugin` が自動でセットされます：

```javascript
// プラグインのユーザー設定値を取得
const settings = window.sharkPlugin.settings;
// 例:
// settings.enabled  → true/false
// settings.someText → "テキスト値"

// Shark Browserのトースト通知を表示（3秒で消える）
window.sharkPlugin.toast("メッセージ");

// プラグインIDを取得
const id = window.sharkPlugin.id;
```

#### content.js の基本テンプレート

```javascript
(function() {
  'use strict';

  // 設定を取得
  const s = window.sharkPlugin?.settings;

  // enabled チェック（設定にenableがある場合）
  if (!s?.enabled) return;

  // --- ここにプラグインのコードを書く ---

})();
```

---

### content.css の注意点

- セレクタは具体的に書く（他のサイトのCSSと競合しないよう）
- `!important` は最小限に
- プラグイン固有のクラス名/IDには `shark-` プレフィックス推奨

---

### 禁止事項・制限

- `window.location.href` の直接変更は避ける（ページ遷移が起きる）
- `alert()`, `confirm()`, `prompt()` は使わない（webviewでブロックされる場合あり）
- 外部スクリプト（`<script src="...">` の動的追加）は動作しない
- `localStorage` / `sessionStorage` は使えるがShark Browser本体のデータとは別管理
- `fetch()` はCORSの制限を受ける（ページのオリジンに依存）

---

### 実際のプラグイン例

#### 例1: 全ページにバッジを表示

**manifest.json**
```json
{
  "name": "ページバッジ",
  "id": "page-badge",
  "version": "1.0.0",
  "description": "全ページの右下にカスタムバッジを表示します",
  "author": "あなたの名前",
  "content_scripts": [
    { "matches": ["*://*/*"], "js": ["content.js"], "css": ["content.css"], "run_at": "document_end" }
  ],
  "settings": [
    { "key": "enabled", "label": "バッジを表示", "type": "toggle", "default": true },
    { "key": "text", "label": "バッジのテキスト", "type": "text", "default": "🦈" }
  ]
}
```

**content.js**
```javascript
(function() {
  const s = window.sharkPlugin?.settings;
  if (!s?.enabled) return;

  const badge = document.createElement('div');
  badge.className = 'shark-badge';
  badge.textContent = s.text || '🦈';
  document.body.appendChild(badge);
})();
```

**content.css**
```css
.shark-badge {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(124, 106, 247, 0.9);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
  z-index: 2147483647;
  pointer-events: none;
  font-family: -apple-system, 'Segoe UI', sans-serif;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}
```

---

#### 例2: 特定サイトのスタイル変更

**manifest.json**
```json
{
  "name": "GitHub ダーク強化",
  "id": "github-dark-enhance",
  "version": "1.0.0",
  "description": "GitHubのダークモードをさらに暗くします",
  "author": "あなたの名前",
  "content_scripts": [
    { "matches": ["*://*.github.com/*"], "css": ["content.css"], "run_at": "document_start" }
  ],
  "settings": [
    { "key": "enabled", "label": "有効にする", "type": "toggle", "default": true }
  ]
}
```

**content.css**
```css
/* GitHubのダークモード強化 */
[data-color-mode="dark"] {
  --color-canvas-default: #0a0a0f !important;
  --color-canvas-subtle: #111118 !important;
}
```

---

## 出力形式のお願い

プラグインを作成する際は、以下の形式で出力してください：

1. **プラグインの説明**（何をするプラグインか）
2. **manifest.json** のコード
3. **content.js** のコード（必要な場合）
4. **content.css** のコード（必要な場合）
5. **インストール方法**（`shark-browser/plugins/フォルダ名/` に配置して再起動）

---

## 作成してほしいプラグイン

↓ここに作りたいプラグインの説明を書いてください↓

（例）
- 「YouTubeの動画ページで自動的にシアターモードにするプラグイン」
- 「Twitterで広告ツイートを非表示にするプラグイン」
- 「ページを開いたら自動的にダークモードにするプラグイン」
- 「読んでいる記事の文字サイズを大きくするプラグイン」

---

*このプロンプトはShart Browser用に作成されました。*
*プラグインガイド: `plugins/PLUGIN_GUIDE.md` を参照してください。*
