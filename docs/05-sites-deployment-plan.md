# Qoder Sites 部署方案（适配已完成，部署待命）

日期：2026-11-19
状态：§2 后端适配与 §4 前端切换已实施并本地验证（用户指示暂不部署）；云端流程待 MCP 恢复与用户指令

## 0. 前置条件与阻塞

- **Sites MCP 未连接**：本会话工具列表为空，prepare/publish/Secrets/访问策略均不可执行；恢复连接后才能走云端流程。
- **成本闸门决策待定**：公开访问 + 共享 Key 意味着陌生人可消耗百炼额度；建议闸门先行（见 §3）。
- **Key 轮换**：现 Key 曾在聊天明文出现，上线前应在百炼控制台轮换，新 Key 只录入 Sites Secrets。

## 1. 目标架构

```
Sites 静态托管：web/dist（Vite 构建产物，webDirectory）
Sites Functions（serverless）：替代常驻 Express，承载 /api/*
Sites Secrets：DASHSCOPE_API_KEY、DASHSCOPE_BASE_URL
Sites Database（若做闸门）：ai_usage 计数表
前端调用路径不变：/api/status、/api/generate、/api/generate/:taskId、/api/variations、/api/image-proxy
```

## 2. 后端适配改动清单

| # | 改动 | 说明 |
| --- | --- | --- |
| 1 | 核心逻辑复用 | `server/src/dashscope.ts / validate.ts / errors.ts` 为纯 fetch/纯函数，无 Express 依赖，直接作为 Functions 共享模块 |
| 2 | 路由改写 | 5 组路由改写为 Sites Functions（按 sites-building 参考的目录与路由约定实施）；去掉 express/dotenv/tsx 在部署路径的依赖 |
| 3 | 凭证迁移 | Key/BASE_URL 改读 Functions 的 Secret 绑定；`server/.env` 仅本地开发保留 |
| 4 | 限流改造 | 现内存 Map 限流在 serverless 多实例下失效；无闸门时依赖厂商 Throttling + 退避重试兜底；有闸门时用 Sites DB 计数（§3） |
| 5 | 载荷上限核对 | variations 现 8mb body 上限需对照 Functions 平台 payload 限制；若平台更低，客户端参考图缩至短边 768/512 以适配 |
| 6 | 超时核对 | 轮询在客户端（每次 GET 短请求）✓；提交串行 3 路约 4s ✓；image-proxy 15s ✓；对照 Functions 执行时长上限确认 |
| 7 | 本地开发保留 | Express 适配器保留供 `npm run dev`；与 Functions 共享核心模块，双适配器单核心 |

## 3. 成本闸门（建议 v1.3，决策待定）

- Sites DB 表 `ai_usage(day, ip_hash, count)`：IP 哈希存储，不存原始 IP。
- 全局每日上限默认 200 张、单 IP 每日上限默认 10 张（常量可配）。
- 超限返回 429 `{code:'DAILY_QUOTA'}`；前端专属文案"今日额度已用完，明天再来"，AI 入口置灰；`/api/status` 增加 `quotaExhausted` 字段。
- 百炼控制台开付费模式 + 预算告警作为最后兜底。
- 代价：无账号体系下共享 NAT 用户会被 IP 上限误伤；上限数值按预算调整。

## 4. 前端改动清单

- `api.ts`：识别 `DAILY_QUOTA` → 专属提示；AiPanel/VariationsPanel 读取 `quotaExhausted` 置灰。
- 构建：`npm run build -w web` → `web/dist` 作为 webDirectory（不用项目根）。
- 其余零改动（同源 /api 由 Functions 路由承接）。

## 5. 发布流程（MCP 恢复后）

1. `get_context` 确认目录与 runtime（filePreview/secretValueInput）。
2. `prepare_site`：projectRoot=本目录，webDirectory=`web/dist`，Functions 后端按参考文档输入；Secret 走设置录入流程，**不在聊天传值**。
3. `get_publish_status` 按状态表推进 → `canPublish:true` → `publish_site` → 轮询至 `published:true`。
4. 运行时验收：公网 URL 实测 generate 全链路 + variations 3 路 + image-proxy 200；无 Key/超闸门场景降级正确。
5. 访问策略改公开（独立授权步骤；用户意图已明确）。
6. Desktop 以 `show_publish_confirmation` 交付。
7. 上线后：轮换百炼 Key 并更新 Sites Secret；观察用量与告警。

## 6. 风险与回滚

- 闸门未做即公开 → 额度裸奔；**建议保持私有直到闸门完成**。
- Functions payload/时长限制未实测 → 实施时先读 sites-building 参考文档核对，再定客户端缩图尺寸。
- 回滚：保留上一 release，经 sites-management 恢复/回退；本地 Express 开发链路不受影响。
- 双适配器维护成本：核心单源，路由层薄，可接受。

## 7. 工作量估计

适配改造约 0.5 人日；成本闸门约 0.5 人日；发布+运行时验收约 0.5 人日（含 MCP 恢复等待不计）。