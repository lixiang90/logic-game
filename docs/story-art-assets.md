# 剧情美术资产与接入记录

日期：2026-09-07。生成方式：Codex 内置 `image_gen.imagegen`；每个最终资产独立调用。未使用付费外部服务、CLI 或手绘 SVG 替代绘画场景。

## 交付与限制

- 6 套真实绘画母背景 + 4 张独立构图的地点变体，覆盖现有 10 章；均为 1672×941 WebP。
- 奥蕾莉娅保留原立绘的人脸、深蓝长发、蓝眼、白蓝长裙与金饰。6 幅表情组合包含 2 种姿态：平静引导（calm / smile / think / worry）和伸手展示（surprise / resolve）。均为 1024×1536 WebP。
- `halo-intact.svg` / `halo-cracked.svg` 为独立程序矢量几何光环，非背景替代图；可按台词即时切换。
- **真正的角色透明 alpha 尚未达到**：内置工具第一次透明生成和一次背景提取编辑都返回 RGB 三通道文件，并把棋盘格画进背景。经 `sharp.metadata()` 验证 `hasAlpha: false`。未将棋盘格成品接入。随后由内置工具重新生成纯深靛背景角色，当前界面采用明确的柔边舞台遮罩合成，不宣称这些 WebP 是透明立绘。将来取得 RGBA 立绘后可替换同名素材并移除 `story-scene__portrait` 的舞台遮罩。
- 原始生成 PNG 保留在工具返回目录；项目中采用 WebP 运行成品。Sharp 仅做格式压缩，无抠图、重画、拼接或视觉修改。

## 消费入口与行为

`src/data/story-art.ts` 只存表现元数据，`src/data/story.ts` 原剧情未改。`StoryDialog.tsx` 与独立的 `story-dialog.css` 消费统一 `assetUrl()` 和 `useVisualSettings()`。

| 章 | 地点资产 | 台词表情顺序 | 光环 |
| --- | --- | --- | --- |
| 1 | archipelago | calm → smile | 完整 |
| 2 | commutation-current | think → calm | 完整 |
| 3 | garden | smile | 完整 |
| 4 | contraction-terrace | think → calm | 完整 |
| 5 | farm | calm → smile | 完整 |
| 6 | ridge | think | 完整 |
| 7 | foundry | resolve → calm | 完整 |
| 8 | observatory | resolve | 完整 |
| 9 | negated-ruins | surprise → worry | 第一行打出“裂痕”或“fracture”后才显示裂痕；第二行保持 |
| 10 | second-gate | resolve → think | 保持裂痕，未添加治愈剧情 |

背景中第 10 章门扉仍关闭，不提前播放关卡通关结果。游戏中的门扉通关演出由既有完成事件的消费端决定。农场、交易所可共用 `/art/scenes/farm.webp`、`/art/scenes/foundry.webp`。

逐字显示期间点击/空格/Enter/右方向键先补全，再次操作继续；最后一句完成回调有重复触发保护。切换场景或语言重新开始阅读。屏幕阅读器获得整句文本，焦点保留在模态阅读操作中。减少动态模式立即呈现文本并停用淡入与光标闪烁。仅预解码下一句需要的立绘，不预取全部剧情。

## 已执行验证

- `npx tsc --noEmit --incremental false`：通过。
- `npx eslint src/components/StoryDialog.tsx src/data/story-art.ts`：通过。
- 通过 TypeScript 转译后执行独立断言：10 个地点都有独立背景文件；每章每句均有表现映射；6 类表情全部使用；中英裂痕触发点前后边界正确；第 10 章保持裂痕。
- 所有最终生成图均已视觉检视，尺寸与 RGB 格式通过元数据确认。
- 此子任务未启动开发服务器或执行构建；浏览器布局、实际交互和最终静态导出由整体集成验收执行。

## 最终提示词与来源

### archipelago

- 项目路径：`public/art/scenes/archipelago.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-6f424633-56c6-4457-8c50-513f37ee5eb5.png`
- 参考：无输入图片；文字规格生成。

