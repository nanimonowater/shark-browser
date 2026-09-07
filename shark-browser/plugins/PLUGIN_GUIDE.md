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
