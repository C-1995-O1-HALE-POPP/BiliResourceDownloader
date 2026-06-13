# BiliResourceDownloader

![MIT](https://img.shields.io/github/license/LightQuanta/BiliResourceDownloader
)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/LightQuanta/BiliResourceDownloader/total)
![GitHub Release](https://img.shields.io/github/v/release/LightQuanta/BiliResourceDownloader)
![Platform](https://img.shields.io/badge/Platform-%20win%20|%20linux%20|%20mac-lightgrey.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/LightQuanta/BiliResourceDownloader)

多功能B站资源下载器

## 功能

- 收藏集搜索、解析与下载（包括收藏集图片、视频、表情包、对应的装扮等）
- 个性装扮搜索、解析与下载（包括空间背景图、App端皮肤、评论/动态背景、表情包、加载进度条、点赞动画等）
- 站内评论区表情包搜索、解析与下载
- 直播间：直播间封面、网页端和App端直播间背景图、UP主大表情、房间专属表情解析与下载
- 个人主页：头像、网页端和App端空间背景图、充电表情、收藏集卡牌、头像框、粉丝装扮解析与下载
- 视频封面下载
- 动态使用装扮解析，动态图片批量下载，动态九宫格图片拼接
- 部分装扮进度条使用的 [SVGA动画](https://svga.dev/) 、点赞动画使用的 [Lottie动画](https://airbnb.io/lottie/#/)
  的预览、解析与导出为序列帧图片
- ~~自定义软件背景图~~

## 下载

1. [蓝奏云（仅Windows版）](https://lightquanta.lanzn.com/inQGh2ggo60f)，密码：cx01

2. 查看项目发行版（Release），Windows用户请下载 `
biliresourcedownloader_版本号_x64-setup.exe`

## 文档

### Web UI 本机部署

Web UI 适合在浏览器中临时使用本项目功能，不需要安装桌面端。由于浏览器不能直接跨域访问 B 站接口，也不能直接设置 `Cookie` 请求头，Web UI 必须通过本项目内置的 Vite 本地代理运行，不建议将 `dist` 目录直接部署到普通静态站点。

1. 安装依赖

   ```bash
   npm install
   ```

   如果本机使用 Yarn，也可以执行：

   ```bash
   yarn install
   ```

2. 开发模式运行

   ```bash
   npm run dev -- --host 127.0.0.1
   ```

   默认端口为 `1420`。浏览器打开终端输出的本地地址即可使用。

3. 构建并以预览模式部署

   ```bash
   npm run build
   npm run preview -- --host 127.0.0.1 --port 4173
   ```

   访问 `http://127.0.0.1:4173/`。

4. 登录与下载说明

   - Web UI 的扫码登录依赖本地代理转发登录 Cookie，请保持页面从 `127.0.0.1` 或 `localhost` 的 Vite 服务访问。
   - 批量下载目录选择依赖浏览器的 File System Access API。支持该 API 的 Chromium 系浏览器可以选择本地目录并按资源结构写入文件；不支持时会回退到浏览器默认下载目录。
   - 桌面端 Tauri 版本仍然支持原生文件选择、下载和本地存储能力，长期使用建议优先使用桌面版。

### 桌面 App 打包

桌面端使用 Tauri v2 打包。打包前请先安装对应系统的 Tauri 前置依赖，包括 Rust、平台 WebView 依赖和系统构建工具；本项目的 Tauri 配置会在打包前执行 `bun run build`，因此还需要安装 Bun。

1. 安装前置工具

   - 安装 [Rust](https://www.rust-lang.org/tools/install)
   - 按照 [Tauri v2 前置依赖文档](https://v2.tauri.app/start/prerequisites/) 安装当前系统所需依赖
   - 安装 [Bun](https://bun.sh/)

2. 安装前端依赖

   ```bash
   bun install
   ```

   如果使用 npm 管理依赖，也可以执行：

   ```bash
   npm install
   ```

3. 打包 App

   ```bash
   npm run buildAll
   ```

   该脚本等价于：

   ```bash
   npm run tauri build -b
   ```

4. 查看产物

   打包完成后，安装包和可执行文件会输出到：

   ```text
   src-tauri/target/release/bundle/
   ```

   当前配置的 `bundle.targets` 为 `all`，Tauri 会为当前操作系统生成可用的安装包格式。跨平台安装包通常需要在对应系统上分别打包。

## 主要技术栈

- 软件本体使用 [Tauri框架](https://tauri.app/zh-cn/) 进行搭建
- 前端包管理使用 [bun](https://bun.sh/)
- 前端页面使用 [Vue.js](https://cn.vuejs.org/) 和 [ElementPlus](https://cn.element-plus.org/zh-CN/) 进行构建
- Wbi签名算法，App
  API签名算法，部分API的文档参考 [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect)

## TODO

- Android端支持（缺布局适配，缺文件选择、下载适配）

- 视频下载（也许会做？）

- 专栏解析

## 开源协议

本项目基于 [MIT协议](./LICENSE) 进行开源