```text
Use case: illustration-story. Asset type: a production landscape 16:9 painted background for a Japanese fantasy visual novel, target 2048x1152. The Syllogism Archipelago: graceful floating islands over a vast moonlit cloud sea, ivory academy colonnades, broken segments of concentric antique-gold astronomical apparatus, narrow illuminated paths connecting a few islands. Deep indigo blue with pale cyan starlight and restrained warm gold windows. One broad foreground ivory-stone balcony at lower left with a half-built geometric instrument, majestic islands layered into distance, grand open starry sky. Refined anime scenic painting, beautiful brushwork, convincing light and airy atmospheric perspective. Keep right third composition relatively calm for a transparent portrait overlay; lower quarter quiet for dialogue panel. No characters, no text, no logo, no watermark, no UI, no diagrams. A real painted environment.
```

### garden

- 项目路径：`public/art/scenes/garden.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-aba8f386-f948-4b6a-9332-439c4b8991a7.png`
- 参考：无输入图片；文字规格生成。

```text
Use case: illustration-story. Asset type: a production landscape 16:9 painted background for a Japanese fantasy visual novel, target 2048x1152. Relay Gardens: an elevated academy garden on a floating island. Sunlit ivory stone steps wind through sage greenery and delicate white/blue flower beds toward several small old-gold crystal relay obelisks and an elegant terrace. Pale wood pergola on left, geometric irrigation channel, quiet cloud ocean in distance. The architecture combines refined astronomical scholarship and gentle daily life. Warm late afternoon, delicate hand-painted anime background art with detailed foliage and atmospheric depth, restrained ivory, sage, faded gold and blue palette. Compose broad view with right third uncluttered for a tall character, lower quarter calm for dialogue. No characters, no words, no logo, no watermark, no UI.
```

### farm

- 项目路径：`public/art/scenes/farm.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-dc0df756-a463-41ff-a500-8072d8b37030.png`
- 参考：无输入图片；文字规格生成。

```text
Use case: illustration-story. Asset type: a production 16:9 landscape painted background for a Japanese fantasy visual novel and farming game, ideally 2048x1152. Create a warm sunlit floating-island garden in the same refined anime fantasy universe as Aurelia: ivory sandstone, weathered pale wood, restrained antique-gold detail, gentle sage grass, blue crystal irrigation channels. Camera: slightly elevated three-quarter view. Composition: broad continuous EMPTY flat earthy grass courtyard in the center and right 65% for the game to place exactly six interactive farm plots later; NO prepainted garden beds and NO crops in this area. Along the left edge a small pale wooden seed shed and tool shelf, at the far back low ivory railing and small geometric blue irrigation well. Floating cliff edges and cloud sea visible around the island, distant islands in soft afternoon haze. Soft painterly anime background art, natural warm sunlight, convincing hand-painted stone and wood textures, sophisticated not childish. Keep lower center clean and calm for UI. No characters, no words, no logos, no frame, no watermark. Real scenic painting, not vector illustration, not UI mockup.
```

### ridge

- 项目路径：`public/art/scenes/ridge.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-caa9f5fc-48e9-4883-bf29-1f16285ffdd0.png`
- 参考：无输入图片；文字规格生成。

```text
Use case: illustration-story. Asset type: production landscape 16:9 painted background for a Japanese fantasy visual novel, target 2048x1152. Contraposition Ridge: cool blue slate floating mountain ridge above clouds; a pale-stone switchback path turns back on itself, leading among weathered ivory academy ruins and cracked but dignified antique-gold geometric arches. Delicate windblown grasses and a few luminous blue crystals, soft lavender twilight behind distant floating mountains. The scholarly world feels ancient, contemplative and beautiful, not sinister. Fine painterly anime game background, atmospheric distance and detailed stone surfaces. A broad midground ruined arch on left, calmer right third for a transparent heroine portrait. Lower quarter low detail for dialogue UI. No characters, no text, no logos, no UI, no watermark.
```

### foundry

