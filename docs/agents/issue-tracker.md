# Issue Tracker：GitHub

本仓库的 Issue 和需求说明都保存为 GitHub Issue。所有操作统一使用 `gh` CLI。

## 约定

- **创建 Issue**：`gh issue create --title "..." --body "..."`。多行正文用 heredoc。
- **读取 Issue**：`gh issue view <number> --comments`，用 `jq` 过滤评论，同时获取标签。
- **列出 Issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，按需加 `--label`、`--state` 过滤。
- **评论 Issue**：`gh issue comment <number> --body "..."`
- **添加/移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

仓库信息从 `git remote -v` 推断；在克隆仓库内执行时 `gh` 会自动识别。

## PR 是否作为 triage 入口

**PR 作为请求入口：否。**（若本仓库把外部 PR 也当作功能请求处理，则改为"是"；`/triage` 会读取这个开关。）

设为"是"时，PR 会走和 Issue 相同的标签与状态流转，使用对应的 `gh pr` 命令：

- **读取 PR**：`gh pr view <number> --comments`，以及 `gh pr diff <number>` 查看 diff。
- **列出待处理的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的（排除 `OWNER`/`MEMBER`/`COLLABORATOR`）。
- **评论/打标签/关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 Issue 和 PR 共用同一套编号，裸的 `#42` 可能是任意一种：先用 `gh pr view 42` 尝试，失败再退回 `gh issue view 42`。

## 当某个技能说"发布到 issue tracker"

创建一个 GitHub Issue。

## 当某个技能说"获取对应的工单"

执行 `gh issue view <number> --comments`。

## Wayfinding 相关操作

供 `/wayfinder` 使用。**地图（map）**是一个 Issue，**子任务（child）**是它的子 Issue。

- **地图（Map）**：一个打了 `wayfinder:map` 标签的 Issue，正文包含 Notes / Decisions-so-far / Fog。用 `gh issue create --label wayfinder:map` 创建。
- **子任务（Child ticket）**：作为 GitHub sub-issue 关联到地图（通过 `gh api` 调用 sub-issues 接口）。若未开启 sub-issues，则在地图正文的任务列表里加一条，并在子 Issue 正文顶部写 `Part of #<map>`。标签用 `wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。被认领后，子 Issue 指派给负责的开发者。
- **阻塞关系（Blocking）**：使用 GitHub 原生的 issue dependencies，这是权威且在 UI 上可见的表示方式。用 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 添加依赖边，其中 `<blocker-db-id>` 是被阻塞方的数字**数据库 id**（通过 `gh api repos/<owner>/<repo>/issues/<n> --jq .id` 获取，注意不是 `#number` 也不是 `node_id`）。GitHub 会在 `issue_dependencies_summary.blocked_by` 中报告未关闭的阻塞项（这是实时的判定依据）。若 dependencies 功能不可用，则退回在子 Issue 正文顶部写 `Blocked by: #<n>, #<n>`。所有阻塞项都关闭后，该子任务才算解除阻塞。
- **frontier 查询**：列出地图下所有未关闭的子任务（`gh issue list --state open`，限定在该地图的 sub-issues / 任务列表范围内），剔除有未关闭阻塞项的（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 中有未关闭 Issue）或已被指派的；按地图中的顺序取第一个。
- **认领（Claim）**：`gh issue edit <n> --add-assignee @me`，作为本次会话的第一个写操作。
- **解决（Resolve）**：先 `gh issue comment <n> --body "<answer>"`，再 `gh issue close <n>`，最后在地图的 Decisions-so-far 里追加一条上下文指针（gist + 链接）。
