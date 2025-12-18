# PWA 更新通知

Drawing ExplorerはPWA（Progressive Web App）として動作し、新しいバージョンがデプロイされたときにユーザーに更新通知を表示します。

## アーキテクチャ

```
vite-plugin-pwa
    ↓
Service Worker (sw.js) + Workbox
    ↓
useRegisterSW (React Hook)
    ↓
PWAUpdatePrompt コンポーネント
```

## 更新チェックのトリガー

| タイミング | トリガー | 実装 |
|-----------|---------|------|
| アプリ起動時 | ナビゲーション | ブラウザ標準動作 |
| ページリロード | ナビゲーション | ブラウザ標準動作 |
| バックグラウンドから復帰 | `visibilitychange` イベント | `PWAUpdatePrompt.tsx` |

### バックグラウンド復帰時の更新チェック

```typescript
// PWAUpdatePrompt.tsx
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible" && registrationRef.current) {
      registrationRef.current.update()
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange)
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange)
  }
}, [])
```

## 更新フロー

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. デプロイ時                                                       │
│     pnpm build → sw.js が新しいハッシュで生成される                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  2. ユーザーがアプリを開く / バックグラウンドから復帰                  │
│     ブラウザが sw.js をサーバーから取得・比較                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  3. 新しいSWが検出された場合                                         │
│     ダウンロード → インストール → waiting 状態                        │
│     useRegisterSW の needRefresh が true になる                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  4. UI表示                                                          │
│     PWAUpdatePrompt コンポーネントが通知バナーを表示                  │
│     「アップデートがあります」                                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  5. ユーザーアクション                                                │
│     ・「今すぐ更新」→ updateServiceWorker(true) → ページリロード      │
│     ・「後で」→ バナー非表示（次回アクセスで再表示）                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Vite設定

```typescript
// vite.config.ts
VitePWA({
  registerType: "prompt",  // ユーザーに確認を求める
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    cleanupOutdatedCaches: true,
  },
  devOptions: {
    enabled: true,  // 開発環境でもPWA有効
  },
  manifest: {
    // ... manifest設定
  },
})
```

### registerType オプション

| 値 | 動作 |
|----|------|
| `"prompt"` | 更新時にユーザーに確認を求める（現在の設定） |
| `"autoUpdate"` | 自動で更新（ユーザー確認なし） |

## Render ホスティング設定

RenderのStatic Siteでホスティングする場合、`sw.js`のキャッシュを無効化する必要があります。

### 設定手順

1. **Renderダッシュボード** → 対象のStatic Siteを選択
2. **Settings** → **Headers** セクションへ
3. 以下のルールを追加：

| Path | Header Name | Header Value |
|------|-------------|--------------|
| `/sw.js` | `Cache-Control` | `no-cache, no-store, must-revalidate` |
| `/manifest.webmanifest` | `Cache-Control` | `no-cache` |
| `/assets/*` | `Cache-Control` | `public, max-age=31536000, immutable` |

### なぜ必要か

- `sw.js`がキャッシュされると、更新チェック時にCDNのキャッシュが返される
- 実際のサーバーにリクエストが到達しないため、更新が検出されない
- `no-cache`を設定することで、毎回サーバーから最新の`sw.js`を取得する

### 参考ドキュメント

- [HTTP Headers for Static Sites – Render Docs](https://render.com/docs/static-site-headers)

## 動作確認方法

### 開発環境

```bash
pnpm dev:frontend
```

1. アプリを開く
2. DevTools Console で `"SW Registered:"` を確認
3. 別タブに切り替えて戻る
4. Console で `"Page became visible, checking for SW updates..."` を確認

### 本番環境

1. デプロイ後にアプリを開く
2. DevTools → Network タブで `sw.js` のレスポンスヘッダーを確認
   - `Cache-Control: no-cache, no-store, must-revalidate` が設定されていること
3. コード変更後に再デプロイ
4. アプリをリロードまたはバックグラウンドから復帰
5. 更新通知バナーが表示されることを確認

## 関連ファイル

| ファイル | 役割 |
|----------|------|
| `frontend/apps/web/vite.config.ts` | PWAプラグイン設定 |
| `frontend/apps/web/src/components/PWAUpdatePrompt/PWAUpdatePrompt.tsx` | 更新通知UI |
| `frontend/apps/web/dist/sw.js` | ビルド生成されるService Worker |
