# AGENTS.md —— Meme Maker 开发指令

面向在本仓库工作的 AI 代理与开发者。开始任何实现前先读本文。

## 项目是什么

免登录网页版表情包生成器：模板加字 / 上传加字 / AI 文生图底图，导出无水印 PNG。
产品与设计的唯一事实来源（按顺序阅读）：

1. `docs/01-research.md` —— 需求边界与风险
2. `docs/02-prd.md` —— 功能规格与里程碑（v1.0 定稿）
3. `docs/03-tech-design.md` —— 架构、数据模型、关键流程（v1.0 定稿）

与文档冲突的想法：先提出讨论，不要擅自实现。范围外事项（GIF、账号、自由拖拽编辑器、云存储）一律不做。

## 技术栈与结构

- npm workspaces：`web/`（React 18 + TS + Vite + Tailwind v4 + react-router-dom）、`server/`（Express + TS，tsx 运行）。
- 图像渲染用原生 Canvas 2D，禁止引入重型图片编辑库。
- 核心纯逻辑在 `web/src/lib/`：`textLayout.ts`（换行/缩字号）、`render.ts`、`export.ts`、`api.ts`。
- 模板数据唯一来源：`web/public/templates/manifest.json`；每张模板必须有 `credit` 版权字段。
- 状态用 React 内置 hooks，不引全局状态库。

## 常用命令

```bash
npm install        # 根目录安装全部 workspace 依赖
npm run dev        # 前端 5173 + 后端 3001（M3 起需要）
npm run dev:web    # 仅前端（M1/M2 够用）
npm test           # vitest 单测
npm run build      # tsc 类型检查 + vite build
```

## 编码约定

- TypeScript 严格模式；类型定义集中在 `web/src/types.ts` 与 `server/src/` 内。
- 默认不写注释；仅在约束不明显时写一行 WHY。
- 组件按页面/职责拆分，单文件不堆巨型组件；纯函数与 UI 分离，纯函数必须可单测。
- 中文 UI 文案直接写在组件中，暂不做 i18n。
- 错误处理只做边界处：文件上传校验、AI 接口失败、图片加载失败（见 tech-design §6），不为内部代码加防御性兜底。
- 不做超出当前里程碑的功能，不预留"未来可能用到"的抽象。

## 安全红线

- `DASHSCOPE_API_KEY` 只允许出现在 `server/.env`（已 gitignore）；禁止写入前端代码、日志、提交记录。
- 前端禁止直连 DashScope；一切 AI 调用走 `/api/*` 代理。
- 后端只接受白名单参数（prompt ≤200 字、style 枚举），不透传任意字段。
- 用户上传的图片不得发送到任何服务器。
- 模板与字体只用可商用/开源素材，入库时登记来源。

## 验收方式（每个里程碑必做）

1. `npm test` 与 `npm run build` 通过。
2. 浏览器实测黄金路径 + 关键边界，视口覆盖 375px（手机）与 1280px（桌面）：
   - M1：选模板 → 加字（换行/缩字号/描边）→ 下载 PNG → 复制剪贴板。
   - M2：上传 JPG/PNG/WebP → 加字 → 导出；>10MB 与非法格式被拦截；非方图比例正确。
   - M3：有 Key 时 prompt → 生成 → 加字 → 导出；无 Key 时 AI 入口显示"未启用"且其余功能正常；失败/超时有明确提示与重试。
3. 未实测通过不得声称完成；无法验证 UI 时明确说明。

## 工作方式

- 按 M1 → M2 → M3 顺序推进，每个里程碑结束向用户汇报并确认后再进入下一个。
- 改动保持最小：修 bug 不顺手重构，不加未要求的功能。
- 遇到文档未覆盖的决策点：小决策自行按文档精神处理并在汇报中说明；影响产品形态/成本的决策先问用户。