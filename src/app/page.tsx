'use client';

import InfiniteCanvas, { InfiniteCanvasHandle } from "@/components/InfiniteCanvas";
import Toolbar, { SelectMode } from "@/components/Toolbar";
import LevelGoal from "@/components/LevelGoal";
import StartMenu from "@/components/StartMenu";
import DraggableModal from "@/components/DraggableModal";
import VariantSelector from "@/components/VariantSelector";
import SettingsModal from "@/components/SettingsModal";
import Stage2Panel from "@/components/Stage2Panel";
import TutorialOverlay from "@/components/TutorialOverlay";
import levels from "@/data/levels.json";
import { getStage2LevelConfig } from "@/data/stage2";
import { useState, useRef, useEffect, useMemo } from 'react';
import { Tool } from '@/types/game';
import { SaveSystem, LevelState, SaveData } from '@/lib/saveSystem';
import { NodeData } from '@/types/game';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { TranslationKey } from '@/data/translations';
import { Stage2MetaProgress, TheoremChipInventoryEntry, createDefaultStage2MetaProgress } from '@/types/stage2';

interface Level {
  id: string;
  title: string;
  description: string;
  goal: {
    formula: string;
  };
  unlockedTools: string[];
  initialState?: LevelState;
}

const BGM_STORAGE_KEY = 'logic-game-bgm-volume';
const DEFAULT_BGM_VOLUME = 0.35;

const toTileKey = (x: number, y: number) => `${x},${y}`;

const isRectWithinTiles = (tileSet: Set<string>, x: number, y: number, w: number, h: number) => {
  for (let tx = x; tx < x + w; tx += 1) {
    for (let ty = y; ty < y + h; ty += 1) {
      if (!tileSet.has(toTileKey(tx, ty))) return false;
    }
  }
  return true;
};

const rectOverlapsOccupied = (occupied: Set<string>, x: number, y: number, w: number, h: number) => {
  for (let tx = x; tx < x + w; tx += 1) {
    for (let ty = y; ty < y + h; ty += 1) {
      if (occupied.has(toTileKey(tx, ty))) return true;
    }
  }
  return false;
};

const markRectOccupied = (occupied: Set<string>, x: number, y: number, w: number, h: number) => {
  for (let tx = x; tx < x + w; tx += 1) {
    for (let ty = y; ty < y + h; ty += 1) {
      occupied.add(toTileKey(tx, ty));
    }
  }
};

const findNearestValidRectPlacement = (
  tileSet: Set<string>,
  occupied: Set<string>,
  preferredX: number,
  preferredY: number,
  w: number,
  h: number,
  maxRadius: number
) => {
  const tryPlacement = (x: number, y: number) => {
    if (!isRectWithinTiles(tileSet, x, y, w, h)) return false;
    if (rectOverlapsOccupied(occupied, x, y, w, h)) return false;
    return true;
  };

  if (tryPlacement(preferredX, preferredY)) {
    return { x: preferredX, y: preferredY };
  }

  for (let r = 1; r <= maxRadius; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const topY = preferredY - r;
      const bottomY = preferredY + r;
      const px1 = preferredX + dx;
      if (tryPlacement(px1, topY)) return { x: px1, y: topY };
      if (tryPlacement(px1, bottomY)) return { x: px1, y: bottomY };
    }
    for (let dy = -r + 1; dy <= r - 1; dy += 1) {
      const leftX = preferredX - r;
      const rightX = preferredX + r;
      const py1 = preferredY + dy;
      if (tryPlacement(leftX, py1)) return { x: leftX, y: py1 };
      if (tryPlacement(rightX, py1)) return { x: rightX, y: py1 };
    }
  }

  return null;
};

