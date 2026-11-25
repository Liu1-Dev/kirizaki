# 雾崎来信 · 网页版

这是《雾崎来信》的纯静态网页版：像素探索 + 竖屏 AVG 三章。
入口 `index.html` 就在仓库根目录，不需要构建、后端或数据库。

## GitHub Pages

1. 在 GitHub 新建 Public 仓库（例如 `kirizaki`）。
2. 用 GitHub Desktop 把这个文件夹发布到该仓库。
3. 仓库 Settings → Pages：
   - Source：Deploy from a branch
   - Branch：`main`，文件夹：`/ (root)`
4. 等 1–2 分钟，地址为：
   `https://你的用户名.github.io/kirizaki/`

## Netlify

把整个文件夹拖到 <https://app.netlify.com/drop>，或上传同目录的部署 zip。
地址形如 `https://xxxx-xxxx.netlify.app`。

## 更新

改完游戏后，在游戏工程里运行：

```bat
python tools/make_release.py
python tools/make_deploy.py
```

然后把 `发布/网页版` 重新拖给 Netlify，或在 GitHub Desktop 里提交并推送
`发布/GitHubDesktop_仓库` 的变更。
