# 领域文档（Domain Docs）

各工程技能在探索代码库时，应当如何使用本仓库的领域文档。

## 开始探索前，先读这些

- 根目录的 **`CONTEXT.md`**；或者
- 根目录的 **`CONTEXT-MAP.md`**（如果存在）：它会指向每个上下文各自的 `CONTEXT.md`，需要读与当前主题相关的那些。
- **`docs/adr/`**：阅读与当前工作区域相关的 ADR。多上下文仓库中，还要检查 `src/<context>/docs/adr/` 下该上下文专属的决策记录。

如果这些文件都不存在，**直接跳过，保持沉默**——不要提醒它们不存在，也不要建议提前创建。`/domain-modeling` 技能（通过 `/grill-with-docs` 和 `/improve-codebase-architecture` 触发）会在术语或决策真正落地时才顺手创建它们。

## 文件结构

单一上下文仓库（大多数仓库属于这种）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文仓库（根目录存在 `CONTEXT-MAP.md`）：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 该上下文专属决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用词汇表里的术语

当你的输出要指代某个领域概念时（Issue 标题、重构提案、假设、测试名称等），必须使用 `CONTEXT.md` 里定义的那个术语，不要漂移到词汇表明确要求"避免"的同义词上。

如果你需要的概念还没进词汇表，这本身就是一个信号：要么你在发明这个项目里并不存在的说法（应该重新考虑），要么确实存在一个真实的概念空缺（记下来，留给 `/domain-modeling` 处理）。

## 主动标记与 ADR 的冲突

如果你的输出和某条已有的 ADR 相矛盾，要明确指出来，而不是悄悄地覆盖它：

> _与 ADR-0007（事件溯源订单）冲突，但这里值得重新讨论，因为……_
