'use client';

import InfiniteCanvas, { InfiniteCanvasHandle } from "@/components/InfiniteCanvas";
import Toolbar from "@/components/Toolbar";
import LevelGoal from "@/components/LevelGoal";
import StartMenu from "@/components/StartMenu";
import DraggableModal from "@/components/DraggableModal";
import VariantSelector from "@/components/VariantSelector";
import levels from "@/data/levels.json";
import { useState, useRef, useEffect } from 'react';
import { Tool } from '@/types/game';
import { SaveSystem, LevelState, SaveData } from '@/lib/saveSystem';
import { NodeData, Wire } from '@/types/game';

export default function Home() {
  const canvasRef = useRef<InfiniteCanvasHandle>(null);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isFreeBuild, setIsFreeBuild] = useState(false);
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');
  const [pendingLoad, setPendingLoad] = useState<LevelState | null>(null);
  const [showSaveMenu, setShowSaveMenu] = useState(false);

  const currentLevel = levels[currentLevelIndex];

  // Auto-save every 30 seconds
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
        if (canvasRef.current) {
            const state = canvasRef.current.getState();
            // Load existing auto-save to preserve other levels if needed
            const existing = SaveSystem.loadAutoSave() || { timestamp: 0, levelIndex: 0, levelStates: {} };
            
            const saveData: SaveData = {
                timestamp: Date.now(),
                levelIndex: currentLevelIndex,
                levelStates: {
                    ...existing.levelStates,
                    [currentLevelIndex]: state
                }
            };
            SaveSystem.autoSave(saveData);
            // console.log("Auto-saved");
        }
    }, 30000);

    return () => clearInterval(interval);
  }, [gameState, currentLevelIndex]);

  // Handle pending state load
  useEffect(() => {
    if (gameState === 'playing' && pendingLoad && canvasRef.current) {
        canvasRef.current.loadState(pendingLoad);
        setPendingLoad(null);
    }
  }, [gameState, pendingLoad]);

  const handleLevelComplete = () => {
    setIsLevelComplete(true);
  };

  const handleNextLevel = () => {
    if (currentLevelIndex < levels.length - 1) {
      // Save progress before moving
      if (canvasRef.current) {
          const state = canvasRef.current.getState();
          const currentSession = SaveSystem.loadAutoSave() || { timestamp: 0, levelIndex: 0, levelStates: {} };
          const saveData: SaveData = {
              timestamp: Date.now(),
              levelIndex: currentLevelIndex + 1, // Advance to next level in save
              levelStates: {
                  ...currentSession.levelStates,
                  [currentLevelIndex]: state // Save completed level state
              }
          };
          SaveSystem.autoSave(saveData);
      }

      setCurrentLevelIndex(prev => prev + 1);
      setIsLevelComplete(false);
      canvasRef.current?.resetView();
    } else {
      // Last level completed - enter Free Build mode
      setIsFreeBuild(true);
      setIsLevelComplete(false);
    }
  };

  const handleNewGame = () => {
    const emptySave: SaveData = { timestamp: Date.now(), levelIndex: 0, levelStates: {} };
    SaveSystem.autoSave(emptySave); // Reset auto-save
    setCurrentLevelIndex(0);
    setPendingLoad({ nodes: [], wires: [] });
    setIsLevelComplete(false);
    setIsFreeBuild(false);
    setActiveTool(null);
    setGameState('playing');
  };

  const handleContinue = () => {
    const saved = SaveSystem.loadAutoSave();
    if (saved) {
        setCurrentLevelIndex(saved.levelIndex);
        const levelState = saved.levelStates[saved.levelIndex];
        if (levelState) {
            setPendingLoad(levelState);
        }
        setIsLevelComplete(false);
        setIsFreeBuild(false);
        setActiveTool(null);
        setGameState('playing');
    }
  };

  const handleLoadGame = (slot: number) => {
    const saved = SaveSystem.load(slot);
    if (saved) {
        SaveSystem.autoSave(saved); // Set as current session
        setCurrentLevelIndex(saved.levelIndex);
        const levelState = saved.levelStates[saved.levelIndex];
        if (levelState) {
            setPendingLoad(levelState);
        }
        setIsLevelComplete(false);
        setIsFreeBuild(false);
        setActiveTool(null);
        setGameState('playing');
    }
  };

  const handleSaveGame = (slot: number) => {
    if (canvasRef.current) {
        const state = canvasRef.current.getState();
        // Use current session data (autoSave) as base to preserve history
        const currentSession = SaveSystem.loadAutoSave() || { timestamp: 0, levelIndex: 0, levelStates: {} };
        
        const saveData: SaveData = {
            timestamp: Date.now(),
            levelIndex: currentLevelIndex,
            levelStates: {
                ...currentSession.levelStates,
                [currentLevelIndex]: state
            }
        };
        SaveSystem.save(slot, saveData);
        SaveSystem.autoSave(saveData); // Update session too
        setShowSaveMenu(false);
        alert(`Game saved to slot ${slot}`);
    }
  };

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

  if (gameState === 'menu') {
    return <StartMenu onNewGame={handleNewGame} onContinue={handleContinue} onLoadGame={handleLoadGame} />;
  }

  return (
    <main className="w-screen h-screen overflow-hidden relative">
      <InfiniteCanvas 
        key={currentLevel.id} // Reset canvas on level change
        ref={canvasRef}
        activeTool={activeTool} 
        onToolClear={() => setActiveTool(null)} 
        onToolRotate={handleToolRotate}
        onToolSetRotation={handleToolSetRotation}
        onToolToggleType={handleToolToggleType}
        goalFormula={currentLevel.goal.formula}
        onLevelComplete={handleLevelComplete}
        initialState={(currentLevel as any).initialState}
      />

      <VariantSelector 
        activeTool={activeTool} 
        onSelectVariant={handleToolSetType} 
      />
      
      {/* Save Button */}
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
          <button 
              className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-lg border border-slate-700 font-bold flex items-center justify-center w-10 h-10 text-xl"
              onClick={() => {
                  setActiveTool(null);
                  setGameState('menu');
              }}
              title="Main Menu"
          >
              <span role="img" aria-label="Menu">🔙</span>
          </button>
          <button 
              className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-lg border border-slate-700 font-bold flex items-center justify-center w-10 h-10 text-xl"
              onClick={() => setShowSaveMenu(true)}
              title="Save Game"
          >
              <span role="img" aria-label="Save Game">💾</span>
          </button>
          <button 
              className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-lg border border-slate-700 font-bold flex items-center justify-center w-10 h-10 text-xl"
              onClick={() => canvasRef.current?.resetView()}
              title="Reset View"
          >
              <span role="img" aria-label="Home">🏠</span>
          </button>
      </div>

      {/* Save Menu Modal */}
      {showSaveMenu && (
        <div className="absolute inset-0 bg-black/60 z-100 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 shadow-2xl w-96">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Save Game</h2>
                <div className="flex flex-col gap-3">
                    {[1,2,3,4].map(slot => (
                        <button 
                            key={slot}
                            onClick={() => handleSaveGame(slot)}
                            className="bg-slate-800 p-4 rounded text-white hover:bg-blue-600 border border-slate-600 transition-colors text-left flex justify-between items-center group"
                        >
                            <span>Slot {slot}</span>
                            <span className="text-xs text-slate-500 group-hover:text-slate-200">
                                {SaveSystem.getSlotInfo(slot) ? new Date(SaveSystem.getSlotInfo(slot)!.timestamp).toLocaleTimeString() : 'Empty'}
                            </span>
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => setShowSaveMenu(false)}
                    className="mt-6 w-full py-2 text-slate-400 hover:text-white border border-transparent hover:border-slate-600 rounded transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
      )}
      
      <LevelGoal 
        level={currentLevelIndex + 1}
        title={currentLevel.title}
        goalFormula={currentLevel.goal.formula}
        description={currentLevel.description}
      />

      {isLevelComplete && (
        <DraggableModal title="Level Complete">
            <div className="flex flex-col items-center gap-4">
                <h2 className="text-4xl font-bold text-green-300">Level Complete!</h2>
                <p className="text-slate-300">Great job! You proved the theorem.</p>
                <button 
                    onClick={handleNextLevel}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                    {currentLevelIndex < levels.length - 1 ? "Next Level" : "Free Build"}
                </button>
            </div>
        </DraggableModal>
      )}

      <Toolbar 
        activeTool={activeTool} 
        onSelectTool={setActiveTool} 
        unlockedTools={isFreeBuild ? ['atom:P', 'atom:Q', 'atom:R', 'gate:implies', 'gate:not', 'axiom:1', 'axiom:2', 'axiom:3', 'mp'] : currentLevel.unlockedTools}
      />
    </main>
  );
}
