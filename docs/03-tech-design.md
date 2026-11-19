# 技术设计文档（Tech Design）—— Meme Maker

版本：v1.0
日期：2026-11-19
上游输入：[02-prd.md](./02-prd.md)

## 1. 总体架构

```
浏览器（React SPA）
 ├─ 模板库 / 上传 / 编辑器 / 导出 —— 纯前端，Canvas 2D 渲染
 └─ AI 生成 —— fetch /api/*
        │ (Vite dev proxy → localhost:3001)
        ▼
Express 小后端（仅 AI 代理，无数据库）
 └─ 通义万相 DashScope API（异步任务：提交 → 轮询）
        Key 存 server/.env，永不下发前端
```

- 无数据库、无账号、无服务端存储。模板是静态资源，随前端打包。
- M1/M2 完全不依赖后端进程；M3 才需要启动 server。

## 2. 技术栈

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 前端框架 | React 18 + TypeScript + Vite | 已确认 |
| 路由 | react-router-dom（2 条路由：`/` 模板库、`/editor` 编辑器） | 页面极少，够用 |
| 样式 | Tailwind CSS v4 | 快速搭响应式 UI，无额外组件库 |
| 图像渲染 | 原生 Canvas 2D API | 加字/描边/换行/导出全可控，零依赖 |
| 状态 | React useState/useReducer + URL 参数 | 无全局状态库必要 |
| 后端 | Node.js + Express + TypeScript（tsx 运行） | 单职责 AI 代理 |
| AI | 通义万相 `wanx2.1-t2i-turbo`（DashScope） | 已确认；turbo 快且便宜，适合斗图场景 |
| 测试 | Vitest（纯逻辑单测）+ 浏览器手动验证 | 文字换行/缩放是核心纯函数，值得单测 |

## 3. 目录结构

```
qoder_program_first/
├─ docs/                      # 本文档系列
├─ AGENTS.md
├─ package.json               # workspace 根，concurrently 一键启动
├─ web/                       # 前端
│  ├─ public/
│  │  ├─ templates/           # 底图图片 + manifest.json
│  │  └─ fonts/               # 开源中文字体（.woff2）
│  ├─ src/
│  │  ├─ pages/               # HomePage（模板库）、EditorPage
│  │  ├─ components/          # TemplateGrid、EditorCanvas、TextControls、AiPanel…
│  │  ├─ lib/
│  │  │  ├─ render.ts         # 核心：drawMeme(canvas, image, textLayers)
│  │  │  ├─ textLayout.ts     # 换行/自动缩字号纯函数（单测覆盖）
│  │  │  ├─ export.ts         # toBlob 下载 + ClipboardItem 复制
│  │  │  └─ api.ts            # /api/generate 客户端
│  │  └─ types.ts
│  └─ vite.config.ts          # /api → http://localhost:3001 代理
└─ server/                    # 后端
   ├─ src/index.ts            # Express 入口
   ├─ src/dashscope.ts        # 提交任务 / 查询任务
   └─ .env.example            # DASHSCOPE_API_KEY=
```

## 4. 核心数据模型

```ts
type Template = {
  id: string;
  name: string;
  file: string;          // /templates/xxx.png
  category: '斗图经典' | '可爱贴纸' | '动物' | '情绪';
  tags: string[];        // 搜索用
  credit: string;        // 素材来源/许可，版权清单即由此生成
};

type TextLayer = {
  text: string;
  position: 'top' | 'bottom';
  size: 's' | 'm' | 'l';            // 相对画布高度 ~6% / 9% / 13%
  color: string;                     // 预设色板
};

type MemeSource =
  | { kind: 'template'; template: Template }
  | { kind: 'upload'; dataUrl: string }
  | { kind: 'ai'; imageUrl: string; prompt: string };
```

编辑器状态 = `MemeSource + TextLayer[最多2]`，通过路由 state 从首页带入；AI 结果在编辑器页内替换 source。

## 5. 关键流程设计

### 5.1 渲染与导出（M1 核心）

