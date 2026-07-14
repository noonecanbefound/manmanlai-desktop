# 慢慢来 · Manmanlai

一个安静、可自定义的 Windows 休息提醒与活动计时桌面工具。

它平时只是一幅放在屏幕角落里的动态插画，不发出声音，也不强制弹窗。鼠标悬停后才显示时间、活动分类和统计信息。

## 下载

普通用户可以在 [Releases](https://github.com/noonecanbefound/manmanlai-desktop/releases) 页面下载最新的 Windows 版本。

> 当前项目仍处于早期版本。未签名的 Windows 程序首次运行时可能显示 SmartScreen 提示。

## 功能

- 20、30、45 分钟休息周期，支持随时 Reset
- 苹果逐渐缩小并被吃掉，最终变成果核
- 鱼缸按每 5 分钟一条鱼连续渐入；不同周期显示 4、6 或 9 条鱼
- 柔和、赛博、自动三种视觉风格
- 学习、AI、B站及自定义活动分类
- 一次只记录一个活动，可独立暂停和继续
- 最近 7 天的本机活动统计
- 电脑重启后自动清空的临时随手记
- 多显示器支持、窗口拖动和位置记忆
- 可选开机启动
- 无声音、无强制弹窗

## 隐私与数据

慢慢来是本地优先的单机应用：

- 不需要账号
- 不上传使用数据
- 不包含遥测或广告
- 统计和设置保存在 Windows 本机应用数据目录中
- 当前只保留最近 7 天的统计

## 本地开发

需要 Node.js 和 npm。

```powershell
npm.cmd install
npm.cmd start
```

代码检查：

```powershell
npm.cmd run check
```

打包 Windows 便携版：

```powershell
npm.cmd run pack
```

生成文件位于 `dist` 文件夹。

## 项目结构

```text
src/
  assets/       插画素材
  index.html    界面结构
  styles.css    视觉样式与动画
  renderer.js   计时、统计和交互逻辑
  main.js       Electron 窗口与系统功能
  preload.js    安全的主进程通信桥
```

## 参与改进

欢迎通过 Issues 提交问题和建议。功能仍在逐步完善，尤其是插画动画、可访问性和 Windows 发布体验。

## License

[MIT](LICENSE)

---

**Manmanlai** is a quiet, local-first Windows break reminder and activity timer. It stays as a subtle animated illustration until hovered, stores only seven days of local statistics, and includes no telemetry or cloud account.