- 项目路径：`public/art/scenes/foundry.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-b737e28d-d194-42cc-851e-04c67e25145b.png`
- 参考：无输入图片；文字规格生成。

```text
Use case: illustration-story. Asset type: a production 16:9 landscape painted background for a Japanese fantasy visual novel and proof-tool shop, ideally 2048x1152. A quiet scholarly foundry inside an ivory-stone academy suspended over clouds. An elegant old-gold metal inference engine with concentric precision rings and a blue crystal energy chamber stands in the midground left; pale stone arches, neatly arranged small theorem-chip-like geometric metal plates on a wooden workbench, warm amber lamps. Open arched window on right shows indigo sky and floating islands. Composition: detailed workshop environment around edges and back, broad visually calm middle and lower half where shop cards or dialogue will be overlaid. Beautiful refined painted anime game background, warm amber / ivory / midnight blue palette, thin geometric constellation engravings with NO actual writing. Match a goddess with deep navy hair, ivory/navy gown and gold ornaments. No characters, no text, no mathematical lettering, no UI, no logos, no watermark. Painterly scenic art with atmosphere and material detail, not vector.
```

### observatory

- 项目路径：`public/art/scenes/observatory.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-a8dcb042-8cbb-41ed-b8ab-0192c259f92a.png`
- 参考：无输入图片；文字规格生成。

```text
Use case: illustration-story. Asset type: production landscape 16:9 painted background for a Japanese fantasy visual novel, target 2048x1152. Clavius Observatory: an elegant open-air ivory academy observatory suspended above a midnight cloud ocean. Enormous delicate antique-gold concentric astronomical rings surround a suspended blue crystal sphere on the left midground, circular stone platform with restrained geometric inlay, tall paired ivory pillars frame the starfield beyond. A beautiful incomplete-looking ring portal shape sits in the distance, currently calm and not activated. Refined painted anime fantasy environment with sophisticated light, indigo sky, pale cyan stars, warm gold lamps, detailed ivory stone. Keep right third calmer for a transparent goddess sprite, bottom quarter quiet for dialogue. No people, no actual mathematical writing, no words, no logo, no UI, no watermark.
```

### commutation-current

- 项目路径：`public/art/scenes/commutation-current.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-6d5972d0-67e8-4dfb-bdd6-1bc8ed5d6f65.png`
- 参考：public/art/scenes/archipelago.webp。

```text
Use case: illustration-story, style-transfer. Input image is mother scene style/reference. Create a DISTINCT NEW 16:9 painted location composition for chapter 2 'The Commutation Current' in this same floating ivory academy world. Main visual: two graceful flowing blue water channels and two intersecting pale stone paths cross over and under one another between closely spaced floating garden islands, suggesting exchange of order. Camera lower and closer to the flowing paths, antique gold small astronomical guides embedded in stone, distant cloud sea, refined ivory colonnade left. Blue-hour moonlight with gentle cyan water glow and warm gold windows. Match mother scene's refined anime fantasy scenic painting and atmospheric depth, but clearly different layout and focal object. Keep right third uncluttered for heroine and bottom quarter quiet. 2048x1152 target. No people, no letters, no logos, no UI, no watermark.
```

### contraction-terrace

- 项目路径：`public/art/scenes/contraction-terrace.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-a0f628b8-4db6-4ccd-b280-53bf5087289d.png`
- 参考：public/art/scenes/garden.webp。

```text
Use case: illustration-story, style-transfer. Input image is garden mother scene reference. Create a DISTINCT NEW painted 16:9 chapter 4 location 'Contraction Terrace'. A broad elevated ivory stone terrace with two converging stairways becoming one path, restrained antique-gold geometric inlay, low foliage at stone seams. At distant left beyond terrace, a clearly visible small ABANDONED pale wooden farm shed and overgrown garden island; no farmers, no crops in foreground. Afternoon sky and cloud ocean. Strong simple architecture, calm scholarly mood, warm ivory, faded sage, blue crystal details. Match mother's fine painted anime fantasy environment but new viewpoint and layout: center terrace then path leading toward abandoned farm silhouette. Right third empty enough for heroine; bottom quiet for dialogue. 2048x1152 target. No characters, no text, no logos, no UI, no watermark.
```

