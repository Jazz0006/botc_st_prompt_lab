# 源码同步与后续开发

## 首次快照

- 日期：2026-11-05（悉尼）。
- 目标仓库：`Jazz0006/botc_st_prompt_lab`，默认分支 `main`。
- 来源：现有钟楼研习所 Sites 工作目录的干净源码快照。
- Sites 源码提交：`a974f8420ac331af0aceb172f6b1442cdac28147`。
- 保留该快照的全部 134 个受 Git 跟踪文件，额外补充本 README 的运行说明及本文件。
- 本次建立独立 GitHub 提交历史；Sites 的旧 Git 提交历史没有导入。
- `.openai/hosting.json` 保留现有站点标识与 D1 绑定名，用于继续维护现有网站；该文件不含密钥，不代表任意克隆者获得部署权限。创建其他站点时应使用新站点自己的配置。

安卓模板与提示词的来源版本、酒鬼语义和研究版合同差异，见 README 原有说明及 `app/lab-data/`。

## 后续修改

建议把本仓库作为后续代码开发的主仓库。通常在分支上修改、验证后，通过 PR 合并：

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/describe-your-change
# 修改文件，运行与改动相关的验证。
git add <本次修改的文件>
git commit -m "Describe the behavior change"
git push -u origin HEAD
```

GitHub 与 Sites 是两个独立源码仓库，尚未配置自动同步或自动部署。发布网站时，需要明确选取 GitHub 的已验证提交，交给 Sites 的发布流程。若仍在 Sites 对话中直接修改网站代码，应把相应变更另行提交回本仓库，避免两边分叉。不要将 Sites 的短期访问凭据写入 Git remote、脚本或文档。

## 本次验证范围

- 静态凭据与运行目录检查：对导出的全部受跟踪源码检查私钥、常见 API token、带凭据 URL 与不应提交的运行目录，未发现匹配项；这不替代后续改动的检查。
- `node scripts/verify-lab.cjs`：通过。
- `node scripts/verify-lab-transport.cjs`：通过；使用离线模拟，没有真实付费请求。
- `node node_modules/typescript/bin/tsc --noEmit`：通过。
- 以上在现有依赖已安装的 Sites 源码目录执行。导出副本只补充文档，应用源码与来源提交保持一致。
- 本轮未重新构建、部署网站，也未验证另一台电脑的全新依赖安装或自有服务器部署。

运行数据与密钥不随代码同步；数据迁移、部署环境适配以及自动同步可作为后续单独任务。

## 首夜研究与方桌排座更新

本轮以首夜整体信息推荐为研究范围，增加 5–15 人方桌排座、两卡交换、随机排列与撤销。首夜局面 JSON 默认折叠。后续请求及逐夜演练入口收起，数据和原始资料保留。验证包括全部 480 套模板的座位引用与玩家配置、5–15 人外围位置唯一性、离线请求测试、类型检查、浏览器交换与替换撤销、手机布局及正式构建。
