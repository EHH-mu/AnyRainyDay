# AnyRainyDay 单图雨效编辑器

这是一个基于 AnyRainyDay 的本地单图雨效编辑器。它用于打开一张 PNG/JPG/WEBP 图片，精细调整雨丝强度、折射、雨纹尺度、背景保护等参数，并导出处理后的 PNG。

## 给普通用户使用

普通用户不需要安装 Node.js、Python、Photoshop 或 FFmpeg。

请到 GitHub Releases 下载适合自己系统的压缩包：

```text
AnyRainyDay-SingleEditor-Windows.zip
AnyRainyDay-SingleEditor-Linux.zip
```

Windows 解压后双击：

```text
启动雨效编辑器.bat
```

如果启动脚本被系统策略拦截，也可以直接双击：

```text
直接打开编辑器.html
```

Linux 解压后在文件夹中打开终端，运行：

```bash
bash start-editor.sh
```

也可以直接用浏览器打开：

```text
直接打开编辑器.html
```

浏览器会自动打开类似下面的本地地址：

```text
http://127.0.0.1:5173/editor.html
```

图片只在本机浏览器里处理，不会上传到网络。

## 开发和打包

安装依赖：

```bash
pnpm install
```

本地开发运行：

```bash
pnpm editor
```

构建单图编辑器静态网页：

```bash
pnpm editor:build
```

生成可直接打开的单文件 HTML：

```bash
pnpm editor:standalone
```

生成 Windows 便携 ZIP：

```bash
pnpm single-editor:package
```

生成 Linux 便携 ZIP：

```bash
pnpm single-editor:package:linux
```

生成结果在：

```text
release/AnyRainyDay-SingleEditor-Windows.zip
release/AnyRainyDay-SingleEditor-Linux.zip
```

## GitHub Release

仓库已经包含 GitHub Actions 工作流：

```text
.github/workflows/release-single-editor.yml
```

手动运行这个 workflow 可以生成 ZIP artifact。推送 `v*` 标签时，它还会把 ZIP 附加到 GitHub Release。

## 关于批量和视频

这个便携版只打包单图编辑器。批量图片处理和 MP4 生成可以继续用源码里的脚本单独完成，不放进给普通用户双击使用的 ZIP 里。

## License

本项目基于 AnyRainyDay 和 Three.js，均使用 MIT License。详见 `LICENSE` 和 `NOTICE.txt`。