### negated-ruins

- 项目路径：`public/art/scenes/negated-ruins.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-feb823fd-76db-4e93-81de-5d5692415e83.png`
- 参考：public/art/scenes/ridge.webp。

```text
Use case: illustration-story, style-transfer. Input image is ridge mother scene reference. Create a DISTINCT NEW painted 16:9 chapter 9 location 'Negated Syllogism Ruins'. View from INSIDE a ruined ivory geometric colonnade, looking across an ancient circular stone dais. A fractured antique-gold astronomical ring is prominent left midground, three disconnected segments tilted slightly, small blue crystal fragments rest on stone. Broken pillars frame muted lavender twilight, floating ridges and cloud sea. Emotion contemplative, vulnerable, quiet mystery; not horror, no fire. Match mother's refined painterly anime fantasy style and stone material. New intimate ruin composition, lower environment light and clear broken geometric structures. Keep right third calm for heroine and bottom quiet for dialogue. 2048x1152 target. No character, no text, no logos, no UI, no watermark.
```

### second-gate

- 项目路径：`public/art/scenes/second-gate.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-67f74d84-2069-4373-a42b-bf66cf73e549.png`
- 参考：public/art/scenes/observatory.webp。

```text
Use case: illustration-story, style-transfer. Input image is observatory mother scene reference. Create a DISTINCT NEW painted 16:9 chapter 10 location 'The Second Gate'. Camera now faces a monumental COMPLETE closed twin ivory door within an immense antique-gold astronomical ring, on a circular academy stone platform over midnight clouds. Door panels are shut, very thin cyan light along center seam, no portal opening yet. The ring has subtle empty geometric crystal sockets, no written glyphs. Two tall elegant pillars flank the gate, constellation-filled indigo sky, restrained warm lamps. Gate dominates LEFT/CENTER composition leaving right third calm for heroine; bottom quiet for dialogue UI. Match mother's refined painted anime fantasy environment, detailed ivory/gold materials and cinematic atmospheric depth. 2048x1152 target. No characters, no text, no logo, no UI, no watermark.
```

### aurelia-calm

- 项目路径：`public/art/characters/aurelia-calm.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-6f9ec02d-5b0a-46bc-b079-3aa9dd313d30.png`
- 参考：原始 public/goddess-aurelia.png 派生的首次角色图 exec-e664d82f-f356-48a1-894a-564df7d5ad90.png；原始参考在调用前已 view_image 检视。

```text
Use case: identity-preserve. Input 1 is exact Aurelia identity/costume/pose reference. Make ONE production character sprite, 1024x1536 portrait. Preserve her exact deep navy long hair, blue eyes, blue diamond earrings, gold geometric hair jewelry, white and navy long gown with thin gold embroidery and dark fitted sash. Preserve adult anime facial proportions and elegant fully clothed costume. Remove every light-gray and white checkerboard square; background must be perfectly FLAT SOLID midnight navy #0B1425 with no texture, no gradients, no dots, no grid. No large halo anywhere; that is a separate game overlay. Neutral soft shading on character, refined anime linework. Full figure with safe margins, all hair and skirt included. Natural hands. One character only. No text, no frame, no logos. Match reference pose A: crystal held near chest, other arm relaxed. Serene calm expression, relaxed eyebrows and subtle closed-mouth smile.
```

### aurelia-smile

- 项目路径：`public/art/characters/aurelia-smile.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-075a6f26-b0ce-4427-92ad-a527fc2b1392.png`
- 参考：原始 public/goddess-aurelia.png 派生的首次角色图 exec-e664d82f-f356-48a1-894a-564df7d5ad90.png；原始参考在调用前已 view_image 检视。

