# Vercel 部署指南

## 概述

本项目同时支持 Vercel 和 GitHub Pages 部署。Vercel 部署在根路径 `/`，访问地址更简洁。

**部署地址**：`https://monotasking-pomodoro.vercel.app`（或自定义域名）

---

## 部署步骤

### 第 1 步：推送代码到 GitHub

```bash
cd "C:\Users\MECHREVO\Desktop\单×番-工作法_Netlify版"
git push origin main
```

---

### 第 2 步：在 Vercel 导入项目

1. 打开 https://vercel.com
2. 点击 **"Add New..."** → **"Project"**
3. 找到 `monotasking-pomodoro` 仓库 → 点击 **"Import"**

---

### 第 3 步：配置项目

在配置页面：

| 设置项 | 值 |
|--------|-----|
| **Framework Preset** | Vite（自动检测） |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build`（默认） |
| **Output Directory** | `dist`（默认） |

> ⚠️ **Root Directory 必须设为 `frontend`**，因为 package.json 在 frontend 目录下。

---

### 第 4 步：添加环境变量

展开 **"Environment Variables"**，添加：

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://vhadyzqucouowxsyyoui.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_fe4WyR1Bwhg_jv6Mz1Vd2A_x2YzUmrV` |

> **注意**：不要设置 `VITE_BASE_PATH`，Vercel 默认使用根路径 `/`。

---

### 第 5 步：部署

1. 点击 **"Deploy"**
2. 等待 1-2 分钟构建完成
3. 完成后得到地址：`https://monotasking-pomodoro.vercel.app`

---

## 验证清单

- [ ] 能正常打开首页
- [ ] 登录功能正常
- [ ] 页面路由正常（点击侧边栏各页面）
- [ ] 刷新页面不会 404
- [ ] 扭蛋页面图片正常显示
- [ ] 藏品室图片正常显示
- [ ] 直接访问子路由正常（测试：`https://monotasking-pomodoro.vercel.app/tasks`）

---

## Vercel 优势

| 对比项 | Netlify | GitHub Pages | Vercel |
|--------|---------|--------------|--------|
| 构建额度 | 300分钟/月 ❌ | 无限 ✅ | 无限 ✅ |
| 带宽 | 100GB/月 | 100GB/月 | 100GB/月 |
| URL 形式 | 子路径 | 子路径 | **根路径** ✅ |
| 国内访问 | 慢 | 一般 | 一般 |
| 部署速度 | 快 | 1-3分钟 | 1-2分钟 |

---

## 后续更新

每次推代码到 `main` 分支，Vercel 会自动部署：

```bash
cd "C:\Users\MECHREVO\Desktop\单×番-工作法_Netlify版"
git add -A
git commit -m "描述修改"
git push origin main
```

---

## 同时使用两个平台

本项目支持同时部署到 Vercel 和 GitHub Pages：

| 平台 | 地址 | 用途 |
|------|------|------|
| Vercel | `monotasking-pomodoro.vercel.app` | 主力（URL 简洁） |
| GitHub Pages | `808-stars.github.io/monotasking-pomodoro/` | 备份 |

两个平台共享同一套代码和 Supabase 数据库，数据完全同步。

---

## 常见问题

### Q: Vercel 构建失败？
A: 检查 Root Directory 是否设为 `frontend`，环境变量是否正确。

### Q: 页面空白？
A: 打开浏览器控制台查看错误。通常是环境变量未设置。

### Q: 想用自定义域名？
A: 在 Vercel 项目 Settings → Domains 添加你的域名。

### Q: Vercel 有额度限制吗？
A: 免费版无构建额度限制，带宽 100GB/月，对个人项目足够。
