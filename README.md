# adblock-filters

个人维护的一份广告域名过滤清单，网络层拦广告（uBlock Origin / AdGuard 通用）。

清单里的规则都是**整域拦截** `||域名^`，少数在别处有正经用途的域名加了 `$domain=` 作用域，只在特定站点页面上生效，不会影响你上别的网站。

## 订阅

uBlock Origin：**设置 → 规则列表 → 导入…**，粘下面任意一条，然后「应用更改」。

```
https://raw.githubusercontent.com/a39908646/adblock-filters/main/filters/ads.txt
```

国内访问 raw.githubusercontent 慢的话用 jsDelivr 镜像（同内容，CDN 加速）：

```
https://cdn.jsdelivr.net/gh/a39908646/adblock-filters@main/filters/ads.txt
```

AdGuard（浏览器扩展 / 桌面版）：**过滤器 → 自定义过滤器 → 添加自定义过滤器**，URL 同上。

订阅清单在文件头声明了 `! Expires: 2 days`，所以订阅端会每两天自动来拉一次 —— 上游改了规则，你这边不用手工更新。

## 手动导入（不想订阅）

不想让清单自动更新就用本地文件导入：下载 [`filters/ads.txt`](filters/ads.txt)，在 uBO 的「我的过滤器」里粘贴，点「应用更改」。

## 这份清单是怎么来的

不是从公开规则库抄的，是抓包实测出来的：目标站点的广告位由一批专供广告的域名下发，且域名经常换（随机子域 + 换后缀），公开规则库覆盖不到。规则按域名后缀归并，所以 `xxxxx.example.academy` 这类随机子域一条整域规则就够。

维护方式：开 devtools → Network → 按 Size 排序，把大块的第三方域名加进来；加完跑一次校验。

## 本地校验

```bash
node tools/lint.js
```

检查项：必须带 `Title` / `Expires`、规则必须是 `||host^` 形式、域名合法、全局规则不重复。CI（`.github/workflows/lint.yml`）在每次 push / PR 和每周一跑同样的检查。

## 许可

MIT，见 [LICENSE](LICENSE)。
