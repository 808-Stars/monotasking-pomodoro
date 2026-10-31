# MONOPOMO · 单×番

效率工具前端位于`frontend/`，生产站点为 https://monopomo.pages.dev/ 。

## 构建与JRPG入口

保持Pages现有构建根目录`frontend`、构建命令`npm run build`及输出`dist`。该命令先构建效率工具，再自动运行`postbuild`，将`frontend/jrpg`构建到`dist/jrpg`；无需添加第二个Cloudflare项目或修改数据库。

登录页和登录后侧栏提供“灯火冒险”入口，游戏地址为`/jrpg/`。游戏、规则Wiki、战斗剧场及副本准备页均在`/jrpg/`下；游戏右上角可返回效率工具。游戏使用同源iframe保持逻辑画布，响应头只允许同源嵌入。

`frontend/jrpg`是当前JRPG的发布快照，不是原始美术制作目录。制作与规则源位于本地规范的`monopomo-jrpg-demo`与资料库；维护细节见[游戏发布说明](frontend/jrpg/README.md)。当前是本地存档测试版，效率系统的真实工作奖励联动、游戏云存档及公共游戏排行榜仍待单独实现。

## 本地开发

在`frontend`中安装锁文件依赖，并设置现有的`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`；勿提交环境文件或服务端密钥。运行`npm run dev`开发效率工具，运行`npm run build`生成完整发布目录。`dist`只用于构建，不提交。

本次接入不执行SQL、不重置账号或存档，也不更改效率工具的业务行为。
