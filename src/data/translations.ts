export type Language = 'en' | 'zh';

export type TranslationKey = 
    | 'gameTitle'
    | 'newGame'
    | 'continue'
    | 'loadGame'
    | 'settings'
    | 'language'
    | 'bgmVolume'
    | 'stage'
    | 'chapter'
    | 'coins'
    | 'stage2Map'
    | 'mainIsland'
    | 'revealedFog'
    | 'theoremChips'
    | 'revealedIslands'
    | 'mainObjective'
    | 'supportIslands'
    | 'optionalIslands'
    | 'completedIsland'
    | 'revealed'
    | 'collectedTheorems'
    | 'noTheoremsCollected'
    | 'theoremCost'
    | 'freeUsesRemaining'
    | 'theoremBar'
    | 'theoremLibrary'
    | 'firstUseFree'
    | 'notEnoughCoinsForTheorem'
    | 'hiddenInFog'
    | 'slot'
    | 'emptySlot'
    | 'load'
    | 'level' // For "Level 1" -> "Level" + " 1" or "第 1 关" logic
    | 'nextLevel'
    | 'levelComplete'
    | 'goal'
    | 'freeBuild'
    | 'back'
    | 'saveGame'
    | 'mainMenu'
    | 'resetView'
    | 'tools'
    | 'atoms'
    | 'gates'
    | 'axioms'
    | 'rules'
    | 'display'
    | 'cancel'
    | 'greatJob'
    | 'logicWire'
    | 'provableWire'
    | 'pressToSwitch'
    | 'selected'
    | 'autoSave'
    // Tutorial
    | 'tut-step-prev' | 'tut-step-next' | 'tut-skip' | 'tut-hide' | 'tut-finish'
    | 'tut-l1-start' 
    | 'tut-l1-pick-p' | 'tut-l1-place-p'
    | 'tut-l1-pick-not' | 'tut-l1-place-not'
    | 'tut-l1-pick-wire' 
    | 'tut-l1-connect-1' | 'tut-l1-connect-2'
    | 'tut-l1-finish'
    | 'tut-l2-start'
    | 'tut-l2-pick-p' | 'tut-l2-place-p'
    | 'tut-l2-pick-q' | 'tut-l2-place-q'
    | 'tut-l2-pick-implies' | 'tut-l2-place-implies'
    | 'tut-l2-pick-wire'
    | 'tut-l2-wire-p' | 'tut-l2-wire-q' | 'tut-l2-connect-goal'
    | 'tut-l3-combined'
    | 'tut-l4-combined' | 'tut-l5-combined'
    | 'tut-l6-combined' | 'tut-l7-combined'
    | 'tut-l8-combined' | 'tut-l9-combined'
    | 'tut-l10-combined'
    | 'tut-l11-start' | 'tut-l11-navigation' | 'tut-l11-objective'
    | 'tut-l11-islands' | 'tut-l11-theorems' | 'tut-l11-wires' | 'tut-l11-finish'
    | 'stage2-intro-text'
    | 'stage2-island-desc-main' | 'stage2-island-desc-support'
    | 'returnToGame'
    | 'theoremInputs' | 'theoremOutputs' | 'theoremVariables' | 'theoremPremises'
    | 'selectTheoremChip'
    | 'newFolder' | 'rootFolder' | 'moveToFolder'
    | 'folderName' | 'folderNamePlaceholder' | 'create'
    | 'saveSuccess' | 'ok'
    // Level Titles and Descriptions
    | 'level-1-title' | 'level-1-desc'
    | 'level-2-title' | 'level-2-desc'
    | 'level-3-title' | 'level-3-desc'
    | 'level-4-title' | 'level-4-desc'
    | 'level-5-title' | 'level-5-desc'
    | 'level-6-title' | 'level-6-desc'
    | 'level-7-title' | 'level-7-desc'
    | 'level-8-title' | 'level-8-desc'
    | 'level-9-title' | 'level-9-desc'
    | 'level-10-title' | 'level-10-desc'
    | 'level-11-title' | 'level-11-desc'
    ;

