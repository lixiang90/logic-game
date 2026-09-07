# 公共美术资产与接入记录

日期：2026-09-07。用户已批准 A–F 完整标准方案。此文件记录实际资源及维护入口；制作验收见 art-upgrade-implementation.md。

## 标题场景

- 运行文件：public/art/title-academy.webp，1672 × 941，299,102 字节，RGB。
- 来源：本次内置 imagegen 生成，非外部素材库下载。
- 生成源图：C:/Users/ip/.codex/generated_images/01a07817-2451-7621-9b43-704e9a0bd757/exec-36bf7d59-495a-4ce5-8677-40cbac260e4e.png。
- 运行压缩：scripts/art-encode.cjs，Sharp WebP quality 86 / alphaQuality 100；只做格式压缩，不重新绘画。
- 接入：StartMenu.tsx，左侧菜单安全区、右侧场景；assetUrl 兼容静态子路径。
- 实际返回尺寸小于规划的 2560 级母图目标。当前最大验收视口 1920 × 1080；保留生成源图供后续高分辨率替换。

完整生成提示词：

> Create one beautiful wide 16:9 production background illustration for a Japanese fantasy visual-novel logic game, at least 1536x864. Scene: an ancient celestial academy's open arched window and balcony overlooking an immense luminous cloud sea with floating grassy islands, waterfalls and delicate ivory ruins. Foreground right: a refined antique brass astrolabe on a stone desk, a small blue luminous crystal, books with NO readable lettering. Left third is a softly dark deep-indigo interior with gentle texture and quiet negative space for the game's menu. Right two thirds are an expansive painterly sky, late afternoon warm light to the right, teal atmospheric shadows, distant gold constellation geometry in the sky. Visual style: sophisticated hand-painted anime background art, delicate architectural linework, cinematic depth, painterly clouds, tranquil and inviting, palette navy/ivory/old gold/soft sage with cyan magic. Keep central horizon coherent and framing elegant, no people, no characters, no typography, no UI, no logos, no text, no panels. This is finished environment art for the game title screen, NOT a mockup. Output a single image.

## 原创程序绘制

以下矢量/Canvas 图形由本次实现原创绘制，未引入外部图标或字体包：

- GameIcon.tsx：统一线性操作、资源和状态图标。
- art-theme.ts：原子字母/形状/颜色映射，公式青蓝/可证金黄/通用紫色。
- render/circuit-art.ts：所有节点类型、导线、旋转端口、芯片标签与静态缩略图共用绘制器。
- render/world-art.ts：星图工作面、三类地表和岛缘、岩层、十类章节地标。
- FarmCropArt.tsx：四种作物的四个阶段及种子包，详见 farm-art-assets.md。
- LogicExchangeModal.tsx：MP 工坊仪器示意，公式由代码排版。
- 角色完整/裂痕光环 SVG 见 story-art-assets.md。

价格、定理标识、数学公式、游戏操作文字由程序输出。场景图片中没有业务文字。中英文使用系统字体栈，不额外下载字体；数学字体提供 Cambria Math / STIX / serif 回退。原音乐资源和数学数据库未改动。

## 维护规则

1. 新场景通过 art-assets.ts 的 assetUrl 获取路径；剧情通过 story-art.ts 配置。
2. 新元件预览应复用 drawCircuitItem 和真实 getNodePorts/getAbsolutePortPosition。
3. 场景先确认角色锚点、构图和可读性，再替换对应文件；不要把绘画中的文字作为真实公式。
4. 视觉偏好单独存储于 logic-game-visual-settings-v1，不改变逻辑存档 schema。
5. 图像来源与透明通道限制见 story-art-assets.md。当前角色是 RGB 深靛舞台融合；独立光环有真实 SVG 透明背景。
