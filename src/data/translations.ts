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
        pressToSwitch: '按 T 键切换类型',
        selected: '已选择',

        'level-1-title': '第 1 关：否定',
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