export const translations: Record<Language, Record<string, string>> = {
    en: {
        gameTitle: 'Logic Circuits',
        newGame: 'New Game',
        continue: 'Continue',
        loadGame: 'Load Game',
        settings: 'Settings',
        language: 'Language',
        bgmVolume: 'Music Volume',
        stage: 'Stage',
        chapter: 'Chapter',
        coins: 'Coins',
        stage2Map: 'Floating Islands',
        mainIsland: 'Main Island',
        revealedFog: 'Revealed Fog',
        theoremChips: 'Theorem Chips',
        revealedIslands: 'Revealed Islands',
        mainObjective: 'Main Objective',
        supportIslands: 'Support Islands',
        optionalIslands: 'Optional Islands',
        completedIsland: 'Completed',
        revealed: 'Revealed',
        collectedTheorems: 'Collected Theorems',
        noTheoremsCollected: 'No theorem chips collected yet.',
        theoremCost: 'Cost',
        freeUsesRemaining: 'Free Uses',
        theoremBar: 'Theorems',
        theoremLibrary: 'Theorem Library',
        firstUseFree: 'First use free',
        notEnoughCoinsForTheorem: 'Not enough coins to place this theorem chip again.',
        hiddenInFog: 'Hidden by fog',
        slot: 'Slot',
        emptySlot: 'Empty Slot',
        load: 'Load',
        level: 'Level',
        nextLevel: 'Next Level',
        levelComplete: 'Level Complete!',
        goal: 'Goal',
        freeBuild: 'Free Build',
        back: 'Back',
        saveGame: 'Save Game',
        mainMenu: 'Main Menu',
        resetView: 'Reset View',
        tools: 'Tools',
        atoms: 'Atoms',
        gates: 'Gates',
        axioms: 'Axioms',
        rules: 'Rules',
        display: 'Display',
        cancel: 'Cancel',
        greatJob: 'Great job!',
        logicWire: 'Logic Wire',
        provableWire: 'Provable Wire',
        pressToSwitch: 'Press T to switch variant',
        selected: 'SELECTED',
        autoSave: 'Auto Save',
        
        // Tutorial
        'tut-step-prev': 'Previous',
        'tut-step-next': 'Next',
        'tut-skip': 'Skip Tutorial',
        'tut-hide': 'Hide Hint',
        'tut-finish': 'Finish',
        'tut-l1-start': 'Welcome! Your goal is to build logic circuits. In this level, we need to output ¬P (Not P).',
        'tut-l1-pick-p': 'First, select the Atom P from the toolbar.',
        'tut-l1-place-p': 'Place Atom P at the marked position (dashed outline).',
        'tut-l1-pick-not': 'Now select the Not gate (¬).',
        'tut-l1-place-not': 'Place the Not gate at the marked position.\nTip: Press "R" to rotate, Right-click to delete.',
        'tut-l1-pick-wire': 'Select the Logic Wire tool.',
        'tut-l1-connect-1': 'Connect the output of Atom P to the input of the Not gate.',
        'tut-l1-connect-2': 'Connect the output of the Not gate to the Central Goal Block input.',
        'tut-l1-finish': 'Excellent! The circuit matches the goal. The level is complete.',
        
        // Level 2
        'tut-l2-start': 'Level 2: Implication\n\nYour goal is to build the formula P → Q. This requires two atoms and an Implication gate.',
        'tut-l2-pick-p': 'First, select the Atom P from the toolbar.',
        'tut-l2-place-p': 'Place Atom P at the marked position (dashed outline).',
        'tut-l2-pick-q': 'Now select the Atom Q from the toolbar.',
        'tut-l2-place-q': 'Place Atom Q at the marked position.',
        'tut-l2-pick-implies': 'Select the Implication gate (→). It has two inputs: the first for the antecedent, the second for the consequent.',
        'tut-l2-place-implies': 'Place the Implication gate at the marked position.\nTip: Press "R" to rotate, Right-click to delete.',
        'tut-l2-pick-wire': 'Select the Logic Wire tool to connect the components.',
        'tut-l2-wire-p': 'Connect Atom P to the top input (in0) of the Implication gate. Draw the wires following the dotted outline.\n\nClick "Next" when done.',
        'tut-l2-wire-q': 'Connect Atom Q to the bottom input (in1) of the Implication gate.\n\nClick "Next" when done.',
        'tut-l2-connect-goal': 'Connect the output of the Implication gate to the Central Goal Block input to complete the level!',

        // Level 3
        'tut-l3-combined': 'Level 3: Nested Implication\n\nGoal: (P -> Q) -> R\n\nThis requires chaining gates. First connect P and Q to an Implication gate, then connect its output to another Implication gate with R.\n\nNew Tool: Display!\nA Display shows the visual representation of any connected formula. Connect a wire (blue or yellow) to see its graphical form.\n\nTesting Tip: Click on any Atom to toggle it True/False and verify your circuit.',

        // Level 4
        'tut-l4-combined': 'Level 4: Axiom I (P -> (Q -> P))\n\nAxiom I produces a Provable Formula (Yellow wire) from input formulas (Blue wires).\n\nWire Types:\n• Blue: Formula (Data)\n• Yellow: Provable (Theorem)\n• Tip: Press "T" to switch wire type.\n\nTo prove R -> (P -> R):\n1. Place "Axiom 1".\n2. Connect R to input A (Blue).\n3. Connect P to input B (Blue).\n4. Connect output to Goal (Yellow).\n\nWarning: Match wire and port colors! If you connect the wrong wire type or merge different signals, the wire/port will flash to indicate an error.',

        // Level 5
        'tut-l5-combined': 'Level 5: Complex Substitution\n\nGoal: P -> ((P -> P) -> P)\n\nThis is still Axiom I form: A -> (B -> A), but B is a complex formula (P -> P).\n\n1. Construct P -> P (Blue wires).\n2. Use Axiom 1 with A = P and B = (P -> P).\n3. The Axiom output is Provable (Yellow).\n\nReminder: Press "T" to toggle between Blue (Formula) and Yellow (Provable) wires. Flashing lights indicate a connection error!',

        // Level 6
        'tut-l6-combined': 'Level 6: Modus Ponens (MP)\n\nThis level introduces the Modus Ponens (MP) rule: If P is true, and P -> Q is true, then Q is true.\n\nInstructions:\n1. Place the "Modus Ponens" node.\n2. Connect Atom P to the MP\'s first BLUE input port (in1).\n3. Connect Atom Q to the MP\'s second BLUE input port (in2).\n4. Connect the left premise |-P (Yellow wire) to the MP\'s first YELLOW input port (in3).\n5. Connect the left premise |-(P->Q) (Yellow wire) to the MP\'s second YELLOW input port (in4).\n6. Connect the MP output to the goal.\n\nTip: If you hide this hint, you can always click the "❓" button in the top right corner to show it again.',

        // Level 7
        'tut-l7-combined': 'Level 7: MP2 Theorem\n\nGoal: Prove |-R from |-P, |-Q, and |-(P→(Q→R))\n\nThis requires using Modus Ponens twice:\n\nFirst MP:\n• Use |-P and |-(P→(Q→R)) to derive |-(Q→R)\n• Connect P and (Q→R) as the formula inputs\n• Connect |-P and |-(P→(Q→R)) as the provable inputs\n\nSecond MP:\n• Use |-Q and |-(Q→R) to derive |-R\n• Connect Q and R as the formula inputs\n• Connect |-Q and |-(Q→R) as the provable inputs\n\nFinally, connect the second MP output to the goal.\n\nNew Tool: Wire Bridge!\nThe Wire Bridge (⛩) allows wires to cross without merging. Use it when you need to route wires that would otherwise create unwanted connections. Place it between crossing wires and connect the wires to its ports.',
        
        // Level 8
        'tut-l8-combined': 'Level 8: Axiom II\n\nAxiom II states: (A -> (B -> C)) -> ((A -> B) -> (A -> C)).\n\nGoal: (¬P -> (Q -> ¬R)) -> ((¬P -> Q) -> (¬P -> ¬R))\n\nThis matches Axiom II where:\nA = ¬P\nB = Q\nC = ¬R\n\nUse Axiom II node and construct the inputs A, B, C.\nUse Large Display to verify complex formulas!',

        // Level 9
        'tut-l9-combined': 'Level 9: Combined Proof\n\nGoal: ((P -> ¬(Q -> ¬R)) -> (P -> P))\n\nLet w = ¬(Q -> ¬R).\nTarget: (P -> w) -> (P -> P)\n\nSteps:\n1. Construct w = ¬(Q -> ¬R) using gates.\n2. Use Axiom I with A=P, B=w to get |-(P -> (w -> P)).\n3. Use Axiom II with A=P, B=(w->P), C=P to get |-((P -> (w -> P)) -> ((P -> w) -> (P -> P))).\n4. Use MP with results from 2 and 3 to get final result.\n\nUse Large Display to verify complex formulas!',

        // Level 10
        'tut-l10-combined': 'Level 10: Boss Level - Identity Theorem\n\nGoal: Prove |- (P -> P)\n\nThis is a Boss Level! You need to combine Axiom I, II, and MP yourself to complete the proof.\n\nHint:\nYou need to construct an intermediate step using Axiom I and II to derive:\n|- (P -> ((P -> P) -> P)) -> ((P -> (P -> P)) -> (P -> P))\nThen use MP and Axiom I to eliminate the antecedent.',

        // Level 11 (Stage 2)
        'tut-l11-start': 'Stage 2: Floating Islands\n\nWelcome to the overworld. You will explore islands, collect theorem chips, and use them to prove the main theorem.',
        'tut-l11-navigation': 'Navigation:\n• Drag with mouse to pan the map\n• Mouse wheel to zoom\n• WASD to move (hold Shift to move faster)\n\nTip: You can build while moving.',
        'tut-l11-objective': 'Main objective:\nOn the Main Island, you have premise chips (yellow outputs). Prove the goal theorem from these premises.\n\nSupport islands provide optional theorem chips. Some may help, some may not—and you can still choose not to use them even if they help.',
        'tut-l11-islands': 'Islands & fog:\nThe right panel lists the islands in this stage.\n• Revealed: shows name and goal\n• Hidden by fog: locked for now\n\nSupport/optional islands are optional. You can decide whether to unlock and complete them.\nClick any revealed island to jump to it. Completing islands reveals more.',
        'tut-l11-theorems': 'Theorem chips & coins:\nCompleting an island lets you collect its theorem chip.\nPlacing a theorem chip is free for the first use; afterwards it costs coins.\n\nYou don\'t have to use every theorem chip you unlock.\nOptional islands are good for earning extra coins.',
        'tut-l11-wires': 'Wire colors matter:\n• Blue = Formula (data)\n• Yellow = Provable (⊢)\n\nPress T to toggle wire type. Wrong connections will flash.',
        'tut-l11-finish': 'You are ready.\nExplore support islands, collect useful theorems, then return to the Main Island and prove the goal!',

        'stage2-intro-text': 'The world extends infinitely. Unlock islands, prove goals, and collect theorem chips.',
        'stage2-island-desc-main': 'Main objective island.',
        'stage2-island-desc-support': 'Support theorem island.',

        'returnToGame': 'Return to Game',
        'theoremInputs': 'Inputs',
        'theoremOutputs': 'Outputs',
        'theoremVariables': 'Variables (Formula)',
        'theoremPremises': 'Premises (Provable)',
        'selectTheoremChip': 'Select Theorem Chip',
        'newFolder': 'New Folder',
        'rootFolder': 'Root',
        'moveToFolder': 'Move To',
        'folderName': 'Folder Name',
        'folderNamePlaceholder': 'Enter a folder name',
        'create': 'Create',
        'saveSuccess': 'Saved',
        'ok': 'OK',

        'level-1-title': 'Level 1: Negation',
        'level-1-desc': 'Construct the formula ¬P using the Atom P and the Not gate.',
        'level-2-title': 'Level 2: Implication',
        'level-2-desc': 'Construct the formula P → Q using Atoms P, Q and the Implies gate.',
        'level-3-title': 'Level 3: Nested Implication',
        'level-3-desc': 'Construct the formula (P → Q) → R.',
        'level-4-title': 'Level 4: First Proof',
        'level-4-desc': 'Prove ⊢ (R → (P → R)) using Axiom I.',
        'level-5-title': 'Level 5: Second Proof',
        'level-5-desc': 'Prove ⊢ (P → ((P → P) → P)) using Axiom I.',
        'level-6-title': 'Level 6: Modus Ponens',
        'level-6-desc': 'Given assumptions P and P→Q, prove Q using Modus Ponens (MP).',
        'level-7-title': 'Level 7: MP2 Theorem',
        'level-7-desc': 'Given |-P, |-Q, and |-(P→(Q→R)), prove |-R using Modus Ponens twice.',
        'level-8-title': 'Level 8: Axiom II',
        'level-8-desc': 'Prove ⊢ (¬P -> (Q -> ¬R)) -> ((¬P -> Q) -> (¬P -> ¬R)) using Axiom II.',
        'level-9-title': 'Level 9: Combined Proof',
        'level-9-desc': 'Prove ⊢ ((P -> ¬(Q -> ¬R)) -> (P -> P)) using Axiom I, II, MP and Logic Gates. Hint: Let w = ¬(Q -> ¬R).',
        'level-10-title': 'Level 10: Identity Theorem (Boss)',
        'level-10-desc': 'Prove ⊢ (P -> P). This is the first Boss Level!',
        'level-11-title': 'Level 11: Stage 2 - Syllogism',
        'level-11-desc': 'Enter the floating islands and prove the syllogism theorem from the two premise chips.',
    },
    zh: {
        gameTitle: '逻辑游戏',
        newGame: '新游戏',
        continue: '继续游戏',
        loadGame: '读取存档',
        settings: '设置',
        language: '语言',
        bgmVolume: '音乐音量',
        stage: '大关',
        chapter: '小关',
        coins: '金币',
        stage2Map: '悬浮岛地图',
        mainIsland: '主目标岛',
        revealedFog: '已驱散迷雾',
        theoremChips: '定理芯片',
        revealedIslands: '已显露岛屿',
        mainObjective: '当前主目标',
        supportIslands: '辅助岛',
        optionalIslands: '可选岛',
        completedIsland: '已完成',
        revealed: '已显露',
        collectedTheorems: '已收集定理',
        noTheoremsCollected: '还没有收集到定理芯片。',
        theoremCost: '费用',
        freeUsesRemaining: '剩余免费次数',
        theoremBar: '定理栏',
        theoremLibrary: '定理库',
        firstUseFree: '首次放置免费',
        notEnoughCoinsForTheorem: '金币不足，无法再次放置这个定理芯片。',
        hiddenInFog: '仍被迷雾遮蔽',
        slot: '存档',
        emptySlot: '空存档',
        load: '读取',
        level: '关卡',
        nextLevel: '下一关',
        levelComplete: '关卡完成！',
        goal: '目标',
        freeBuild: '自由模式',
        back: '返回',
        saveGame: '保存游戏',
        mainMenu: '主菜单',
        resetView: '重置视角',
        tools: '工具',
        atoms: '原子',
        gates: '逻辑门',
        axioms: '公理',
        rules: '规则',
        display: '显示屏',
        cancel: '取消',
        greatJob: '干得好！',
        logicWire: '逻辑线',
        provableWire: '证明线',
        pressToSwitch: '按 T 切换样式',
        selected: '已选择',
        autoSave: '自动存档',

        // Tutorial
        'tut-step-prev': '上一步',
        'tut-step-next': '下一步',
        'tut-skip': '跳过教程',
        'tut-hide': '隐藏提示',
        'tut-finish': '完成',
        'tut-l1-start': '欢迎！你的目标是构建逻辑电路。在本关中，我们需要输出 ¬P (非 P)。',
        'tut-l1-pick-p': '首先，从工具栏选择原子 P。',
        'tut-l1-place-p': '将原子 P 放置在标记位置（虚线框）。',
        'tut-l1-pick-not': '现在选择非门 (¬)。',
        'tut-l1-place-not': '将非门放置在标记位置。\n提示：按 "R" 键旋转，右键点击删除。',
        'tut-l1-pick-wire': '选择逻辑线工具。',
        'tut-l1-connect-1': '将原子 P 的输出连接到非门的输入。',
        'tut-l1-connect-2': '将非门的输出连接到中央目标区的输入。',
        'tut-l1-finish': '太棒了！电路符合目标。关卡完成。',
        
        // Level 2
        'tut-l2-start': '第 2 关：蕴含\n\n你的目标是构建公式 P → Q。这需要两个原子和一个蕴含门。',
        'tut-l2-pick-p': '首先，从工具栏选择原子 P。',
        'tut-l2-place-p': '将原子 P 放置在标记位置（虚线框）。',
        'tut-l2-pick-q': '现在从工具栏选择原子 Q。',
        'tut-l2-place-q': '将原子 Q 放置在标记位置。',
        'tut-l2-pick-implies': '选择蕴含门 (→)。它有两个输入：第一个用于前件，第二个用于后件。',
        'tut-l2-place-implies': '将蕴含门放置在标记位置。\n提示：按 "R" 键旋转，右键点击删除。',
        'tut-l2-pick-wire': '选择逻辑线工具来连接组件。',
        'tut-l2-wire-p': '将原子 P 连接到蕴含门的顶部输入 (in0)。按照虚线轮廓绘制导线。\n\n完成后点击"下一步"。',
        'tut-l2-wire-q': '将原子 Q 连接到蕴含门的底部输入 (in1)。\n\n完成后点击"下一步"。',
        'tut-l2-connect-goal': '将蕴含门的输出连接到中央目标区的输入即可完成关卡！',

        // Level 3
        'tut-l3-combined': '第 3 关：嵌套蕴含\n\n目标：(P -> Q) -> R\n\n这需要级联逻辑门。首先连接 P 和 Q 到一个蕴含门，然后将其输出连接到另一个以 R 为输入的蕴含门。\n\n新工具：显示屏！\n显示屏可以显示连接公式的图形化表示。连接导线（蓝色或黄色）即可查看其图形形式。\n\n测试提示：点击任何原子可切换其真/假状态，用来验证你的电路逻辑。',

        // Level 4
        'tut-l4-combined': '第 4 关：公理 I (P -> (Q -> P))\n\n公理 I 接收公式输入（蓝线）并产生可证公式输出（黄线）。\n\n导线类型：\n• 蓝色：普通公式\n• 黄色：可证命题\n• 提示：按 "T" 键切换导线颜色。\n\n要证明 R -> (P -> R)：\n1. 放置 "Axiom 1"。\n2. 用蓝线连接 R 到输入 A。\n3. 用蓝线连接 P 到输入 B。\n4. 用黄线连接输出到目标。\n\n注意：请确保导线与端口颜色匹配。若连接错误的导线类型，或将传输不同信号的导线连接在一起，导线和端口会闪烁以提示错误。',

        // Level 5
        'tut-l5-combined': '第 5 关：复杂代入\n\n目标：P -> ((P -> P) -> P)\n\n这仍然是公理 I 的形式：A -> (B -> A)，但这里的 B 是一个复杂公式 (P -> P)。\n\n1. 使用蓝线构造 P -> P。\n2. 使用公理 1，其中 A = P，B = (P -> P)。\n3. 公理输出为可证命题（黄线）。\n\n提示：按 "T" 键可在蓝色（公式）和黄色（可证）导线间切换。若出现闪烁，请检查是否连接了错误的导线类型或不同的信号。',

        // Level 6
        'tut-l6-combined': '第 6 关：肯定前件 (Modus Ponens)\n\n本关引入 Modus Ponens (MP) 规则：如果已知 P 为真，且 P -> Q 为真，则 Q 为真。\n\n操作步骤：\n1. 放置 "Modus Ponens" 节点。\n2. 将原子 P 连接到 MP 的第一个蓝色输入端口 (in1)。\n3. 将原子 Q 连接到 MP 的第二个蓝色输入端口 (in2)。\n4. 将左侧的 |-P 前提（黄色线）连接到 MP 的第一个黄色输入端口 (in3)。\n5. 将左侧的 |-(P->Q) 前提（黄色线）连接到 MP 的第二个黄色输入端口 (in4)。\n6. 将 MP 的输出连接到目标。\n\n提示：如果你关闭了提示，可以随时点击右上角的 "❓" 按钮重新查看。',

        // Level 7
        'tut-l7-combined': '第 7 关：MP2 定理\n\n目标：从 |-P、|-Q 和 |-(P→(Q→R)) 证明 |-R\n\n这需要使用两次肯定前件律：\n\n第一次 MP：\n• 使用 |-P 和 |-(P→(Q→R)) 推导出 |-(Q→R)\n• 连接 P 和 (Q→R) 作为公式输入\n• 连接 |-P 和 |-(P→(Q→R)) 作为可证输入\n\n第二次 MP：\n• 使用 |-Q 和 |-(Q→R) 推导出 |-R\n• 连接 Q 和 R 作为公式输入\n• 连接 |-Q 和 |-(Q→R) 作为可证输入\n\n最后，将第二个 MP 的输出连接到目标。\n\n新工具：电线桥！\n电线桥 (⛩) 允许电线交叉而不合并。当你需要布线但电线会意外连接时，可以使用它。将电线桥放在交叉点，然后把电线连接到它的端口。',

        // Level 8
        'tut-l8-combined': '第 8 关：公理 II\n\n公理 II 内容为：(A -> (B -> C)) -> ((A -> B) -> (A -> C))。\n\n目标：(¬P -> (Q -> ¬R)) -> ((¬P -> Q) -> (¬P -> ¬R))\n\n这完全符合公理 II 的形式，其中：\nA = ¬P\nB = Q\nC = ¬R\n\n使用公理 II 节点并构造输入 A、B、C 即可。\n使用大显示屏来验证复杂的公式！',

        // Level 9
        'tut-l9-combined': '第 9 关：综合应用\n\n目标：((P -> ¬(Q -> ¬R)) -> (P -> P))\n\n令 w = ¬(Q -> ¬R)。\n目标化简为：(P -> w) -> (P -> P)\n\n步骤：\n1. 使用逻辑门构造 w = ¬(Q -> ¬R)。\n2. 使用公理 I (A=P, B=w) 得到 |-(P -> (w -> P))。\n3. 使用公理 II (A=P, B=(w->P), C=P) 得到 |-((P -> (w -> P)) -> ((P -> w) -> (P -> P)))。\n4. 对步骤 2 和 3 的结果使用 MP，得到最终结果。\n\n提示：使用大显示屏来验证复杂的公式！',

        // Level 10
        'tut-l10-combined': '第 10 关：Boss 关卡 - 同一律\n\n目标：证明 |- (P -> P)\n\n这是一个 Boss 关卡，你需要自己通过组合公理 I, II 和 MP 来完成证明。\n\n提示：\n你需要构造一个中间步骤，利用公理 I 和 II 推出：\n|- (P -> ((P -> P) -> P)) -> ((P -> (P -> P)) -> (P -> P))\n然后再通过 MP 和公理 I 消除前面的部分。',

        // Level 11（第二大关）
        'tut-l11-start': '第二大关：悬浮岛地图\n\n欢迎来到大地图模式。你需要探索岛屿、收集定理芯片，并用它们来证明主目标定理。',
        'tut-l11-navigation': '视角操作：\n• 鼠标拖拽：平移地图\n• 鼠标滚轮：缩放\n• WASD：移动视角（按住 Shift 更快）\n\n提示：你可以边建造边移动视角。',
        'tut-l11-objective': '主目标：\n在主目标岛上，你会看到若干前提芯片（黄色输出）。你的任务是从这些前提出发，证明目标定理。\n\n辅助岛提供“可选”的定理芯片：有的可能有帮助，有的可能对主目标没用；即使有帮助，你也完全可以选择不使用它们。',
        'tut-l11-islands': '岛屿与迷雾：\n右侧面板列出了本大关的岛屿。\n• 已显露：会显示名称与目标\n• 仍被迷雾遮蔽：暂未解锁\n\n辅助岛/可选岛都是可选内容，你可以自行决定是否解锁与完成。\n点击任意已显露岛屿即可跳转。完成岛屿会解锁更多内容。',
        'tut-l11-theorems': '定理芯片与金币：\n完成某个岛屿后，你可以收集对应的定理芯片。\n放置定理芯片首次免费，之后每次放置会消耗金币。\n\n你不需要使用所有已解锁的定理芯片。\n可选岛适合用来刷金币。',
        'tut-l11-wires': '导线颜色很重要：\n• 蓝色：普通公式（数据）\n• 黄色：可证命题（⊢）\n\n按 T 键切换导线颜色。连接错误时导线/端口会闪烁提示。',
        'tut-l11-finish': '准备就绪。\n先探索辅助岛收集有用的定理，再回到主目标岛完成最终证明！',

        'stage2-intro-text': '世界会无限延伸。解锁岛屿、证明目标，并收集定理芯片。',
        'stage2-island-desc-main': '主目标岛。',
        'stage2-island-desc-support': '辅助定理岛。',

        'returnToGame': '返回游戏',
        'theoremInputs': '输入',
        'theoremOutputs': '输出',
        'theoremVariables': '变量（蓝线）',
        'theoremPremises': '前提（黄线）',
        'selectTheoremChip': '选择定理芯片',
        'newFolder': '新建文件夹',
        'rootFolder': '根目录',
        'moveToFolder': '移动到',
        'folderName': '文件夹名称',
        'folderNamePlaceholder': '输入文件夹名称',
        'create': '创建',
        'saveSuccess': '存档成功',
        'ok': '确定',

        'level-1-title': '第 1 关: 否定',
        'level-1-desc': '使用原子 P 和非门构造公式 ¬P。',
        'level-2-title': '第 2 关：蕴含',
        'level-2-desc': '使用原子 P、Q 和蕴含门构造公式 P → Q。',
        'level-3-title': '第 3 关：嵌套蕴含',
        'level-3-desc': '构造公式 (P → Q) → R。',
        'level-4-title': '第 4 关：初次证明',
        'level-4-desc': '使用公理 I 证明 ⊢ (R → (P → R))。',
        'level-5-title': '第 5 关：二次证明',
        'level-5-desc': '使用公理 I 证明 ⊢ (P → ((P → P) → P))。',
        'level-6-title': '第 6 关：肯定前件',
        'level-6-desc': '给定假设 P 和 P→Q，使用肯定前件律 (MP) 证明 Q。',
        'level-7-title': '第 7 关：MP2 定理',
        'level-7-desc': '给定 |-P、|-Q 和 |-(P→(Q→R))，两次运用肯定前件律证明 |-R。',
        'level-8-title': '第 8 关：公理 II',
        'level-8-desc': '引入公理 II。证明 ⊢ (¬P -> (Q -> ¬R)) -> ((¬P -> Q) -> (¬P -> ¬R))。',
        'level-9-title': '第 9 关：综合应用',
        'level-9-desc': '综合应用公理 I、II、MP 和逻辑门。证明 ⊢ ((P -> ¬(Q -> ¬R)) -> (P -> P))。\n\n提示：令 w = ¬(Q -> ¬R)。\n1. 用公理 I 得到 ⊢(P->(w->P))\n2. 用公理 II 得到 ⊢((P->(w->P))->((P->w)->(P->P)))\n3. 用 MP 得到 ⊢((P->w)->(P->P))',
        'level-10-title': '第 10 关：同一律 (Boss)',
        'level-10-desc': '证明同一律 ⊢ (P -> P)。这是一个 Boss 关卡！',
        'level-11-title': '第 11 关：第二大关 - 三段论',
        'level-11-desc': '进入悬浮岛地图，从两个前提芯片出发证明三段论定理。',
    }
};
