export interface StoryLine {
    speaker: 'aurelia' | 'player' | 'narrator';
    en: string;
    zh: string;
}

export interface StoryScene {
    id: string;
    title: { en: string; zh: string };
    location: { en: string; zh: string };
    lines: StoryLine[];
}

export const STAGE2_STORIES: Record<string, StoryScene> = {
    'stage2-1': {
        id: 'stage2-1',
        title: { en: 'A Voice Between Islands', zh: '群岛之间的声音' },
        location: { en: 'The Syllogism Archipelago', zh: '三段论群岛' },
        lines: [
            { speaker: 'narrator', en: 'A constellation of proof nodes awakens above the void.', zh: '虚空之上，一片由证明节点组成的星座苏醒了。' },
            { speaker: 'aurelia', en: 'I am Aurelia, keeper of this mathematical world. Every implication is a road; today, we reconnect the first two.', zh: '我是奥蕾莉娅，数学世界的守望者。每一个蕴含都是道路；今天，我们先接回最初的两段。' },
        ],
    },
    'stage2-2': {
        id: 'stage2-2',
        title: { en: 'The Order of Premises', zh: '前提的次序' },
        location: { en: 'The Commutation Current', zh: '交换之流' },
        lines: [
            { speaker: 'aurelia', en: 'Truth does not care which premise arrived first—but a proof machine often does.', zh: '真理不在意哪个前提先到，但证明机器往往在意。' },
            { speaker: 'player', en: 'Then I will learn to commute them without changing their meaning.', zh: '那我会学着交换它们，而不改变含义。' },
        ],
    },
    'stage2-3': {
        id: 'stage2-3',
        title: { en: 'A Longer Relay', zh: '更长的接力' },
        location: { en: 'Relay Gardens', zh: '接力花园' },
        lines: [
            { speaker: 'aurelia', en: 'Reusable theorems are memories. Link them well, and yesterday’s proof becomes today’s shortcut.', zh: '可复用的定理就是记忆。连接得当，昨天的证明就会成为今天的捷径。' },
        ],
    },
    'stage2-4': {
        id: 'stage2-4',
        title: { en: 'The Redundant Branch', zh: '多余的分支' },
        location: { en: 'Contraction Terrace', zh: '收缩台地' },
        lines: [
            { speaker: 'aurelia', en: 'A repeated premise may look like extra strength. Sometimes it is only extra weight.', zh: '重复的前提看似增加力量，有时却只是增加负担。' },
            { speaker: 'aurelia', en: 'Beyond this terrace lies an abandoned logic farm. Restore it, and the islands can sustain themselves again.', zh: '台地之后有一座废弃的逻辑农场。修复它，群岛就能重新自给自足。' },
        ],
    },
    'stage2-5': {
        id: 'stage2-5',
        title: { en: 'Seeds of Contradiction', zh: '矛盾的种子' },
        location: { en: 'Logic Farm', zh: '逻辑农场' },
        lines: [
            { speaker: 'aurelia', en: 'Negation is not darkness. It is a boundary—and boundaries let meaning take shape.', zh: '否定并不是黑暗。它是一条边界，而边界让意义拥有形状。' },
            { speaker: 'narrator', en: 'The restored soil begins producing coins and fragments of insight.', zh: '复苏的土壤开始产出金币与灵感碎片。' },
        ],
    },
    'stage2-6': {
        id: 'stage2-6',
        title: { en: 'Turn the Arrow Around', zh: '转动箭头' },
        location: { en: 'Contraposition Ridge', zh: '逆否山脊' },
        lines: [
            { speaker: 'aurelia', en: 'When the conclusion fails, trace the implication backward. The shadow of an arrow points home.', zh: '当结论不成立时，沿蕴含逆向追踪。箭头的影子会指向来路。' },
        ],
    },
    'stage2-7': {
        id: 'stage2-7',
        title: { en: 'The Detachment Engine', zh: '分离引擎' },
        location: { en: 'Modus Tollens Foundry', zh: '拒取式铸造厂' },
        lines: [
            { speaker: 'aurelia', en: 'You have checked the hidden formula ports often enough. I can now entrust you with an inference engine that performs that matching itself.', zh: '你已经反复检查过隐藏的公式端口。现在，我可以把自动完成匹配的推理引擎交给你。' },
            { speaker: 'aurelia', en: 'Its charges are scarce, so let the farm fund the proofs that matter most.', zh: '它的使用次数有限，就让农场为最重要的证明提供支持吧。' },
        ],
    },
    'stage2-8': {
        id: 'stage2-8',
        title: { en: 'The Admirable Consequence', zh: '奇妙推论' },
        location: { en: 'Clavius Observatory', zh: '克拉维乌斯观测台' },
        lines: [
            { speaker: 'aurelia', en: 'If denying a statement returns us to that statement, the loop closes—and truth remains.', zh: '如果否定一个命题反而把我们带回它本身，闭环完成，真理留下。' },
        ],
    },
    'stage2-9': {
        id: 'stage2-9',
        title: { en: 'The Cracked Halo', zh: '破裂的光环' },
        location: { en: 'Negated Syllogism Ruins', zh: '否定三段论遗迹' },
        lines: [
            { speaker: 'narrator', en: 'A fracture appears in Aurelia’s geometric halo whenever an old theorem is restored.', zh: '每当一条古老定理被修复，奥蕾莉娅的几何光环上就会浮现一道裂痕。' },
            { speaker: 'aurelia', en: 'I was not born as a goddess. I may be the theorem this world forgot how to prove.', zh: '我并非生而为女神。或许，我就是这个世界忘记如何证明的那条定理。' },
        ],
    },
    'stage2-10': {
        id: 'stage2-10',
        title: { en: 'Exportation', zh: '输出定理' },
        location: { en: 'The Second Gate', zh: '第二道门' },
        lines: [
            { speaker: 'aurelia', en: 'Compress the nested assumptions and open the gate. Beyond it, implication alone will no longer be enough.', zh: '压缩嵌套的假设，打开这道门。门后，仅靠蕴含将不再足够。' },
            { speaker: 'aurelia', en: 'When new symbols awaken, perhaps my true name will awaken with them.', zh: '当新的符号苏醒，也许我的真名也会随之苏醒。' },
        ],
    },
};

