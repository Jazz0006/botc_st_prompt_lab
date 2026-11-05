# 钟楼研习所

私人、中文、移动端优先的血染钟楼 AI 研究工作台。

源码仓库：[Jazz0006/botc_st_prompt_lab](https://github.com/Jazz0006/botc_st_prompt_lab)。
现有私人站点：[打开钟楼研习所](https://clocktower-storyteller-lab-jazz.huedaloes2.chatgpt.site)。
仓库是否公开与网站的访问权限相互独立。

## 获取源码与本地运行

环境要求：Node.js >= 22.13.0、pnpm 11.25.0。使用仓库锁定的依赖版本。

```bash
git clone https://github.com/Jazz0006/botc_st_prompt_lab.git
cd botc_st_prompt_lab
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
node scripts/verify-lab.cjs
node scripts/verify-lab-transport.cjs
pnpm run build
```

首次构建后，在空的本地数据库上依次执行现有 SQL：

```bash
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_small_ultimates.sql
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_aberrant_thunderbird.sql
pnpm run dev
```

开发入口为 `http://localhost:5173`。SQL 初始化命令用于首次创建本地数据表，已有数据表时不要重复执行。本地登录使用开发模拟身份；不会访问线上数据库。HTTP 本地预览不能输入会话密钥，可以使用复制提示词、粘贴外部回答流程。以上为源码所支持的本地运行方式，首次同步未在另一台机器执行全新安装。

## 目录与部署边界

| 路径 | 内容 |
| --- | --- |
| `app/PromptLab.tsx` | 文本实验、版本、回答与比较界面 |
| `app/lab-data/` | 480 套静态阵容与 APP 提示词基线 |
| `app/lab-model.ts`、`app/lab-catalog.ts` | 文本组装、校验及模板处理 |
| `app/api/`、`app/lab-server.ts` | 请求、保存、导出等服务端功能 |
| `db/`、`drizzle/` | 数据结构与 SQL 迁移 |
| `worker/`、`vite.config.ts`、`.openai/hosting.json` | 当前 Workers／Sites 部署配置 |
| `scripts/verify-lab*.cjs` | 无需付费请求的验证脚本 |

当前部署依赖 Cloudflare Workers、D1 和 Sites 的私人访问边界。GitHub 同步不会自动发布网站；迁移到普通 Linux 服务器需要适配数据库与身份验证。生产环境不能依赖开发模拟登录，也不能直接信任来自公网客户端的身份请求头。GitHub Pages 无法运行目前的服务端与数据库功能。

数据库中的研究记录、外部回答及线上版本历史不包含在源码中，应通过站内备份／导出功能另行保存。密钥、环境文件、本地数据库、依赖目录与构建产物不提交。现有第三方组件的许可文件随源码保留；本次同步没有添加项目级开源许可证。

代码来源、同步方式和验证范围见 [源码同步说明](docs/SOURCE_SYNC.md)。

## 文本实验主流程

1. 在 APP 模板库选择人数、角色或原始模板 ID。完整静态数据为480套暗流涌动阵容（5–15人）。原始数据见 `app/lab-data/tb-presets.json`。
2. 生成局面初稿，直接编辑固定说明、局面描述、本次任务及输出要求。局面生成参考同版本 APP 请求字段，使用研习所身份与指纹，座位按模板ID固定打散，不宣称为真实安卓请求，也不自动执行游戏事件或规则。
3. 保存版本或复制完整提示词。复制会先冻结版本；相同内容合并为同一版本。浏览器限制剪贴板时提供预览、全选和手动复制。
4. 把其他聊天平台的回答粘贴回来，选择实际使用的提示词版本，记录平台、模型与人工评价。之后的草稿编辑不会改变已有快照或回答。
5. 最多同时比较三份回答、两套提示词版本。人工标签独立于模型内容；原始回答不被人工评价改写。
6. 导出当前版本的实验包（含对应回答），或载入导出包中的文本到编辑器。文本载入不导入回答，不替换原有版本。

APP基线来自 `Jazz0006/CampBoardGameHost` 的 `bc11573236866be8f649d6b26d660603fd328c79`。首夜/后续指令保留原文并解析 Kotlin 常量插值；JSON Schema 按同版源码转写为数据。额外的三方案研究版是研习所实验扩展，不是 APP 原有合同。

静态模板只维护一份，不写入每次案例快照。旧有阵容案例、演练笔记、判断标准、问题和版本记录继续保留。旧案例备份与新实验导出入口分别命名。

## 站内 API

服务端通过 `POST https://api.openai.com/v1/responses` 调用。使用者可在已发布的 HTTPS 页面输入会话密钥：仅保存于 React 页面内存，每次显式请求经本站后端发送至固定的 OpenAI 接口，不落盘、不进日志、版本或备份；刷新即清除。HTTP 预览禁止会话密钥。可选托管 secret `OPENAI_API_KEY` 若已配置则优先使用。无需额外插件。密钥缺失时复制/粘贴流程仍可正常使用。

模型、输出token上限、超时、每日请求次数和可选严格 JSON Schema 随提示词版本保存。每日最多20次（UTC日界）通过单条SQL原子领取；每次请求使用持久唯一ID，不做自动重试。先记录请求状态再请求上游，保留原始响应、用量、耗时、错误类别及人工评价。断线/超时后可能只能确认状态待核对，不声称取消了上游计算。次数/token限制不是精确金额保证。

实验 API 依赖本站已确认的所有者私人访问边界。若未来改变共享范围，先补充记录授权隔离。不要硬编码密钥或将它放入源码、提示词、持久记录。会话密钥只能位于当前页面内存和单次 HTTPS 调用中。

## 数据与兼容

旧 `workspace` 表及其格式不变。新数据分别存于 `lab_versions`（不可变请求快照）与 `lab_runs`（回答/状态/评价）。增量迁移 `0001_aberrant_thunderbird.sql` 只新增表，不删除旧数据。列表显示最近200份版本/回答，较早数据仍保留在数据库。

## 验证

- `node scripts/verify-lab.cjs`：480模板唯一性、人数/酒鬼语义、完整提示词、API参数、快照独立性及输入限制。
- `npx tsc --noEmit` 与 Sites 正式构建。
- 本地浏览器：模板筛选、保存/复制触发、修改后关联旧快照、外部回答、人工评价、双版本差异、双回答比较及390px手机排版。
- 本地D1：快照不可变、回答关联与人工评价持久化。
- `node scripts/verify-lab-transport.cjs`：离线模拟请求，验证HTTPS密钥保护、单次请求去重、超时状态与凭据排除，无真实网络或付费调用。
- 未执行付费模型调用；未配置密钥时不宣称 API 实测通过。

官方接口参考：https://developers.openai.com/api/docs/guides/text
