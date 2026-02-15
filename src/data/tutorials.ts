import { LevelTutorial } from "@/types/tutorial";

export const tutorials: Record<number, LevelTutorial> = {
    0: {
        levelIndex: 0,
        steps: [
            {
                id: 'l1-start',
                textKey: 'tut-l1-start',
                trigger: 'CUSTOM', 
                position: 'center'
            },
            {
                id: 'l1-pick-p',
                textKey: 'tut-l1-pick-p',
                trigger: 'SELECT_TOOL',
                triggerParams: { toolType: 'atom', toolSubType: 'P' },
                highlightElementId: 'tool-atom-P',
                position: 'bottom'
            },
            {
                id: 'l1-place-p',
                textKey: 'tut-l1-place-p',
                trigger: 'PLACE_NODE',
                triggerParams: { subType: 'P', x: -15, y: -3 },
                ghostNodes: [
                    { type: 'atom', subType: 'P', x: -15, y: -3, w: 4, h: 4 }
                ],
                position: 'top'
            },
            {
                id: 'l1-pick-not',
                textKey: 'tut-l1-pick-not',
                trigger: 'SELECT_TOOL',
                triggerParams: { toolType: 'gate', toolSubType: 'not' },
                highlightElementId: 'tool-gate-not',
                position: 'bottom'
            },
            {
                id: 'l1-place-not',
                textKey: 'tut-l1-place-not',
                trigger: 'PLACE_NODE',
                triggerParams: { subType: 'not', x: -9, y: -3 },
                ghostNodes: [
                    { type: 'gate', subType: 'not', x: -9, y: -3, w: 4, h: 4 }
                ],
                position: 'top'
            },
            {
                id: 'l1-pick-wire',
                textKey: 'tut-l1-pick-wire',
                trigger: 'SELECT_TOOL',
                triggerParams: { toolType: 'wire' },
                highlightElementId: 'tool-wire',
                position: 'bottom'
            },
            {
                id: 'l1-connect-1',
                textKey: 'tut-l1-connect-1',
                trigger: 'CONNECT_WIRE',
                ghostNodes: [
                    { type: 'wire', subType: 'formula', x: -11, y: -1, w: 2, h: 1, rotation: 0 }
                ],
                position: 'top'
            },
            {
                id: 'l1-connect-2',
                textKey: 'tut-l1-connect-2',
                trigger: 'CONNECT_WIRE',
                triggerParams: { x: -5, y: -1, w: 1, h: 1, rotation: 0 },
                ghostNodes: [
                    { type: 'wire', subType: 'formula', x: -5, y: -1, w: 1, h: 1, rotation: 0 }
                ],
                position: 'top'
            },
            {
                id: 'l1-finish',
                textKey: 'tut-l1-finish',
                trigger: 'LEVEL_COMPLETE',
                position: 'center'
            }
        ]
    },
    1: {
        levelIndex: 1,
        steps: [
            {
                id: 'l2-start',
                textKey: 'tut-l2-start',
                trigger: 'CUSTOM', 
                position: 'center'
            },
            {
                id: 'l2-pick-p',
                textKey: 'tut-l2-pick-p',
                trigger: 'SELECT_TOOL',
                triggerParams: { toolType: 'atom', toolSubType: 'P' },
                highlightElementId: 'tool-atom-P',
                position: 'bottom'
            },
            {
                id: 'l2-place-p',
                textKey: 'tut-l2-place-p',
                trigger: 'PLACE_NODE',
                triggerParams: { subType: 'P', x: -18, y: -2 },
                ghostNodes: [
                    { type: 'atom', subType: 'P', x: -18, y: -2, w: 4, h: 4 }
                ],
                position: 'top'
            },
            {
                id: 'l2-pick-q',
                textKey: 'tut-l2-pick-q',
                trigger: 'SELECT_TOOL',
                triggerParams: { toolType: 'atom', toolSubType: 'Q' },
                highlightElementId: 'tool-atom-Q',
                position: 'bottom'
            },
            {
                id: 'l2-place-q',
                textKey: 'tut-l2-place-q',
                trigger: 'PLACE_NODE',
                triggerParams: { subType: 'Q', x: -18, y: 2 },
                ghostNodes: [
                    { type: 'atom', subType: 'Q', x: -18, y: 2, w: 4, h: 4 }
                ],
                position: 'top'
            },
            {
                id: 'l2-pick-implies',
                textKey: 'tut-l2-pick-implies',
                trigger: 'SELECT_TOOL',
                triggerParams: { toolType: 'gate', toolSubType: 'implies' },
                highlightElementId: 'tool-gate-implies',
                position: 'bottom'
            },
            {
                id: 'l2-place-implies',
                textKey: 'tut-l2-place-implies',
                trigger: 'PLACE_NODE',
                triggerParams: { subType: 'implies', x: -11, y: -1 },
                ghostNodes: [
                    { type: 'gate', subType: 'implies', x: -11, y: -1, w: 4, h: 4 }
                ],
                position: 'top'
            },
            {
                id: 'l2-pick-wire',
                textKey: 'tut-l2-pick-wire',
                trigger: 'SELECT_TOOL',
                triggerParams: { toolType: 'wire' },
                highlightElementId: 'tool-wire',
                position: 'bottom'
            },
            {
                id: 'l2-wire-p',
                textKey: 'tut-l2-wire-p',
                trigger: 'CUSTOM',
                ghostNodes: [
                    { type: 'wire', subType: 'formula', x: -14, y: 0, w: 3, h: 1, rotation: 0 }
                ],
                position: 'top'
            },
            {
                id: 'l2-wire-q',
                textKey: 'tut-l2-wire-q',
                trigger: 'CUSTOM',
                ghostNodes: [
                    { type: 'wire', subType: 'formula', x: -14, y: 4, w: 1, h: 1, rotation: 0 },
                    { type: 'wire', subType: 'formula', x: -13, y: 2, w: 1, h: 2, rotation: 1 },
                    { type: 'wire', subType: 'formula', x: -13, y: 2, w: 2, h: 1, rotation: 0 }
                ],
                position: 'top'
            },
            {
                id: 'l2-connect-goal',
                textKey: 'tut-l2-connect-goal',
                trigger: 'LEVEL_COMPLETE',
                ghostNodes: [
                    { type: 'wire', subType: 'formula', x: -7, y: 1, w: 3, h: 1, rotation: 0 }
                ],
                position: 'top'
            }
        ]
    },
    2: {
        levelIndex: 2,
        steps: [
            {
                id: 'l3-combined',
                textKey: 'tut-l3-combined',
                trigger: 'LEVEL_COMPLETE',
                position: 'center'
            }
        ]
    },
    3: {
        levelIndex: 3,
        steps: [
            {
                id: 'l4-combined',
                textKey: 'tut-l4-combined',
                trigger: 'LEVEL_COMPLETE',
                position: 'center'
            },
            {
                id: 'l4-finish',
                textKey: 'tut-l1-finish',
                trigger: 'LEVEL_COMPLETE',
                position: 'center'
            }
        ]
    },
    4: {
        levelIndex: 4,
        steps: [
            {
                id: 'l5-combined',
                textKey: 'tut-l5-combined',
                trigger: 'LEVEL_COMPLETE',
                position: 'center'
            },
            {
                id: 'l5-finish',
                textKey: 'tut-l1-finish',
                trigger: 'LEVEL_COMPLETE',
                position: 'center'
            }
        ]
    },
    5: {
        levelIndex: 5,
        steps: [
            {
                id: 'l6-combined',
                textKey: 'tut-l6-combined',
                trigger: 'LEVEL_COMPLETE',
                position: 'center'
            },
            {
                id: 'l6-finish',
                textKey: 'tut-l1-finish',
                trigger: 'LEVEL_COMPLETE',
                position: 'center'
            }
        ]
    }
};