```text
Use case: identity-preserve. Input 1 is exact Aurelia identity/costume/pose reference. Make ONE production character sprite, 1024x1536 portrait. Preserve her exact deep navy long hair, blue eyes, blue diamond earrings, gold geometric hair jewelry, white and navy long gown with thin gold embroidery and dark fitted sash. Preserve adult anime facial proportions and elegant fully clothed costume. Remove every light-gray and white checkerboard square; background must be perfectly FLAT SOLID midnight navy #0B1425 with no texture, no gradients, no dots, no grid. No large halo anywhere; that is a separate game overlay. Neutral soft shading on character, refined anime linework. Full figure with safe margins, all hair and skirt included. Natural hands. One character only. No text, no frame, no logos. Keep exactly the reference pose A and composition: crystal held near chest, other arm relaxed. Change only expression to a warm affectionate but restrained smile, softly lifted cheeks and kind open blue eyes, mouth slightly smiling. Same camera and body pose.
```

### aurelia-think

- 项目路径：`public/art/characters/aurelia-think.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-e4c7bc1e-4a82-478c-990b-ade92ec397ee.png`
- 参考：原始 public/goddess-aurelia.png 派生的首次角色图 exec-e664d82f-f356-48a1-894a-564df7d5ad90.png；原始参考在调用前已 view_image 检视。

```text
Use case: identity-preserve. Input 1 is exact Aurelia identity/costume/pose reference. Make ONE production character sprite, 1024x1536 portrait. Preserve her exact deep navy long hair, blue eyes, blue diamond earrings, gold geometric hair jewelry, white and navy long gown with thin gold embroidery and dark fitted sash. Preserve adult anime facial proportions and elegant fully clothed costume. Remove every light-gray and white checkerboard square; background must be perfectly FLAT SOLID midnight navy #0B1425 with no texture, no gradients, no dots, no grid. No large halo anywhere; that is a separate game overlay. Neutral soft shading on character, refined anime linework. Full figure with safe margins, all hair and skirt included. Natural hands. One character only. No text, no frame, no logos. Keep exactly reference pose A and composition: crystal held near chest, other arm relaxed. Expression is thoughtful concentration: eyes glance gently toward the crystal, slightly narrowed thoughtful eyebrows, closed neutral mouth. Same camera and body pose.
```

### aurelia-worry

- 项目路径：`public/art/characters/aurelia-worry.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-7c86d26b-fca1-4ec1-8b22-8f2f260fbed6.png`
- 参考：原始 public/goddess-aurelia.png 派生的首次角色图 exec-e664d82f-f356-48a1-894a-564df7d5ad90.png；原始参考在调用前已 view_image 检视。

```text
Use case: identity-preserve. Input image is exact identity, costume and quality reference for adult Aurelia. Create one full-body portrait sprite about 1024x1536, same recognizable face, long navy hair, blue eyes, ivory/navy embroidered gown and gold geometric ornaments, same anime drawing style. CRITICAL background: flat solid midnight navy #0B1425, no checkerboard, no scenery, no halo, no texture. Full complete figure with safe margins, refined thin linework, delicate neutral shading, natural hands. No words, no watermark, no border.  Keep original calm standing Pose A with crystal near chest, other arm relaxed. Make expression visibly WORRIED and vulnerable: inner eyebrows noticeably raised, eyes soft and slightly downcast, lips closed and faintly tense, clearly no smile. She has just confessed that she may be a forgotten theorem. No tears required. Keep costume identity exactly.
```

### aurelia-surprise

- 项目路径：`public/art/characters/aurelia-surprise.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-dd555352-7b1e-4649-8048-2329677fbccc.png`
- 参考：原始 public/goddess-aurelia.png 派生的首次角色图 exec-e664d82f-f356-48a1-894a-564df7d5ad90.png；原始参考在调用前已 view_image 检视。

