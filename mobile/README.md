# Kiss 字幕 · 移动端

把 YouTube 的双语字幕做成一个真正的手机 App，而不是浏览器套壳。

- **两个 Tab**：视频 / 我的
- **竖屏**：圆角视频 + 逐句双语稿，当前句紫色高亮
- **横屏**：全屏沉浸播放，顶部进度、中央控制、底部黑底双语字幕
- **订阅**：频道 RSS 汇总，支持 `@handle`、频道链接、UC ID、Takeout CSV 导入 / 导出
- **收藏**：播放器右上角心形，收藏的视频留在「我的」里
- **翻译**：微软 / 谷歌免费接口优先，失败自动切 DeepSeek；也支持 SiliconFlow、任意 OpenAI 兼容接口
- **同步**：WebDAV（默认 Koofr），订阅与设置跨设备合并
- **两端**：一套 Expo / React Native 代码，Android 与 iOS

## 技术栈

Expo SDK 58 · React Native 0.88 · React 19 · TypeScript · expo-router · zustand · react-native-webview

播放器只在视频区域使用 WebView 承载 YouTube IFrame，其余界面全部是原生控件；页面、列表、设置、订阅管理都不是网页。

## 本地开发

需要 Node.js 22.13+。

```bash
cd mobile
npm install
npx expo start
```

用 Expo Go 扫码可以预览首页、订阅和设置；播放器的 WebView / 屏幕方向能力以正式构建的 APK / IPA 为准。

### 常用命令

```bash
npm run typecheck      # TypeScript 校验
npm run prebuild:ios   # 生成 ios/（需要 macOS 才能 pod install）
npm run prebuild:android
```

## 无 Mac 构建 iOS

仓库自带 [`.github/workflows/mobile.yml`](../.github/workflows/mobile.yml)：

1. 把代码推到 `main`，或手动触发 **Actions → Build mobile apps → Run workflow**。
2. 等两个 Job 完成：
   - `kiss-subtitle-android` → `app-debug.apk`
   - `kiss-subtitle-ios-unsigned` → `KissSubtitle-unsigned.ipa`
3. Android 直接安装 APK。CI 的 debug 签名每次构建可能不同，覆盖安装失败时先卸载旧版再装。
4. iOS 用 Windows 上的 [Sideloadly](https://sideloadly.io/) 或 AltStore 自签安装 IPA：
   - 需要自己的 Apple ID（免费账号即可）
   - 免费签名 7 天过期，到期用同一个 IPA 重新签一次
   - 首次安装后到「设置 → 通用 → VPN 与设备管理」信任开发者证书

> IPA 是**未签名**的，这是刻意的：GitHub Actions 没有你的证书，Sideloadly 会在本地用你的 Apple ID 完成签名。不要把 IPA 直接传到手机上点安装，iOS 会拒绝。

## 首次配置

### 1. 添加频道

首页右上角 `+`，粘贴：

- `https://www.youtube.com/@handle`
- `https://www.youtube.com/channel/UC...`
- 单个视频链接（会自动识别频道）

也可以在「订阅管理」里导入 YouTube Takeout 的 `subscriptions.csv`。

### 2. 翻译引擎

「我的 → 翻译引擎」：

- **自动（默认）**：微软免费 → 谷歌免费 → DeepSeek
- **微软翻译**：Edge 免费接口，无需 Key
- **谷歌翻译**：网页免费接口，国内通常需要代理
- **DeepSeek**：填 API Key，质量最好；免费接口失败时才会用到
- **SiliconFlow**：国内直连，可自选模型
- **OpenAI 兼容**：自填 Base URL、模型、Key

API Key 存在系统安全存储（iOS Keychain / Android Keystore），不会写进 WebDAV。

### 3. WebDAV

默认地址已经填好：

```text
https://app.koofr.net/dav/Koofr
```

在 Koofr 网页版「设置 → 应用密码」生成一个专用密码，填到 App 里。同步文件夹默认 `KissSubtitle`，会在首次同步时自动创建。

同步内容只有：

- `subscriptions.json`：订阅列表
- `settings.json`：可同步的设置（不含 WebDAV 密码与 API Key）

两端同时修改时按并集合并订阅，设置按更新时间较新的一方覆盖。

## 播放器说明

- 竖屏：视频下方是逐句稿，点任意一句可跳转；当前句紫色 + 下划线，译文黑色加粗。
- 横屏：自动锁定横屏，顶部进度条与时间，中央上一句 / 播放 / 下一句，底部双语字幕。
- 字幕底部动作：双语模式切换、字幕样式、倍速、全屏。
- 「字幕样式」里可改字号、背景不透明度、顶部 / 底部、是否在视频画面上叠加字幕。
- 字幕轨通过 YouTube 移动客户端接口获取：网页版 `timedtext` 现在对匿名请求返回空 body，移动端接口仍能拿到正常的逐句数据。

## 已知限制

- YouTube 官方内嵌播放器不允许某些视频嵌入；这类视频会显示「在 YouTube 打开」。
- 没有字幕轨的视频无法翻译；自动字幕也不一定每句话都有。
- iOS 不支持真正的后台播放；Android 的后台音频也受系统限制，当前只保证屏幕常亮。
- 不做视频下载、不去广告、不做 4K 强制切换；画质由 YouTube 播放器决定。
- 国内网络访问 YouTube / 谷歌翻译需要自备网络条件；微软与 DeepSeek 通常可直连。

## 目录

```text
mobile/
  app/                    # expo-router 页面
    (tabs)/index.tsx      # 视频流
    (tabs)/me.tsx         # 我的
    player.tsx            # 播放器桥接（WebView + 字幕翻译）
    subscriptions.tsx     # 订阅管理
    add-subscription.tsx  # 添加频道
    settings/             # 翻译 / WebDAV / 字幕 / 关于
  src/core/               # YouTube、翻译、同步、存储
  src/ui/                 # 主题与通用组件
  assets/player/index.html # 自绘播放器
```

## 许可

GPL-3.0。播放器与字幕实现参考了 [Kiss Translator](https://github.com/fishjar/kiss-translator) 的桌面版思路；移动端是独立实现。

字幕与翻译内容仅供个人学习使用，请尊重原视频版权。
