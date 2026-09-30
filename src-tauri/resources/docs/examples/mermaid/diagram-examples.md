# 図のサンプル集

Markfolio でサポートされる Mermaid と BPMN 図のサンプルです。

## Mermaid 図

Mermaid は、テキストベースで様々な種類の図を作成できるツールです。

## フローチャート

```mermaid
flowchart LR
    A[開始] --> B{条件分岐}
    B -->|Yes| C[処理A]
    B -->|No| D[処理B]
    C --> E[終了]
    D --> E
```

## シーケンス図

```mermaid
sequenceDiagram
    Alice->>John: こんにちは John、元気？
    John-->>Alice: 元気だよ！
    Alice->>John: 今度一緒にランチでも？
    John-->>Alice: いいね！
```

## クラス図

```mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    class Zebra{
        +bool is_wild
        +run()
    }
```

## 状態遷移図

```mermaid
stateDiagram-v2
    [*] --> アイドル
    アイドル --> 処理中: イベント発生
    処理中 --> 成功: 成功
    処理中 --> 失敗: エラー
    成功 --> [*]
    失敗 --> アイドル: リトライ
    失敗 --> [*]: 諦める
```

## ER 図

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses

    CUSTOMER {
        string name
        string email
        int id
    }
    ORDER {
        int order_id
        date order_date
        float total
    }
    LINE-ITEM {
        int quantity
        float price
    }
```

## ガントチャート

```mermaid
gantt
    title プロジェクトスケジュール
    dateFormat  YYYY-MM-DD
    section フェーズ1
    要件定義           :a1, 2024-01-01, 30d
    基本設計           :a2, after a1, 20d
    section フェーズ2
    詳細設計           :a3, after a2, 25d
    実装              :a4, after a3, 40d
    section フェーズ3
    テスト            :a5, after a4, 30d
    リリース          :a6, after a5, 10d
```

## 円グラフ

```mermaid
pie title プログラミング言語の使用率
    "TypeScript" : 45
    "JavaScript" : 25
    "Python" : 15
    "Go" : 10
    "その他" : 5
```

## マインドマップ

```mermaid
mindmap
  root((Markfolio))
    機能
      Markdown レンダリング
      図の表示
      ファイルツリー
      検索
    技術
      React
      TypeScript
      Vite
      Tailwind CSS
    ユースケース
      ドキュメント閲覧
      技術メモ
      プロジェクト資料
```

## タイムライン

```mermaid
timeline
    title Markfolio 開発履歴
    2024-01 : プロジェクト開始
           : 要件定義
    2024-02 : 基本設計
           : プロトタイプ作成
    2024-03 : MVP 実装
           : テスト
    2024-04 : リリース v1.0
```

## ブロック図

```mermaid
block-beta
    columns 3
    Frontend["フロントエンド"] space Backend["バックエンド"]
    space:3
    React TypeScript Vite
```

---

## BPMN 図

BPMN (Business Process Model and Notation) は、ビジネスプロセスを視覚化するための標準的な記法です。

### BPMN の特徴

- **ビジネスプロセスの可視化**: 業務フローを図で表現
- **標準化された記法**: 国際標準（ISO/IEC 19510）
- **実行可能な定義**: ワークフローエンジンで実行可能

### BPMN ファイルサンプル

以下のBPMNファイルをクリックして、実際の図を確認できます：

- [シンプルなプロセス](./bpmn/simple-process.bpmn) - 基本的な承認フロー
- [スイムレーンプロセス](./bpmn/swimlane-process.bpmn) - 複数の担当者による協調作業

### BPMN の使い方

BPMN ファイル（`.bpmn`）は、左のファイルツリーから選択するか、上記のリンクをクリックして表示できます。

**BPMN ファイルの作成方法:**

- [bpmn.io](https://bpmn.io/) などのBPMNモデリングツールで作成
- 作成したファイルを `.bpmn` 拡張子で保存
- ドキュメントディレクトリに配置

---

## 参考リンク

- [Mermaid 公式ドキュメント](https://mermaid.js.org/) - Mermaid の詳細な仕様
- [BPMN 2.0 仕様](https://www.omg.org/spec/BPMN/2.0/) - BPMN の公式仕様
- [bpmn.io](https://bpmn.io/) - BPMN モデリングツール
