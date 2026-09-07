# 🦈 Shark Browser Plugin Guide

プラグインは `plugins/` フォルダに置くだけで自動認識されます。

## フォルダ構成

```
plugins/
└── my-plugin/
    ├── manifest.json   ← 必須：プラグイン情報
    ├── content.js      ← Webページに注入するJS（任意）
    ├── content.css     ← Webページに注入するCSS（任意）
    └── icon.png        ← アイコン（任意、64x64推奨）
```

## manifest.json の書き方

```json
{
  "name": "My Plugin",
  "id": "my-plugin",
  "version": "1.0.0",
  "description": "プラグインの説明",
  "author": "Your Name",
  "homepage": "https://github.com/yourname/my-plugin",

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
      "key": "color",
      "label": "色",
      "type": "text",
      "default": "#ff0000"
    }
  ]
}
```

## matches パターン

| パターン | 説明 |
|---------|------|
| `*://*/*` | すべてのページ |
| `*://*.google.com/*` | Googleのみ |
| `https://github.com/*` | GitHubのみ |
| `*://*.youtube.com/*` | YouTubeのみ |

## content.js で使えるAPI

プラグインのJS内では `window.sharkPlugin` オブジェクトが使えます：

```javascript
// プラグイン設定を取得
const settings = window.sharkPlugin.settings;
// 例: settings.enabled, settings.color

// トースト通知を表示
window.sharkPlugin.toast("メッセージ");

// プラグインIDを取得
const id = window.sharkPlugin.id;
```

## サンプルプラグイン

`plugins/example-hello/` を参照してください。

## GitHubで公開する方法

1. プラグインフォルダをGitHubリポジトリとして公開
2. READMEに使い方を書く
3. `shark-browser-plugin` トピックを付けると見つけやすい！

## インストール方法（ユーザー向け）

1. プラグインフォルダをダウンロード
2. `shark-browser/plugins/` に置く
3. Shark Browserを再起動
4. 設定 → プラグイン でON/OFFできます

---

## 高度な機能

### ファイル上書き（overrides）

manifest.jsonに `overrides` を追加すると、Sharkのソースファイルを上書きできます。
元のファイルは自動でバックアップされ、「元に戻す」ボタンで復元できます。

```json
{
  "name": "My Override Plugin",
  "id": "my-override",
  "overrides": {
    "my-index.html": "src/renderer/index.html"
  }
}
```

### Background.js（常駐スクリプト）

`background.js` を置くと、mainプロセスで常駐実行できます。
ページに関係なく動作し、Node.jsのAPIにアクセスできます。

```javascript
// background.js
// shark オブジェクトが渡されます
shark.log('background started!');

// 定期実行
setInterval(() => {
  shark.sendToRenderer('tick', { time: Date.now() });
}, 5000);

// rendererからのメッセージを受信
shark._onMessage = (msg) => {
  shark.log('received:', msg);
  return 'ok';
};
```

content.js側でrendererからbackgroundにメッセージを送る:
```javascript
// content.js内では使えない（webview内のため）
// renderer側（index.html）でのみ使用可能
const result = await window.shark.pluginBgMessage('my-plugin-id', { hello: 'world' });
```

### ZIPでの配布方法

プラグインフォルダをZIPに圧縮してGitHubのReleasesに配布できます。
ユーザーは「ZIPからインストール」ボタンで簡単にインストールできます。

```
my-plugin.zip
└── my-plugin/
    ├── manifest.json
    ├── content.js
    └── content.css
```