```text
Use case: identity-preserve. Input image is exact identity, costume and quality reference for adult Aurelia. Create one full-body portrait sprite about 1024x1536, same recognizable face, long navy hair, blue eyes, ivory/navy embroidered gown and gold geometric ornaments, same anime drawing style. CRITICAL background: flat solid midnight navy #0B1425, no checkerboard, no scenery, no halo, no texture. Full complete figure with safe margins, refined thin linework, delicate neutral shading, natural hands. No words, no watermark, no border.  Create Pose B: spell demonstration, right arm extended to her side palm open with small blue geometric crystal floating just above palm, left hand held lightly near her own chest. Face expression noticeably SURPRISED: widened blue eyes, raised eyebrows, small parted mouth, a delicate restrained visual-novel reaction. Ensure the full extended forearm and hand fit inside image. Same heroine, no halo, no extra effects outside palm.
```

### aurelia-resolve

- 项目路径：`public/art/characters/aurelia-resolve.webp`
- 工具源图：`C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-6bb1eaeb-a6bf-486f-a1cc-71dd205ca13c.png`
- 参考：原始 public/goddess-aurelia.png 派生的首次角色图 exec-e664d82f-f356-48a1-894a-564df7d5ad90.png；原始参考在调用前已 view_image 检视。

```text
Use case: identity-preserve. Input image is exact identity, costume and quality reference for adult Aurelia. Create one full-body portrait sprite about 1024x1536, same recognizable face, long navy hair, blue eyes, ivory/navy embroidered gown and gold geometric ornaments, same anime drawing style. CRITICAL background: flat solid midnight navy #0B1425, no checkerboard, no scenery, no halo, no texture. Full complete figure with safe margins, refined thin linework, delicate neutral shading, natural hands. No words, no watermark, no border.  Create Pose B: spell demonstration, right arm extended to her side palm open with small blue geometric crystal floating just above palm, left hand held lightly near her own chest. Face expression visibly DETERMINED: steady forward blue eyes, focused eyebrows, confident closed neutral mouth with no smile. Resolute but gentle scholarly guardian. Ensure full extended hand fits the frame. Same heroine, no halo, no extra effects outside palm.
```

## 未采用的透明提取尝试

追加验证：以已接入的纯深靛底 `aurelia-calm.webp` 重新请求内置背景提取，输出 `C:\Users\ip\.codex\generated_images\01a07819-7adc-7100-9624-f3b1321682cf\exec-9cc0f0a6-b66e-4696-98e0-75b2cc4b7321.png`。结果仍把棋盘格绘入背景，Sharp 读取为 RGB 三通道、`hasAlpha: false`。按失败停止条件未扩展其余五幅，也未替换运行素材、修改 CSS 或用脚本抠图。当前累计三次真实透明请求均未取得 alpha。

```text
Remove the solid navy background from this exact character image. Return an actual transparent PNG cutout with real transparency, using the image tool's transparent-background output mode, not an illustration of a checkerboard. Preserve the character pixels, her exact face, expression, hair strands, ivory and navy gown, gold decorations, blue crystal, size, pose, and framing. The entire empty background and gaps between hair and sleeve must have alpha 0. Keep opaque character parts alpha 255 and antialiased boundaries. Do not draw white, black, gray, checkerboard or any other replacement backdrop. Output RGBA PNG with a genuine alpha channel. This is background extraction only; change nothing about the character.
```

两次请求都显式要求真正的透明背景，输出仍为 RGB。首次源图：`exec-e664d82f-f356-48a1-894a-564df7d5ad90.png`；编辑尝试：`exec-5df755da-76c2-43c2-bed1-3b29cdf44d45.png`。二者均未作为运行资产交付。

```text
Use case: background-extraction. EDIT the attached Aurelia sprite: remove EVERY pixel of the white and light gray checkerboard background, including spaces between hair strands and gaps in costume. Keep the character herself exactly unchanged. Output must be a PNG cutout with a REAL transparent alpha channel, alpha=0 outside the character, NOT a picture of transparency checker squares, NOT white, gray or black background. This is an image asset for compositing in a game: the output file must contain four channels RGBA. Preserve the delicate hair edges and all navy/ivory/gold clothing, same figure dimensions and expression. Do not create any background, checkerboard, floor, shadows, extra objects or halo. Only remove the background into actual transparency.
```
