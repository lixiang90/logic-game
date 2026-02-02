# Logic Visuals: A Logic Puzzle Game

A visual puzzle game where you prove logic theorems by building circuits on an infinite canvas. Connect nodes, manage signal flows, and solve increasingly complex logic challenges.

## Features

- **Infinite Canvas**: Zoom and pan freely to build large-scale logic circuits without boundaries.
- **Visual Logic**: Represent mathematical proofs and logic gates using intuitive visual elements.
- **Dynamic Flow**: Beautiful particle animations (with dual-direction flow) visualize the transmission of logic signals.
- **Level System**: Progressive difficulty levels that challenge your understanding of logic and circuit design.
- **Save System**: Robust progress management with auto-save functionality and multiple manual save slots.
- **Responsive Controls**: Smooth interactions including smart wire routing, block-based grid snapping, and intuitive navigation.

## How to Play

### Controls
- **Pan View**: Hold `Middle Mouse Button` or `Space + Left Click` and drag.
- **Zoom**: Use `Mouse Wheel` to zoom in/out.
- **Place Wire**: Select the Wire tool and drag between nodes.
  - **Smart Painting**: Hold `Ctrl` while dragging to continuously paint wires.
- **Delete**: Right-click on a wire or node to delete it, or use the Eraser tool.
- **Rotate Tool**: Click the tool icon or use shortcuts to rotate components (if applicable).

### Game Mechanics
1. **Goal**: Check the target formula/theorem displayed at the top of the screen.
2. **Wiring**: Connect input nodes to output nodes using the correct type of wires.
   - **Formula Wires** (Purple): Represent abstract formulas or definitions.
   - **Provable Wires** (Orange): Represent concrete proofs or derived truths.
3. **Validation**: Successfully connecting the circuit according to logic rules will complete the level.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Rendering**: HTML5 Canvas API (Custom infinite canvas engine)
- **Styling**: Tailwind CSS

---

# 逻辑可视化 (Logic Visuals): 逻辑解谜游戏

一款可视化的解谜游戏，通过在无限画布上构建电路来证明逻辑定理。连接节点，管理信号流，挑战日益复杂的逻辑难题。

## 游戏特色

- **无限画布**：自由缩放和平移，构建大规模逻辑电路，不受边界限制。
- **可视化逻辑**：使用直观的视觉元素表示数学证明和逻辑门。
- **动态流动**：精美的粒子动画（双向交错流动）展示逻辑信号的传输状态。
- **关卡系统**：循序渐进的难度设计，考验你对逻辑和电路设计的理解。
- **存档系统**：完善的进度管理，支持自动存档和多个手动存档槽位。
- **流畅操作**：支持智能导线绘制、网格吸附以及直观的视图导航。

## 玩法说明

### 操作指南
- **平移视图**：按住 `鼠标中键` 或 `空格键 + 鼠标左键` 拖动。
- **缩放视图**：滚动 `鼠标滚轮` 进行放大/缩小。
- **放置导线**：选择导线工具，在节点之间拖动。
  - **智能绘制**：按住 `Ctrl` 键并拖动鼠标可连续绘制导线。
- **删除**：右键点击导线或节点即可删除，或使用橡皮擦工具。
- **旋转工具**：点击工具图标或使用快捷键旋转组件（如适用）。

### 游戏机制
1. **目标**：查看屏幕顶部显示的目标公式或定理。
2. **连线**：使用正确类型的导线连接输入节点和输出节点。
   - **公式型导线 (Formula)**：紫色，代表抽象公式或定义。
   - **可证型导线 (Provable)**：橙色，代表具体的证明或推导出的真理。
3. **验证**：根据逻辑规则成功连接电路即可通关。

## 技术栈
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **渲染**: HTML5 Canvas API (自研无限画布引擎)
- **样式**: Tailwind CSS