1. 底图加载为 `HTMLImageElement`；画布逻辑尺寸固定短边 512，按底图比例算长边。
2. `textLayout`：按画布宽度贪心换行（中文按字、英文按词）；若行数 × 行高超出预留区（上/下各 ~30% 高度），逐级降字号直到放得下。
3. 描边规则：浅色字配黑描边、深色字配白描边（按颜色亮度判断），`lineWidth ≈ fontSize/8`，`strokeText` 后再 `fillText`。
4. 字体：默认「站酷快乐体」（OFL 开源，斗图气质），备选思源黑体；渲染前 `await document.fonts.ready`，避免字体未加载就画。
5. 导出：`canvas.toBlob('image/png')` → `<a download>`；复制：`navigator.clipboard.write([new ClipboardItem({'image/png': blobPromise})])`（blob 以 Promise 传入，保住用户激活窗口）；写入失败自动降级下载 + inline 提示；ClipboardItem 不可用时隐藏复制按钮。

### 5.2 上传（M2）

- `<input type=file accept="image/jpeg,image/png,image/webp">`，前端校验 ≤10MB。
- `FileReader → dataURL → Image`，全程不出浏览器。
- 非方图按原比例渲染导出（短边 512）。

### 5.3 AI 生成（M3）

DashScope 文生图是**异步任务**接口，流程：

```
前端 POST /api/generate {prompt, style}
后端 校验 prompt(≤200字) → 拼风格前缀 → DashScope 提交任务(异步头)
     ← 202 {taskId}
前端 每 2s GET /api/generate/:taskId
后端 查 DashScope 任务状态 → {status: pending|succeeded|failed, imageUrl?}
前端 succeeded → 图片转 dataURL(经后端代理下载，避免 CORS) → 进入编辑器
```

- 风格预设映射为 prompt 前缀（如"黑白暴走漫画风格，粗线条，表情包底图，无文字："）。
- 超时：前端 60s 停止轮询并提示重试；后端单次 DashScope 请求 15s 超时。
- 无 Key：`/api/generate` 返回 503 `{code:'AI_DISABLED'}`，前端 AI 入口显示"未启用"。
- 失败分类文案：审核拒绝 / 额度不足 / 网络超时，均提供"重试"。
- 简易防护：按 IP 内存限流（如 10 次/分钟），防止本地误刷额度；不做持久化。
- 生成图不落盘，仅内存/临时转发。

### 5.4 模板素材管线

- `manifest.json` 为唯一模板数据源，新增模板 = 放图 + 加一条记录。
- 首批 ≥12 张：开源可商用素材 + 通义万相自制（M3 联调时顺便产出），每张记录 `credit`。
- 图片统一预处理为 ≤512px、PNG/WebP，控制首屏体积。

## 6. 错误处理与边界

| 场景 | 处理 |
| --- | --- |
| 模板图加载失败 | 网格中显示占位 + 重试，不阻塞其他模板 |
| 上传超 10MB / 格式不符 | 表单即时提示，不进入编辑器 |
| 文字为空 | 允许导出纯底图 |
| 超长文字（>100 字/条） | 输入框 maxLength=100，布局再兜底缩字号 |
| AI 未配置/失败 | 见 5.3，其余功能不受影响 |
| 剪贴板 API 不可用 | 特性检测，隐藏复制按钮 |

## 7. 开发与验证命令

```bash
npm install            # 根目录，workspaces 安装
npm run dev            # concurrently: vite(5173) + server(3001)
npm run dev:web        # 仅前端（M1/M2 阶段够用）
npm test               # vitest：textLayout 等纯函数
npm run build          # tsc 类型检查 + vite build
```

每个里程碑完成后用浏览器实测黄金路径 + 边界（手机视口 375px / 桌面 1280px）。

## 8. 安全要点

- `DASHSCOPE_API_KEY` 仅在 `server/.env`（gitignore），前端与日志中不出现。
- 后端只接受白名单参数（prompt/style），不透传任意字段给 DashScope。
- 上传图片不经过服务器；AI 代理下载的图片仅转发，不存储。
- 本地阶段 CORS 仅允许 localhost；将来上线再收紧并加正式限流。

## 9. 里程碑映射

| 里程碑 | 交付物 |
| --- | --- |
| M1 | web 骨架、模板库页、编辑器页、render/textLayout/export、剪贴板复制、单测 |
| M2 | 上传入口 + 校验 + 非方图适配 |
| M3 | server 全部、AiPanel、风格预设、错误兜底、AI 自制模板入库 |