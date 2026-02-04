export type Language = 'en' | 'zh';

export type TranslationKey = 
    | 'gameTitle'
    | 'newGame'
    | 'continue'
    | 'loadGame'
    | 'settings'
    | 'language'
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
    | 'tut-l2-combined' | 'tut-l3-combined'
    | 'tut-l4-combined' | 'tut-l5-combined'
    | 'tut-l6-combined'
    // Level Titles and Descriptions
    | 'level-1-title' | 'level-1-desc'
    | 'level-2-title' | 'level-2-desc'
    | 'level-3-title' | 'level-3-desc'
    | 'level-4-title' | 'level-4-desc'
    | 'level-5-title' | 'level-5-desc'
    | 'level-6-title' | 'level-6-desc'
    ;

export const translations: Record<Language, Record<string, string>> = {
    en: {
        gameTitle: 'Logic Game',
        newGame: 'New Game',
        continue: 'Continue',
        loadGame: 'Load Game',
        settings: 'Settings',
        language: 'Language',
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
        'tut-l2-combined': 'Level 2: Implication (->)\n\nIn this level, we focus on structure. The Implication gate combines two sub-formulas into a conditional statement.\n\nConnect Atom P to the first input and Atom Q to the second input to construct the formula P -> Q.\n\nControls Tip: Hold "Ctrl" while dragging to paint wires in one direction continuously. Press "R" to rotate gates, and Right-click to delete.',

        // Level 3
        'tut-l3-combined': 'Level 3: Nested Implication\n\nGoal: (P -> Q) -> R\n\nThis requires chaining gates. First connect P and Q to an Implication gate, then connect its output to another Implication gate with R.\n\nTesting Tip: Click on any Atom to toggle it True/False and verify your circuit.',

        // Level 4
        'tut-l4-combined': 'Level 4: Axiom I (P -> (Q -> P))\n\nAxiom I produces a Provable Formula (Yellow wire) from input formulas (Blue wires).\n\nWire Types:\n• Blue: Formula (Data)\n• Yellow: Provable (Theorem)\n• Tip: Press "T" to switch wire type.\n\nTo prove R -> (P -> R):\n1. Place "Axiom 1".\n2. Connect R to input A (Blue).\n3. Connect P to input B (Blue).\n4. Connect output to Goal (Yellow).\n\nWarning: Match wire and port colors! If you connect the wrong wire type or merge different signals, the wire/port will flash to indicate an error.',

        // Level 5
        'tut-l5-combined': 'Level 5: Complex Substitution\n\nGoal: P -> ((P -> P) -> P)\n\nThis is still Axiom I form: A -> (B -> A), but B is a complex formula (P -> P).\n\n1. Construct P -> P (Blue wires).\n2. Use Axiom 1 with A = P and B = (P -> P).\n3. The Axiom output is Provable (Yellow).\n\nReminder: Press "T" to toggle between Blue (Formula) and Yellow (Provable) wires. Flashing lights indicate a connection error!',

        // Level 6
        'tut-l6-combined': 'Level 6: Modus Ponens (MP)\n\nThis level introduces the Modus Ponens (MP) rule: If P is true, and P -> Q is true, then Q is true.\n\nInstructions:\n1. Place the "Modus Ponens" node.\n2. Connect Atom P to the MP\'s first BLUE input port (in1).\n3. Connect Atom Q to the MP\'s second BLUE input port (in2).\n4. Connect the left premise |-P (Yellow wire) to the MP\'s first YELLOW input port (in3).\n5. Connect the left premise |-(P->Q) (Yellow wire) to the MP\'s second YELLOW input port (in4).\n6. Connect the MP output to the goal.\n\nTip: If you hide this hint, you can always click the "❓" button in the top right corner to show it again.',

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
    },
    zh: {
        gameTitle: '逻辑游戏',
        newGame: '新游戏',
        continue: '继续游戏',
        loadGame: '读取存档',
        settings: '设置',
        language: '语言',
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
        'tut-l2-combined': '第 2 关：蕴含 (->)\n\n本关关注公式的结构形式。蕴含门将两个子公式组合成一个条件语句。\n\n将原子 P 连接到第一个输入，原子 Q 连接到第二个输入，以构造公式 P -> Q。\n\n操作提示：按住 "Ctrl" 键拖动鼠标可以向一个方向连续绘制导线。按 "R" 键旋转逻辑门，右键点击可删除元件。',

        // Level 3
        'tut-l3-combined': '第 3 关：嵌套蕴含\n\n目标：(P -> Q) -> R\n\n这需要级联逻辑门。首先连接 P 和 Q 到一个蕴含门，然后将其输出连接到另一个以 R 为输入的蕴含门。\n\n测试提示：点击任何原子可切换其真/假状态，用来验证你的电路逻辑。',

        // Level 4
        'tut-l4-combined': '第 4 关：公理 I (P -> (Q -> P))\n\n公理 I 接收公式输入（蓝线）并产生可证公式输出（黄线）。\n\n导线类型：\n• 蓝色：普通公式\n• 黄色：可证命题\n• 提示：按 "T" 键切换导线颜色。\n\n要证明 R -> (P -> R)：\n1. 放置 "Axiom 1"。\n2. 用蓝线连接 R 到输入 A。\n3. 用蓝线连接 P 到输入 B。\n4. 用黄线连接输出到目标。\n\n注意：请确保导线与端口颜色匹配。若连接错误的导线类型，或将传输不同信号的导线连接在一起，导线和端口会闪烁以提示错误。',

        // Level 5
        'tut-l5-combined': '第 5 关：复杂代入\n\n目标：P -> ((P -> P) -> P)\n\n这仍然是公理 I 的形式：A -> (B -> A)，但这里的 B 是一个复杂公式 (P -> P)。\n\n1. 使用蓝线构造 P -> P。\n2. 使用公理 1，其中 A = P，B = (P -> P)。\n3. 公理输出为可证命题（黄线）。\n\n提示：按 "T" 键可在蓝色（公式）和黄色（可证）导线间切换。若出现闪烁，请检查是否连接了错误的导线类型或不同的信号。',

        // Level 6
        'tut-l6-combined': '第 6 关：肯定前件 (Modus Ponens)\n\n本关引入 Modus Ponens (MP) 规则：如果已知 P 为真，且 P -> Q 为真，则 Q 为真。\n\n操作步骤：\n1. 放置 "Modus Ponens" 节点。\n2. 将原子 P 连接到 MP 的第一个蓝色输入端口 (in1)。\n3. 将原子 Q 连接到 MP 的第二个蓝色输入端口 (in2)。\n4. 将左侧的 |-P 前提（黄色线）连接到 MP 的第一个黄色输入端口 (in3)。\n5. 将左侧的 |-(P->Q) 前提（黄色线）连接到 MP 的第二个黄色输入端口 (in4)。\n6. 将 MP 的输出连接到目标。\n\n提示：如果你关闭了提示，可以随时点击右上角的 "❓" 按钮重新查看。',

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
    }
};