export default function Home() {
  const { t, language } = useLanguage();
  const { startTutorial, dispatchAction, resetTutorials, forceStartTutorial } = useTutorial();
  const canvasRef = useRef<InfiniteCanvasHandle>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [selectMode, setSelectMode] = useState<SelectMode>('pointer');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isFreeBuild, setIsFreeBuild] = useState(false);
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');
  const [pendingLoad, setPendingLoad] = useState<LevelState | null>(null);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveMenuTab, setSaveMenuTab] = useState<'save' | 'load' | 'data'>('save');
  const [saveSuccessSlot, setSaveSuccessSlot] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saveSlots, setSaveSlots] = useState<Record<number, { timestamp: number, levelIndex: number } | null>>({});
  const [bgmVolume, setBgmVolume] = useState(DEFAULT_BGM_VOLUME);
  const [stage2Progress, setStage2Progress] = useState<Stage2MetaProgress>(createDefaultStage2MetaProgress());
  const [showStage2Intro, setShowStage2Intro] = useState(false);
  const [selectedStage2IslandId, setSelectedStage2IslandId] = useState<string | null>(null);
  const stage2IntroShownKeyRef = useRef<string | null>(null);

  const currentLevel = levels[currentLevelIndex] as Level;
  const stage2Config = useMemo(
    () => getStage2LevelConfig(currentLevel.id, 42),
    [currentLevel.id]
  );
  const stage2GoalIslands = useMemo(() => {
    if (!stage2Config) return [];
    return stage2Config.goalIslandIds
      .map((id) => stage2Config.world.getIslandById(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [stage2Config]);
  const effectiveUnlockedIslandIds = useMemo(() => {
    if (!stage2Config) return [];
    if (stage2Progress.unlockedIslandIds.length > 0) return stage2Progress.unlockedIslandIds;
    return stage2Config.initialUnlockedIslandIds;
  }, [stage2Config, stage2Progress.unlockedIslandIds]);
  const unlockedIslandIdSet = useMemo(() => new Set(effectiveUnlockedIslandIds), [effectiveUnlockedIslandIds]);

  const resolvedTheoremInventory = useMemo(() => {
    const inventory = Object.values(stage2Progress.collectedTheorems);
    if (!stage2Config) return inventory;

    const islandByTheoremId = new Map(
      stage2GoalIslands
        .filter((island) => island.rewardTheorem)
        .map((island) => [island.rewardTheorem!.theoremId, island])
    );

    return inventory.map((entry) => {
      if (entry.premises && entry.premises.length > 0) return entry;
      const island = islandByTheoremId.get(entry.theoremId);
      if (!island) return entry;
      return { ...entry, premises: (island.premiseNodes ?? []).map((premise) => premise.formula) };
    });
  }, [stage2Config, stage2GoalIslands, stage2Progress.collectedTheorems]);
  const stage2InitialState: LevelState | undefined = stage2Config
    ? {
        nodes: stage2GoalIslands
          .filter((island) => unlockedIslandIdSet.has(island.id))
          .flatMap((island) => {
          const tileSet = new Set(island.buildTiles.map((tile) => toTileKey(tile.x, tile.y)));
          const occupied = new Set<string>();
          if (island.goalBounds) {
            markRectOccupied(occupied, island.goalBounds.x, island.goalBounds.y, island.goalBounds.w, island.goalBounds.h);
          }

          return (island.premiseNodes ?? []).map((premise) => {
            const placement = findNearestValidRectPlacement(
              tileSet,
              occupied,
              premise.x,
              premise.y,
              premise.w,
              premise.h,
              48
            );
            const x = placement?.x ?? premise.x;
            const y = placement?.y ?? premise.y;
            markRectOccupied(occupied, x, y, premise.w, premise.h);

            return {
              id: premise.id,
              type: 'premise' as const,
              subType: premise.formula,
              customLabel: premise.formula,
              x,
              y,
              w: premise.w,
              h: premise.h,
              locked: true,
              sourceIslandId: island.id,
            };
          });
        }),
        wires: [],
      }
    : currentLevel.initialState;

  const stage2BuildableTileSet = useMemo(() => {
    if (!stage2Config) return null;
    const tileSet = new Set<string>();
    effectiveUnlockedIslandIds.forEach((islandId) => {
      const island = stage2Config.world.getIslandById(islandId);
      if (!island) return;
      island.buildTiles.forEach((tile) => tileSet.add(`${tile.x},${tile.y}`));
    });
    return tileSet;
  }, [effectiveUnlockedIslandIds, stage2Config]);

  const readTheoremUiStateFromStorage = (): Pick<SaveData, 'theoremLibrary' | 'theoremToolbarPins'> => {
    if (typeof window === 'undefined') return {};
    let theoremLibrary: SaveData['theoremLibrary'] | undefined;
    let theoremToolbarPins: SaveData['theoremToolbarPins'] | undefined;
    try {
      const raw = localStorage.getItem('logic_game_theorem_library_tree_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveData['theoremLibrary']>;
        if (parsed && parsed.version === 1 && parsed.root && parsed.theoremFolderById) {
          theoremLibrary = parsed as SaveData['theoremLibrary'];
        }
      }
    } catch {
    }
    try {
      const rawPins = localStorage.getItem('logic_game_theorem_toolbar_pins_v1');
      if (rawPins) {
        const parsed = JSON.parse(rawPins) as unknown;
        if (Array.isArray(parsed)) {
          theoremToolbarPins = parsed.map((v) => (typeof v === 'string' ? v : null));
        }
      }
    } catch {
    }
    return { theoremLibrary, theoremToolbarPins };
  };

  const buildSaveData = (
    levelIndex: number,
    levelStates: Record<number, LevelState>,
    metaProgress: Stage2MetaProgress,
    levelStartStates: Record<number, { levelState: LevelState; metaProgress: Stage2MetaProgress }>
  ): SaveData => ({
    timestamp: Date.now(),
    levelIndex,
    levelStates,
    metaProgress,
    ...readTheoremUiStateFromStorage(),
    levelStartStates,
  });

  const applyTheoremLibraryFromSave = (saved: SaveData) => {
    if (typeof window === 'undefined') return;
    if (!saved.theoremLibrary && !saved.theoremToolbarPins) return;
    try {
      if (saved.theoremLibrary) {
        localStorage.setItem('logic_game_theorem_library_tree_v1', JSON.stringify(saved.theoremLibrary));
      }
      if (saved.theoremToolbarPins) {
        localStorage.setItem('logic_game_theorem_toolbar_pins_v1', JSON.stringify(saved.theoremToolbarPins));
      }
      window.dispatchEvent(new Event('logic_game_save_loaded'));
    } catch {
    }
  };

  const consumeTheoremPlacement = (baseProgress: Stage2MetaProgress, theoremId: string) => {
    const theorem = baseProgress.collectedTheorems[theoremId];
    if (!theorem) return baseProgress;

    const usedFreePlacement = theorem.freeUsesRemaining > 0;
    const paidPlacement = !usedFreePlacement && baseProgress.coins >= theorem.cost;
    if (!usedFreePlacement && !paidPlacement) return baseProgress;

    return {
      ...baseProgress,
      coins: usedFreePlacement ? baseProgress.coins : baseProgress.coins - theorem.cost,
      collectedTheorems: {
        ...baseProgress.collectedTheorems,
        [theoremId]: {
          ...theorem,
          freeUsesRemaining: usedFreePlacement ? theorem.freeUsesRemaining - 1 : theorem.freeUsesRemaining,
          useCount: theorem.useCount + 1,
        }
      }
    };
  };

  const applyStage2IslandCompletion = (baseProgress: Stage2MetaProgress, islandId: string) => {
    if (!stage2Config) return baseProgress;

    const parseIslandId = (id: string) => {
      const match = /^i_(-?\d+)_(-?\d+)$/.exec(id);
      if (!match) return null;
      return { cx: Number(match[1]), cy: Number(match[2]) };
    };
    const makeIslandId = (cx: number, cy: number) => `i_${cx}_${cy}`;

    const unlockedSet = new Set(
      baseProgress.unlockedIslandIds.length > 0 ? baseProgress.unlockedIslandIds : stage2Config.initialUnlockedIslandIds
    );

    const completedIsland = stage2Config.world.getIslandById(islandId);
    if (
      !completedIsland ||
      !completedIsland.goalFormula ||
      !unlockedSet.has(completedIsland.id) ||
      baseProgress.completedIslandIds.includes(completedIsland.id)
    ) {
      return baseProgress;
    }

    const nextCollectedTheorems = { ...baseProgress.collectedTheorems };
    if (completedIsland.rewardTheorem && !nextCollectedTheorems[completedIsland.rewardTheorem.theoremId]) {
      const theoremEntry: TheoremChipInventoryEntry = {
        ...completedIsland.rewardTheorem,
        premises: (completedIsland.premiseNodes ?? []).map((premise) => premise.formula),
        sourceIslandId: completedIsland.id,
        collectedInLevelId: stage2Config.levelId,
        freeUsesRemaining: 1,
        useCount: 0,
      };
      nextCollectedTheorems[theoremEntry.theoremId] = theoremEntry;
    }

    const parsed = parseIslandId(completedIsland.id);
    if (parsed) {
      const candidates: Array<{ id: string; dist: number }> = [];
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist === 0 || dist > 3) continue;
          const id = makeIslandId(parsed.cx + dx, parsed.cy + dy);
          if (unlockedSet.has(id)) continue;
          candidates.push({ id, dist });
        }
      }
      candidates.sort((a, b) => a.dist - b.dist || a.id.localeCompare(b.id));
      candidates.slice(0, 2).forEach((c) => unlockedSet.add(c.id));
    }

    return {
      ...baseProgress,
      coins: baseProgress.coins + (completedIsland.rewardCoins ?? 0),
      unlockedIslandIds: Array.from(unlockedSet),
      completedIslandIds: [...baseProgress.completedIslandIds, completedIsland.id],
      collectedTheorems: nextCollectedTheorems,
    };
  };

  useEffect(() => {
    const storedVolume = window.localStorage.getItem(BGM_STORAGE_KEY);
    if (!storedVolume) return;

    const parsedVolume = Number(storedVolume);
    if (Number.isFinite(parsedVolume)) {
      const raf = requestAnimationFrame(() => {
        setBgmVolume(Math.min(1, Math.max(0, parsedVolume)));
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(BGM_STORAGE_KEY, String(bgmVolume));
    if (audioRef.current) {
      audioRef.current.volume = bgmVolume;
    }
  }, [bgmVolume]);

  const bgmSrc = stage2Config ? 'audio/stage2_60s.mp3' : 'audio/game_60s.mp3';

  useEffect(() => {
    // Use a relative asset path so GitHub Pages project-site base paths still resolve correctly.
    const audio = new Audio(bgmSrc);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = bgmVolume;
    audioRef.current = audio;

    const tryPlay = () => {
      audio.play().catch(() => {
        // Ignore autoplay failures until the next user interaction.
      });
    };

    tryPlay();
    window.addEventListener('pointerdown', tryPlay);
    window.addEventListener('keydown', tryPlay);

    return () => {
      window.removeEventListener('pointerdown', tryPlay);
      window.removeEventListener('keydown', tryPlay);
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [bgmSrc]);

  useEffect(() => {
    if (gameState !== 'playing' || !stage2Config) return;
    const raf = requestAnimationFrame(() => {
      setStage2Progress((prev) => {
        const next = new Set(prev.unlockedIslandIds.length > 0 ? prev.unlockedIslandIds : stage2Config.initialUnlockedIslandIds);
        stage2Config.initialUnlockedIslandIds.forEach((id) => next.add(id));
        if (next.size === prev.unlockedIslandIds.length && prev.unlockedIslandIds.length > 0) return prev;
        return { ...prev, unlockedIslandIds: Array.from(next) };
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [gameState, stage2Config, stage2Progress.completedIslandIds]);

  useEffect(() => {
    if (gameState !== 'playing' || !stage2Config) {
      stage2IntroShownKeyRef.current = null;
      return;
    }

    const key = `${stage2Config.levelId}:42`;
    const mainIslandCompleted = stage2Progress.completedIslandIds.includes(stage2Config.focusIslandId);
    if (mainIslandCompleted) return;
    if (stage2IntroShownKeyRef.current === key) return;
    stage2IntroShownKeyRef.current = key;
    const raf = requestAnimationFrame(() => {
      setShowStage2Intro(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [gameState, stage2Config, stage2Progress.completedIslandIds]);

  useEffect(() => {
    if (!stage2Config) {
      const raf = requestAnimationFrame(() => {
        setSelectedStage2IslandId(null);
      });
      return () => cancelAnimationFrame(raf);
    }

    const raf = requestAnimationFrame(() => {
      setSelectedStage2IslandId(stage2Config.focusIslandId);
    });
    return () => cancelAnimationFrame(raf);
  }, [stage2Config]);

  // Load save slots when menu opens
  useEffect(() => {
    if (showSaveMenu) {
        const slots: Record<number, { timestamp: number, levelIndex: number } | null> = {};
        [1, 2, 3, 4, 5, 6].forEach(slot => {
            slots[slot] = SaveSystem.getSlotInfo(slot);
        });
        const raf = requestAnimationFrame(() => {
          setSaveSlots(slots);
        });
        return () => cancelAnimationFrame(raf);
    }
  }, [showSaveMenu]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
        if (canvasRef.current) {
            const state = canvasRef.current.getState();
            // Load existing auto-save to preserve other levels if needed
            const existing = SaveSystem.loadAutoSave() || SaveSystem.createEmptySave();

            const saveData = buildSaveData(
                currentLevelIndex,
                {
                    ...existing.levelStates,
                    [currentLevelIndex]: state
                },
                stage2Progress,
                existing.levelStartStates ?? {}
            );
            SaveSystem.autoSave(saveData);
            // console.log("Auto-saved");
        }
    }, 30000);

    return () => clearInterval(interval);
  }, [gameState, currentLevelIndex, stage2Progress]);

  // Handle pending state load
  useEffect(() => {
    if (gameState === 'playing' && pendingLoad && canvasRef.current) {
        canvasRef.current.loadState(pendingLoad);
        const raf = requestAnimationFrame(() => {
          setPendingLoad(null);
        });
        return () => cancelAnimationFrame(raf);
    }
  }, [gameState, pendingLoad]);

  // Tutorial Logic
  useEffect(() => {
    if (gameState === 'playing') {
      startTutorial(currentLevelIndex);
    }
  }, [gameState, currentLevelIndex, startTutorial]);

  useEffect(() => {
    if (activeTool) {
      dispatchAction('SELECT_TOOL', { toolType: activeTool.type, toolSubType: activeTool.subType });
    }
  }, [activeTool, dispatchAction]);

  const handleStage2IslandComplete = (islandId: string) => {
    const nextStage2Progress = applyStage2IslandCompletion(stage2Progress, islandId);
    if (nextStage2Progress !== stage2Progress) {
      setStage2Progress(nextStage2Progress);
      if (canvasRef.current) {
        const state = canvasRef.current.getState();
        const currentSession = SaveSystem.loadAutoSave() || SaveSystem.createEmptySave();
        SaveSystem.autoSave(
          buildSaveData(
            currentLevelIndex,
            {
              ...currentSession.levelStates,
              [currentLevelIndex]: state
            },
            nextStage2Progress,
            currentSession.levelStartStates ?? {}
          )
        );
      }
    }
  };

  const handleLevelComplete = () => {
    if (stage2Config) return;
    setIsLevelComplete(true);
    dispatchAction('LEVEL_COMPLETE');
  };

  const handleNextLevel = () => {
    if (currentLevelIndex < levels.length - 1) {
      const nextLevelIndex = currentLevelIndex + 1;
      const nextLevel = levels[nextLevelIndex] as Level;
      const nextStage2Config = getStage2LevelConfig(nextLevel.id, 42);

      // Save progress before moving
      if (canvasRef.current) {
          const state = canvasRef.current.getState();
          const currentSession = SaveSystem.loadAutoSave() || SaveSystem.createEmptySave();
          
          // Clear previous canvas state when entering a new stage2 chapter from stage 1
          // Keep state when moving within stage2 (e.g., level-11 to level-12)
          const isEnteringStage2FirstTime = !stage2Config && nextStage2Config;
          const targetStateToSave = isEnteringStage2FirstTime ? { nodes: [], wires: [] } : state;

          const nextLevelStartState: LevelState = nextStage2Config ? targetStateToSave : (nextLevel.initialState || { nodes: [], wires: [] });

          const saveData = buildSaveData(
              nextLevelIndex,
              {
                  ...currentSession.levelStates,
                  [currentLevelIndex]: state // Save completed level state
              },
              stage2Progress,
              {
                  ...(currentSession.levelStartStates ?? {}),
                  [nextLevelIndex]: { levelState: nextLevelStartState, metaProgress: stage2Progress }
              }
          );
          SaveSystem.autoSave(saveData);
          
          if (isEnteringStage2FirstTime) {
            setPendingLoad({ nodes: [], wires: [] });
          }
      }

      setCurrentLevelIndex(nextLevelIndex);
      setIsLevelComplete(false);
      setActiveTool(null);
      
      if (nextStage2Config) {
          setTimeout(() => {
              canvasRef.current?.jumpToStage2Island(nextStage2Config.focusIslandId);
          }, 0);
      } else {
          canvasRef.current?.resetView();
      }
    } else {
      // Last level completed - enter Free Build mode
      setIsFreeBuild(true);
      setIsLevelComplete(false);
      setActiveTool(null);
    }
  };

  const handleNewGame = () => {
    const emptySave = SaveSystem.createEmptySave();
    const firstLevel = levels[0] as Level;
    emptySave.levelStartStates = {
        0: { levelState: firstLevel.initialState || { nodes: [], wires: [] }, metaProgress: emptySave.metaProgress }
    };
    SaveSystem.autoSave(emptySave); // Reset auto-save
    resetTutorials(); // Reset tutorial progress
    setStage2Progress(emptySave.metaProgress);
    setCurrentLevelIndex(0);
    setPendingLoad({ nodes: [], wires: [] });
    setIsLevelComplete(false);
    setIsFreeBuild(false);
    setActiveTool(null);
    setShowStage2Intro(false);
    setGameState('playing');
  };

  const handleContinue = () => {
    const saved = SaveSystem.loadAutoSave();
    if (saved) {
        applyTheoremLibraryFromSave(saved);
        setCurrentLevelIndex(saved.levelIndex);
        setStage2Progress(saved.metaProgress);
        const levelState = saved.levelStates[saved.levelIndex];
        if (levelState) {
            setPendingLoad(levelState);
        }
        setIsLevelComplete(false);
        setIsFreeBuild(false);
        setActiveTool(null);
        setShowStage2Intro(false);
        setGameState('playing');
    }
  };

  const handleLoadGame = (slot: number) => {
    const saved = SaveSystem.load(slot);
    if (saved) {
        applyTheoremLibraryFromSave(saved);
        SaveSystem.autoSave(saved); // Set as current session
        setCurrentLevelIndex(saved.levelIndex);
        setStage2Progress(saved.metaProgress);
        const levelState = saved.levelStates[saved.levelIndex];
        if (levelState) {
            setPendingLoad(levelState);
        }
        setIsLevelComplete(false);
        setIsFreeBuild(false);
        setActiveTool(null);
        setShowStage2Intro(false);
        setGameState('playing');
    }
  };

  const handleResetLevel = () => {
    const currentSession = SaveSystem.loadAutoSave() || SaveSystem.createEmptySave();
    const startStateObj = currentSession.levelStartStates?.[currentLevelIndex];
    
    let newMetaProgress = stage2Progress;
    let newLevelState: LevelState;

    if (stage2Config) {
      if (startStateObj) {
        newMetaProgress = startStateObj.metaProgress;
        newLevelState = startStateObj.levelState;
        
        // Ensure reset state applies the latest fixed layout for premise nodes
        const initialLockedPremises = stage2InitialState?.nodes.filter(
            (node) => node.type === 'premise' && node.locked
        ) ?? [];
        if (initialLockedPremises.length > 0) {
            const initialPremiseById = new Map(initialLockedPremises.map((node) => [node.id, node]));
            newLevelState.nodes = newLevelState.nodes.map((node) => {
                if (node.type !== 'premise' || !node.locked) return node;
                const fresh = initialPremiseById.get(node.id);
                if (!fresh) return node;
                return { ...node, x: fresh.x, y: fresh.y };
            });
        }
      } else {
        newMetaProgress = createDefaultStage2MetaProgress(42);
        newLevelState = { nodes: [], wires: [] };
      }
      setStage2Progress(newMetaProgress);
      setPendingLoad(newLevelState);
    } else {
      newLevelState = currentLevel.initialState || { nodes: [], wires: [] };
      setPendingLoad(newLevelState);
      forceStartTutorial(currentLevelIndex);
    }
    
    // Immediately auto-save the reset state
    SaveSystem.autoSave(
      buildSaveData(
        currentLevelIndex,
        {
          ...currentSession.levelStates,
          [currentLevelIndex]: newLevelState
        },
        newMetaProgress,
        currentSession.levelStartStates ?? {}
      )
    );
    
    setShowResetConfirm(false);
    setIsLevelComplete(false);
    setActiveTool(null);
    if (canvasRef.current) {
        if (stage2Config) {
            canvasRef.current.jumpToStage2Island(stage2Config.focusIslandId);
        } else {
            canvasRef.current.resetView();
        }
    }
  };

  const handleExportSave = () => {
    const state = canvasRef.current?.getState() || { nodes: [], wires: [] };
    const currentSession = SaveSystem.loadAutoSave() || SaveSystem.createEmptySave();
    const saveData = buildSaveData(
      currentLevelIndex,
      {
        ...currentSession.levelStates,
        [currentLevelIndex]: state
      },
      stage2Progress,
      currentSession.levelStartStates ?? {}
    );

    let theoremLibrary: SaveData['theoremLibrary'] | undefined = currentSession.theoremLibrary;
    let theoremToolbarPins: SaveData['theoremToolbarPins'] | undefined = currentSession.theoremToolbarPins;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('logic_game_theorem_library_tree_v1');
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<SaveData['theoremLibrary']>;
          if (parsed && parsed.version === 1 && parsed.root && parsed.theoremFolderById) {
            theoremLibrary = parsed as SaveData['theoremLibrary'];
          }
        }
      } catch {}
      try {
        const rawPins = localStorage.getItem('logic_game_theorem_toolbar_pins_v1');
        if (rawPins) {
          const parsed = JSON.parse(rawPins) as unknown;
          if (Array.isArray(parsed)) {
            theoremToolbarPins = parsed.map((v) => (typeof v === 'string' ? v : null));
          }
        }
      } catch {}
    }

    const fullSaveData: SaveData = {
      ...saveData,
      theoremLibrary,
      theoremToolbarPins,
    };

    const json = JSON.stringify(fullSaveData);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `logic-game-save-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);
        const normalized = SaveSystem.normalizeSaveData(parsed);
        if (!normalized) throw new Error("Invalid save data");

        // Apply to game
        applyTheoremLibraryFromSave(normalized);
        SaveSystem.autoSave(normalized);
        setCurrentLevelIndex(normalized.levelIndex);
        setStage2Progress(normalized.metaProgress);
        const levelState = normalized.levelStates[normalized.levelIndex];
        if (levelState) {
          setPendingLoad(levelState);
        } else {
          setPendingLoad({ nodes: [], wires: [] });
        }

        setIsLevelComplete(false);
        setIsFreeBuild(false);
        setActiveTool(null);
        setShowStage2Intro(false);
        setGameState('playing');
        setShowSaveMenu(false);
        alert(t('importSuccess' as TranslationKey));
      } catch (err) {
        alert(t('importFailed' as TranslationKey));
      }
    };
    reader.readAsText(file);
    
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  // Use state for timestamp to avoid hydration mismatch
  const [timestamp, setTimestamp] = useState<number>(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setTimestamp(Date.now());
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleSaveGame = (slot: number) => {
    if (canvasRef.current) {
        const state = canvasRef.current.getState();
        // Use current session data (autoSave) as base to preserve history
        const currentSession = SaveSystem.loadAutoSave() || SaveSystem.createEmptySave();
        
        const saveDataBase = buildSaveData(
            currentLevelIndex,
            {
                ...currentSession.levelStates,
                [currentLevelIndex]: state
            },
            stage2Progress,
            currentSession.levelStartStates ?? {}
        );

        let theoremLibrary: SaveData['theoremLibrary'] | undefined = currentSession.theoremLibrary;
        let theoremToolbarPins: SaveData['theoremToolbarPins'] | undefined = currentSession.theoremToolbarPins;
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('logic_game_theorem_library_tree_v1');
            if (raw) {
              const parsed = JSON.parse(raw) as Partial<SaveData['theoremLibrary']>;
              if (parsed && parsed.version === 1 && parsed.root && parsed.theoremFolderById) {
                theoremLibrary = parsed as SaveData['theoremLibrary'];
              }
            }
          } catch {
          }
          try {
            const rawPins = localStorage.getItem('logic_game_theorem_toolbar_pins_v1');
            if (rawPins) {
              const parsed = JSON.parse(rawPins) as unknown;
              if (Array.isArray(parsed)) {
                theoremToolbarPins = parsed.map((v) => (typeof v === 'string' ? v : null));
              }
            }
          } catch {
          }
        }

        const saveData: SaveData = {
          ...saveDataBase,
          theoremLibrary,
          theoremToolbarPins,
        };
        SaveSystem.save(slot, saveData);
        SaveSystem.autoSave(saveData); // Update session too
        setShowSaveMenu(false);
        setSaveSuccessSlot(slot);
    }
  };

  useEffect(() => {
    if (saveSuccessSlot == null) return;
    const timeout = setTimeout(() => setSaveSuccessSlot(null), 1400);
    return () => clearTimeout(timeout);
  }, [saveSuccessSlot]);

  const handleToolRotate = () => {
    if (!activeTool) return;
    
    let newRotation;
    if (activeTool.type === 'wire') {
        // Wire: Toggle between 0 (Horizontal/Top) and 1 (Vertical/Left)
        newRotation = ((activeTool.rotation || 0) + 1) % 2;
    } else {
        // Others: Cycle 0-3
        newRotation = ((activeTool.rotation || 0) + 1) % 4;
    }

    setActiveTool({
      ...activeTool,
      rotation: newRotation
    });
  };

  const handleToolSetRotation = (rotation: number) => {
    if (!activeTool) return;
    setActiveTool({
        ...activeTool,
        rotation
    });
  };

  const handleToolToggleType = () => {
    if (activeTool?.type === 'wire') {
        const newType = activeTool.subType === 'formula' ? 'provable' : 'formula';
        setActiveTool({ ...activeTool, subType: newType });
    }
  };

  const handleToolSetType = (subType: string) => {
    if (activeTool) {
        setActiveTool({ ...activeTool, subType });
    }
  };

  const handleCanPlaceNode = (node: NodeData) => {
    if (stage2Config) {
      const tileSet = stage2BuildableTileSet ?? new Set<string>();
      for (let x = node.x; x < node.x + node.w; x += 1) {
        for (let y = node.y; y < node.y + node.h; y += 1) {
          if (!tileSet.has(`${x},${y}`)) {
            return false;
          }
        }
      }
    }

    if (!node.theoremId) return true;

    const theorem = stage2Progress.collectedTheorems[node.theoremId];
    if (!theorem) return false;
    if (theorem.freeUsesRemaining > 0) return true;
    if (stage2Progress.coins >= theorem.cost) return true;

    alert(t('notEnoughCoinsForTheorem'));
    return false;
  };

  const handleNodePlaced = (node: NodeData) => {
    if (!node.theoremId) return;

    const theorem = stage2Progress.collectedTheorems[node.theoremId];
    if (!theorem) return;

    const nextProgress = consumeTheoremPlacement(stage2Progress, node.theoremId);
    if (nextProgress === stage2Progress) return;

    setStage2Progress(nextProgress);

    const nextTheorem = nextProgress.collectedTheorems[node.theoremId];
    if (
      activeTool?.theoremId === node.theoremId &&
      nextTheorem &&
      nextTheorem.freeUsesRemaining === 0 &&
      nextProgress.coins < nextTheorem.cost
    ) {
      setActiveTool(null);
    }
  };

  if (gameState === 'menu') {
    return (
      <StartMenu
        onNewGame={handleNewGame}
        onContinue={handleContinue}
        onLoadGame={handleLoadGame}
        bgmVolume={bgmVolume}
        onBgmVolumeChange={setBgmVolume}
      />
    );
  }

  return (
    <main className="w-screen h-screen overflow-hidden relative">
      <InfiniteCanvas 
        key={stage2Config ? `stage2-42` : currentLevel.id}
        ref={canvasRef}
        activeTool={activeTool} 
        selectMode={selectMode}
        onToolClear={() => setActiveTool(null)} 
        onToolRotate={handleToolRotate}
        onToolSetRotation={handleToolSetRotation}
        onToolToggleType={handleToolToggleType}
        goalFormula={stage2Config ? undefined : currentLevel.goal.formula}
        onLevelComplete={handleLevelComplete}
        onStage2IslandComplete={handleStage2IslandComplete}
        initialState={stage2InitialState}
        canPlaceNode={handleCanPlaceNode}
        onNodePlaced={handleNodePlaced}
        stage2Config={stage2Config}
        stage2Progress={stage2Config ? stage2Progress : undefined}
        selectedStage2IslandId={selectedStage2IslandId}
      />

      {stage2Config && (
        <Stage2Panel
          config={stage2Config}
          progress={stage2Progress}
          activeTheoremId={activeTool?.theoremId ?? null}
          selectedIslandId={selectedStage2IslandId}
          onSelectIsland={(islandId) => {
            setSelectedStage2IslandId(islandId);
            canvasRef.current?.jumpToStage2Island(islandId);
          }}
        />
      )}

      <VariantSelector 
        activeTool={activeTool} 
        onSelectVariant={handleToolSetType} 
      />
      
      {/* Save Button */}
      <div className="absolute top-4 right-4 z-50 flex flex-row items-center gap-2">
          <button 
              className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-lg border border-slate-700 font-bold flex items-center justify-center w-10 h-10 text-xl"
              onClick={() => {
                  setActiveTool(null);
                  setGameState('menu');
              }}
              title={t('mainMenu')}
          >
              <span role="img" aria-label="Menu">🔙</span>
          </button>
          
          <button 
              className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-lg border border-slate-700 font-bold flex items-center justify-center w-10 h-10 text-xl"
              onClick={() => forceStartTutorial(currentLevelIndex)}
              title="Help / Tutorial"
          >
              <span role="img" aria-label="Help">❓</span>
          </button>

          <button 
              className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-lg border border-slate-700 font-bold flex items-center justify-center w-10 h-10 text-xl"
              onClick={() => {
                setSaveMenuTab('save');
                setShowSaveMenu(true);
              }}
              title={t('saveGame')}
          >
              <span role="img" aria-label="Save Game">💾</span>
          </button>
          <button 
              className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-lg border border-slate-700 font-bold flex items-center justify-center w-10 h-10 text-xl"
              onClick={() => {
                  if (stage2Config) {
                      canvasRef.current?.jumpToStage2Island(stage2Config.focusIslandId);
                  } else {
                      canvasRef.current?.resetView();
                  }
              }}
              title={t('resetView')}
          >
              <span role="img" aria-label="Home">🏠</span>
          </button>
          <button 
              className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-lg border border-slate-700 font-bold flex items-center justify-center w-10 h-10 text-xl"
              onClick={() => setShowResetConfirm(true)}
              title={t('resetLevel')}
          >
              <span role="img" aria-label="Reset">🔄</span>
          </button>
          <button 
              className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-lg border border-slate-700 font-bold flex items-center justify-center w-10 h-10 text-xl"
              onClick={() => setShowSettings(true)}
              title={t('settings')}
          >
              <span role="img" aria-label="Settings">⚙️</span>
          </button>
      </div>

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="absolute inset-0 bg-black/60 z-[120] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 shadow-2xl w-96">
                <div className="mb-4 flex items-center gap-3">
                    <span className="text-3xl" role="img" aria-label="Warning">⚠️</span>
                    <h2 className="text-xl font-bold text-white">{t('resetLevel')}</h2>
                </div>
                <p className="text-slate-300 mb-8 leading-relaxed">
                    {t('confirmReset')}
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 py-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors font-bold border border-slate-700"
                    >
                        {t('cancel')}
                    </button>
                    <button 
                        onClick={handleResetLevel}
                        className="flex-1 py-2 text-white bg-red-600 hover:bg-red-500 rounded transition-colors font-bold border border-red-500"
                    >
                        {t('resetLevel')}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          bgmVolume={bgmVolume}
          onBgmVolumeChange={setBgmVolume}
        />
      )}

      {/* Save Menu Modal */}
      {showSaveMenu && (
        <div className="absolute inset-0 bg-black/60 z-100 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 shadow-2xl w-96">
                <div className="mb-6 flex rounded-lg bg-slate-800 p-1">
                    <button
                        onClick={() => setSaveMenuTab('save')}
                        className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
                            saveMenuTab === 'save' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                        }`}
                    >
                        {t('saveGame')}
                    </button>
                    <button
                        onClick={() => setSaveMenuTab('load')}
                        className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
                            saveMenuTab === 'load' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                        }`}
                    >
                        {t('loadGame')}
                    </button>
                    <button
                        onClick={() => setSaveMenuTab('data')}
                        className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
                            saveMenuTab === 'data' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                        }`}
                    >
                        {t('importExport' as TranslationKey)}
                    </button>
                </div>

                {saveMenuTab === 'save' ? (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-2">
                        {[1, 2, 3, 4, 5, 6].map((slot) => (
                            <button
                                key={slot}
                                onClick={() => handleSaveGame(slot)}
                                className="bg-slate-800 p-4 rounded text-white hover:bg-blue-600 border border-slate-600 transition-colors text-left flex justify-between items-center group"
                            >
                                <span className="flex items-center gap-2">
                                    <span>
                                        {t('slot')} {slot}
                                    </span>
                                    {slot === 1 && <span className="text-xs text-yellow-400">({t('autoSave')})</span>}
                                </span>
                                <span className="text-xs text-slate-500 group-hover:text-slate-200">
                                    {saveSlots[slot]
                                        ? new Date(saveSlots[slot]!.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')
                                        : t('emptySlot')}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : saveMenuTab === 'load' ? (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-2">
                        {[1, 2, 3, 4, 5, 6].map((slot) => {
                            const info = saveSlots[slot];
                            const canLoad = Boolean(info);
                            return (
                                <button
                                    key={slot}
                                    disabled={!canLoad}
                                    onClick={() => {
                                        if (!canLoad) return;
                                        setShowSaveMenu(false);
                                        handleLoadGame(slot);
                                    }}
                                    className={`p-4 rounded border transition-colors text-left flex flex-col gap-1 ${
                                        canLoad
                                            ? 'bg-slate-800 text-white hover:bg-green-700/60 border-slate-600'
                                            : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 font-bold">
                                            <span>
                                                {t('slot')} {slot}
                                            </span>
                                            {slot === 1 && <span className="text-xs text-yellow-400">({t('autoSave')})</span>}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {info
                                                ? new Date(info.timestamp).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')
                                                : t('emptySlot')}
                                        </div>
                                    </div>
                                    {info && (
                                        <div className="text-sm text-slate-300">
                                            {t('level')} {info.levelIndex + 1}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="bg-slate-800 p-4 rounded border border-slate-600">
                            <h3 className="text-white font-bold mb-1">{t('exportSave' as TranslationKey)}</h3>
                            <p className="text-xs text-slate-400 mb-3">{t('downloadSaveDesc' as TranslationKey)}</p>
                            <button
                                onClick={handleExportSave}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-bold transition-colors"
                            >
                                {t('exportSave' as TranslationKey)}
                            </button>
                        </div>
                        <div className="bg-slate-800 p-4 rounded border border-slate-600">
                            <h3 className="text-white font-bold mb-1">{t('importSave' as TranslationKey)}</h3>
                            <p className="text-xs text-slate-400 mb-3">{t('importSaveDesc' as TranslationKey)}</p>
                            <label className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded font-bold transition-colors cursor-pointer flex items-center justify-center">
                                {t('importSave' as TranslationKey)}
                                <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={handleImportSave}
                                />
                            </label>
                        </div>
                    </div>
                )}
                <button 
                    onClick={() => setShowSaveMenu(false)}
                    className="mt-6 w-full py-2 text-slate-400 hover:text-white border border-transparent hover:border-slate-600 rounded transition-colors"
                >
                    {t('cancel')}
                </button>
            </div>
        </div>
      )}

      {saveSuccessSlot != null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[26rem] max-w-[92vw] rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300">{t('saveGame')}</div>
                <div className="text-xl font-bold text-white">{t('saveSuccess')}</div>
              </div>
              <button
                onClick={() => setSaveSuccessSlot(null)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
              >
                {t('cancel')}
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-200">
              {t('slot')} {saveSuccessSlot}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSaveSuccessSlot(null)}
                className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-cyan-500"
              >
                {t('ok')}
              </button>
            </div>
          </div>
        </div>
      )}

      {stage2Config && stage2Progress.completedIslandIds.includes(stage2Config.focusIslandId) && (
        <DraggableModal title={t('levelComplete')}>
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-4xl font-bold text-green-300">{t('levelComplete')}</h2>
            <p className="text-slate-300">{t('greatJob') || 'Great job! You proved the theorem.'}</p>
            <button
              onClick={handleNextLevel}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
              {currentLevelIndex < levels.length - 1 ? t('nextLevel') : t('freeBuild')}
            </button>
          </div>
        </DraggableModal>
      )}

      {showStage2Intro &&
        stage2Config &&
        !stage2Progress.completedIslandIds.includes(stage2Config.focusIslandId) && (
        <DraggableModal title={`${t('stage')} ${stage2Config.stageNumber}`}>
          <div className="flex max-w-xl flex-col gap-4 text-slate-200">
            <h2 className="text-3xl font-bold text-cyan-300">
              {t('stage')} {stage2Config.stageNumber} / {t('chapter')} {stage2Config.chapterLevel}
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              {stage2Config.introTextKey
                ? t(stage2Config.introTextKey as TranslationKey)
                : stage2Config.introText}
            </p>
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('mainIsland')}</div>
              <div className="mt-1 text-lg font-bold text-white">
                {stage2Config.world.getIslandById(stage2Config.focusIslandId)?.name}
              </div>
              <div className="mt-1 text-sm text-slate-300">
                {t(`level-${currentLevelIndex + 1}-desc` as TranslationKey) || currentLevel.description}
              </div>
            </div>
            <button
              onClick={() => setShowStage2Intro(false)}
              className="self-end rounded-lg bg-cyan-600 px-5 py-2 font-bold text-white transition-colors hover:bg-cyan-500"
            >
              {t('back')}
            </button>
          </div>
        </DraggableModal>
      )}
      
      {!stage2Config && (
        <LevelGoal 
          level={currentLevelIndex + 1}
          title={t(`level-${currentLevelIndex + 1}-title` as TranslationKey) || currentLevel.title}
          goalFormula={currentLevel.goal.formula}
          description={t(`level-${currentLevelIndex + 1}-desc` as TranslationKey) || currentLevel.description}
        />
      )}

      {isLevelComplete && !stage2Config && (
        <DraggableModal title={t('levelComplete')}>
            <div className="flex flex-col items-center gap-4">
                <h2 className="text-4xl font-bold text-green-300">{t('levelComplete')}</h2>
                <p className="text-slate-300">{t('greatJob') || 'Great job! You proved the theorem.'}</p>
                <button 
                    onClick={handleNextLevel}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                    {currentLevelIndex < levels.length - 1 ? t('nextLevel') : t('freeBuild')}
                </button>
            </div>
        </DraggableModal>
      )}

      <Toolbar 
        activeTool={activeTool} 
        onSelectTool={setActiveTool}
        selectMode={selectMode}
        onSelectModeChange={setSelectMode}
        unlockedTools={
          isFreeBuild || stage2Config
            ? [
                'atom:P',
                'atom:Q',
                'atom:R',
                ...(stage2Config?.levelId !== 'level-11' ? ['atom:S', 'atom:T'] : []),
                'gate:implies',
                'gate:not',
                'axiom:1',
                'axiom:2',
                'axiom:3',
                'mp',
                'bridge',
                'display:small',
                'display:large',
              ]
            : currentLevel.unlockedTools
        }
        theoremInventory={stage2Config ? resolvedTheoremInventory : []}
        recommendedTheoremIds={stage2Config?.recommendedTheoremIds ?? []}
        coins={stage2Progress.coins}
      />
      <TutorialOverlay />
    </main>
  );
}
