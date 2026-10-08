# 拾学 · GitHub 学习博客

使用 Markdown 写笔记，由 GitHub Actions 自动生成并发布到 GitHub Pages。无需后台数据库、服务器或 ChatGPT 登录。

## 功能

- 独立文章网址、分类筛选、全文搜索、标签与日期归档。
- Markdown 标题、列表、引用、表格、图片、任务列表、代码高亮与复制。
- 文章目录、相邻文章、Markdown 下载、链接复制。
- 草稿排除：`draft: true` 的文章不生成公开页面，也不进入下载目录。
- 网页写作助手：Markdown 实时预览、快捷插入、字数统计。
- 自动保存多份本地草稿，恢复、切换、新建或删除；图片附件一起保存。
- 本地图片插入与发布包 ZIP 导出（文章与图片按仓库目录打包）。
- KaTeX 行内及独立数学公式，静态文章与写作预览都支持。
- 系列名称与序号、独立系列目录、文章内同系列阅读导航。
- 深浅主题切换、响应式页面、返回顶部。
- 音乐歌单、播放暂停、切歌、音量、进度、单曲循环、本地音频选择。默认不自动播放。
- 配置域名后自动生成 RSS 与 sitemap。

## 第一次发布

1. 在 GitHub 创建公开仓库 `shixue-blog`，勾选 **Add a README file**，默认分支使用 `main`。
2. 将这个项目的全部源文件上传到仓库根目录，确保 `.github/workflows/pages.yml` 也上传。
3. 如使用其他仓库名，修改 `site.config.json` 的 `githubRepository` 为 `用户名/仓库名`。
4. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
5. 打开 **Actions**，等待 `Publish learning blog` 完成。实际网址以 Pages 设置或部署结果为准。

GitHub Pages 的国内访问仍可能受网络线路影响，不保证稳定。

## 写文章

直接在 GitHub 的 `content/posts` 新建 `.md` 文件，或使用博客的 **写笔记** 页面下载文章后上传。

```markdown
---
title: "我的学习笔记"
date: "2026-10-02"
slug: "my-first-note"
category: "编程学习"
tags: ["Python", "实践"]
summary: "可选的一句话摘要"
series: "Python 入门" # 可选，同一系列使用相同名称
seriesOrder: 1 # 可选，正整数
draft: false
---

## 今天学到了什么

在这里写正文。
```

`slug` 需要使用小写英文、数字或短横线，且不能与其他文章重复。图片放在 `public/images`，正文中写 `![描述](images/图片名.png)`。建议给文件使用英文名。

`draft: true` 仅表示不发布到生成的网站。公开仓库中的 Markdown 源文件仍然可被别人访问；不要把私密笔记提交到公开仓库。

网页写作助手使用 IndexedDB 自动保存多份草稿及图片附件，刷新后可恢复。草稿仅属于当前浏览器，不跨设备同步；清除浏览器数据会删除草稿，重要内容请导出备份。自动保存失败时页面会提示，请及时导出。

点击「导出 Markdown」得到 .md 文件；有本地图片时点击「导出发布包 ZIP」，解压后分别上传 content/posts 中的文章和 public/images 中的图片到仓库相同目录，然后提交。不会自动上传。访客可以在自己的浏览器起草，但没有仓库写入权限就无法修改博客。

公式示例：行内 `$E = mc^2$`；独立公式使用 `$$` 包裹，可跨行。代码块里的美元符号保持原样。公式和编辑器资源随网站一起部署，不依赖外部 CDN。

系列笔记填写相同的 `series`，可用 `seriesOrder` 指定顺序；没有序号的文章放在有序号文章之后，按日期从早到晚排列。未发布的草稿不会进入系列目录。

删除文章：删除对应 `.md` 文件并提交。Actions 会更新网站。初始的 `welcome.md` 是使用说明，不是作者的真实学习记录，可以修改或删除。

## 添加音乐

初始音乐是 Kevin MacLeod 的 Carefree，CC BY 4.0，播放器和 `MUSIC-CREDITS.md` 包含署名。

1. 把你有权公开使用的音频放进 `public/music`。
2. 在 `site.config.json` 的 `music` 数组添加条目：

```json
{"title":"歌曲名","artist":"作者","src":"music/your-song.mp3","source":"来源网页","license":"授权说明","licenseUrl":"授权链接"}
```

只填写真实可用的音频链接。商用平台的歌曲页面不是音频直链。访客可选择本地歌曲，文件不会上传，也不会加入公共歌单。

本地歌曲只在当前页面访问期间可用，刷新或切换页面需重新选择。页面跳转时音乐会停止。

## 修改博客介绍

编辑 `site.config.json` 的 title、subtitle、author、description 与 about。不要把密钥写入配置。

## 本地预览

安装 Node.js 22 或更新版本，然后执行：

```sh
npm ci
npm test
npm run build
npm run preview
```

浏览器打开 `http://localhost:8080`。

测试项目路径：`BASE_PATH=/shixue-blog SITE_ORIGIN=https://quietcui.github.io npm run build`。Pages 工作流自动传入实际路径，无需手工调整。

## 来源与许可

GitHub Pages 工作流参考 GitHub 官方文档：
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

此版本从原网站迁移了博客阅读设计，发布方式改为 GitHub Markdown。原网站不会自动同步后续 GitHub 内容。
