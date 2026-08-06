# GitHub Pages 部署指南

## 概述

本项目已改造为适配 GitHub Pages 部署。每次推送到 `main` 分支会自动构建并部署。

**部署地址**：`https://808-stars.github.io/monotasking-pomodoro/`

---

## 部署步骤

### 第 1 步：推送代码到 GitHub

```bash
cd "C:\Users\MECHREVO\Desktop\单×番-工作法_Netlify版"
git push origin main
```

> 如果网络不通，需要开代理或配置 Git 代理：
> ```bash
> git config --global http.proxy http://127.0.0.1:你的代理端口
> git config --global https.proxy http://127.0.0.1:你的代理端口
> ```

---

### 第 2 步：设置 GitHub Secrets

1. 打开 https://github.com/808-Stars/monotasking-pomodoro
2. 点击 **Settings** → 左侧 **Secrets and variables** → **Actions**
3. 点击 **New repository secret**，添加以下两个密钥：

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://vhadyzqucouowxsyyoui.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_fe4WyR1Bwhg_jv6Mz1Vd2A_x2YzUmrV` |

---

### 第 3 步：开启 GitHub Pages

1. 在同一个仓库的 **Settings** → 左侧 **Pages**
2. **Source** 选择 **GitHub Actions**（不是 "Deploy from a branch"）
3. 保存

---

### 第 4 步：等待部署完成

1. 推送代码后，去仓库的 **Actions** 标签页
2. 你会看到一个正在运行的工作流 "Deploy to GitHub Pages"
3. 等待它变成绿色 ✅（通常 1-3 分钟）
4. 完成后访问：https://808-stars.github.io/monotasking-pomodoro/

---

## 验证清单

部署完成后，逐项检查：

- [ ] 能正常打开首页
- [ ] 登录功能正常
- [ ] 页面路由正常（点击侧边栏各页面）
- [ ] 刷新页面不会 404（测试：在任务页面按 F5）
- [ ] 扭蛋页面图片正常显示
- [ ] 藏品室图片正常显示
- [ ] 直接访问子路由正常（测试：在浏览器输入 `.../monotasking-pomodoro/tasks`）

---

## 已做的改造说明

### 1. Vite base 路径
```ts
// frontend/vite.config.ts
base: '/monotasking-pomodoro/'
```
GitHub Pages 部署在子路径下，所有资源路径需要加上仓库名前缀。

### 2. BrowserRouter basename
```tsx
// frontend/src/main.tsx
<BrowserRouter basename="/monotasking-pomodoro">
```
React Router 的所有路由自动加上仓库名前缀。

### 3. 404.html SPA 重定向
GitHub Pages 不支持服务端重定向。当用户直接访问子路由（如 `/tasks`）时：
1. 404.html 捕获请求，将路径保存到 sessionStorage
2. 跳转到首页，首页读取路径并导航到正确页面

### 4. 静态资源路径
```tsx
// 修复前
return `/items/_r${r}c${c}.webp`
// 修复后
return `${import.meta.env.BASE_URL}items/_r${r}c${c}.webp`
```

### 5. React Router Link
```tsx
// 修复前：绕过路由，刷新整个页面
<a href="/daily-plans">
// 修复后：使用路由导航
<Link to="/daily-plans">
```

---

## 后续更新流程

每次修改代码后：

```bash
cd "C:\Users\MECHREVO\Desktop\单×番-工作法_Netlify版"
git add -A
git commit -m "描述你的修改"
git push origin main
```

GitHub Actions 会自动构建和部署（1-3 分钟）。

---

## GitHub Pages 限制

| 项目 | 限制 | 说明 |
|------|------|------|
| 构建次数 | **无限制** | 公开仓库的 GitHub Actions 不限分钟数 |
| 部署频率 | 10 次/小时 | 正常开发不会触发 |
| 站点大小 | 1GB | 你的项目远小于此 |
| 带宽 | 100GB/月 | 约 5 万次访问/月 |
| 构建时间 | 10 分钟 | Vite 构建只需 1-2 分钟 |

---

## 常见问题

### Q: 部署后页面显示空白？
A: 检查 GitHub Actions 日志，看是否构建失败。通常是环境变量未设置。

### Q: 刷新页面显示 404？
A: 确认 `404.html` 文件存在于构建产物中。如果不存在，检查 `frontend/public/404.html` 是否被提交。

### Q: 图片不显示？
A: 检查浏览器控制台，确认图片路径是否正确。路径应以 `/monotasking-pomodoro/items/` 或 `/monotasking-pomodoro/acc/` 开头。

### Q: 想用自定义域名？
A: 在 GitHub 仓库 Settings → Pages → Custom domain 填写你的域名，并修改 `vite.config.ts` 中的 `base` 为 `'/'`。
