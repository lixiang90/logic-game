
'use client';

import React from 'react';
import { Tool, NodeType } from '@/types/game';
import { useLanguage } from '@/contexts/LanguageContext';
import { TheoremChipInventoryEntry } from '@/types/stage2';

export type SelectMode = 'pointer' | 'box';

interface ToolbarProps {
    activeTool: Tool | null;
    onSelectTool: (tool: Tool | null) => void;
    selectMode?: SelectMode;
    onSelectModeChange?: (mode: SelectMode) => void;
    unlockedTools?: string[];
    theoremInventory?: TheoremChipInventoryEntry[];
    recommendedTheoremIds?: string[];
    coins?: number;
}

export default function Toolbar({
    activeTool,
    onSelectTool,
    selectMode = 'pointer',
    onSelectModeChange,
    unlockedTools,
    theoremInventory = [],
    recommendedTheoremIds = [],
    coins = 0
}: ToolbarProps) {
    const { t } = useLanguage();
    const [showTheoremLibrary, setShowTheoremLibrary] = React.useState(false);
    const [theoremLibrarySelectedId, setTheoremLibrarySelectedId] = React.useState<string | null>(null);
    const THEOREM_LIBRARY_STORAGE_KEY = 'logic_game_theorem_library_tree_v1';
    const THEOREM_TOOLBAR_PINS_KEY = 'logic_game_theorem_toolbar_pins_v1';
    const THEOREM_TOOLBAR_PIN_COUNT = 8;
    const [showTheoremMenu, setShowTheoremMenu] = React.useState(false);
    const [pinnedTheoremIds, setPinnedTheoremIds] = React.useState<Array<string | null>>([]);
    const [theoremMenuDragOverIndex, setTheoremMenuDragOverIndex] = React.useState<number | null>(null);
    const [isDraggingTheoremToToolbar, setIsDraggingTheoremToToolbar] = React.useState(false);
    const theoremMenuRef = React.useRef<HTMLDivElement | null>(null);
    const theoremMenuButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const [showMoreAtomsMenu, setShowMoreAtomsMenu] = React.useState(false);
    const moreAtomsMenuRef = React.useRef<HTMLDivElement | null>(null);
    const moreAtomsButtonRef = React.useRef<HTMLButtonElement | null>(null);

    type TheoremFolderNode = {
        id: string;
        name: string;
        children: TheoremFolderNode[];
    };

    type TheoremLibraryState = {
        version: 1;
        root: TheoremFolderNode;
        theoremFolderById: Record<string, string | undefined>;
    };

    const createEmptyLibraryState = (): TheoremLibraryState => ({
        version: 1,
        root: { id: 'root', name: 'root', children: [] },
        theoremFolderById: {},
    });

    const [theoremLibraryState, setTheoremLibraryState] = React.useState<TheoremLibraryState>(createEmptyLibraryState);
    const [isLibraryLoaded, setIsLibraryLoaded] = React.useState(false);
    const [theoremLibrarySelectedFolderId, setTheoremLibrarySelectedFolderId] = React.useState<string>('root');
    const [theoremLibraryExpandedFolderIds, setTheoremLibraryExpandedFolderIds] = React.useState<string[]>(['root']);
    const [theoremLibraryMode, setTheoremLibraryMode] = React.useState<'browse' | 'manage'>('browse');
    const [theoremLibraryManagePath, setTheoremLibraryManagePath] = React.useState<string[]>(['root']);
    const [manageFolderDragOverId, setManageFolderDragOverId] = React.useState<string | null>(null);
    const [deleteFolderCandidateId, setDeleteFolderCandidateId] = React.useState<string | null>(null);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = React.useState(false);
    const [createFolderParentId, setCreateFolderParentId] = React.useState<string>('root');
    const [createFolderName, setCreateFolderName] = React.useState('');
    const createFolderInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleSelect = (type: NodeType, subType: string, w: number, h: number) => {
        onSelectTool({ type, subType, w, h, rotation: 0 });
    };

    const normalizeTheoremFormula = (formula: string) => formula.replace(/^\s*(\|-|⊢)\s*/, '').trim();

    const extractVariables = (parts: string[]) => {
        const vars = new Set<string>();
        parts.forEach((part) => {
            const text = normalizeTheoremFormula(part);
            const matches = text.match(/[A-Z][A-Za-z0-9]*/g) ?? [];
            matches.forEach((m) => vars.add(m));
        });
        return Array.from(vars);
    };

    const findFolderById = React.useCallback(function findFolder(node: TheoremFolderNode, id: string): TheoremFolderNode | null {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findFolder(child, id);
            if (found) return found;
        }
        return null;
    }, []);

    const getFolderDisplayName = React.useCallback((folder: TheoremFolderNode) => {
        if (folder.id === 'root') return t('rootFolder');
        if (folder.id === 'trash') return t('trash');
        return folder.name;
    }, [t]);

    const findPathToFolder = React.useCallback(
        function findPath(node: TheoremFolderNode, targetId: string, path: string[]): string[] | null {
            if (node.id === targetId) return path;
            for (const child of node.children) {
                const found = findPath(child, targetId, [...path, child.id]);
                if (found) return found;
            }
            return null;
        },
        []
    );

    const collectSubtreeFolderIds = React.useCallback(function collectIds(node: TheoremFolderNode, out: Set<string>) {
        out.add(node.id);
        node.children.forEach((child) => collectIds(child, out));
    }, []);

    const isDescendantFolder = React.useCallback(
        (root: TheoremFolderNode, ancestorId: string, possibleDescendantId: string) => {
            const ancestor = findFolderById(root, ancestorId);
            if (!ancestor) return false;
            const ids = new Set<string>();
            collectSubtreeFolderIds(ancestor, ids);
            return ids.has(possibleDescendantId);
        },
        [collectSubtreeFolderIds, findFolderById]
    );

    const listFolders = React.useCallback(function listFoldersInner(
        node: TheoremFolderNode,
        depth: number,
        out: Array<{ id: string; name: string; depth: number }>
    ) {
        out.push({ id: node.id, name: node.name, depth });
        node.children.forEach((child) => listFoldersInner(child, depth + 1, out));
    }, []);

    React.useEffect(() => {
        const loadLibrary = () => {
            if (typeof window === 'undefined') return;
            try {
                const raw = localStorage.getItem(THEOREM_LIBRARY_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw) as Partial<TheoremLibraryState>;
                    if (parsed.version === 1 && parsed.root && parsed.theoremFolderById) {
                        setTheoremLibraryState({
                            version: 1,
                            root: parsed.root as TheoremFolderNode,
                            theoremFolderById: parsed.theoremFolderById as Record<string, string | undefined>,
                        });
                    }
                }
            } catch {}
            setIsLibraryLoaded(true);
        };
        
        loadLibrary();
        window.addEventListener('logic_game_save_loaded', loadLibrary);
        return () => window.removeEventListener('logic_game_save_loaded', loadLibrary);
    }, [THEOREM_LIBRARY_STORAGE_KEY]);

    React.useEffect(() => {
        if (!showTheoremLibrary) return;
        setTheoremLibraryState((prev) => {
            const hasTrash = Boolean(findFolderById(prev.root, 'trash'));
            if (hasTrash) return prev;
            const trashFolder: TheoremFolderNode = { id: 'trash', name: 'trash', children: [] };
            return { ...prev, root: { ...prev.root, children: [...prev.root.children, trashFolder] } };
        });
    }, [findFolderById, showTheoremLibrary]);

    React.useEffect(() => {
        if (!isLibraryLoaded) return;
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(THEOREM_LIBRARY_STORAGE_KEY, JSON.stringify(theoremLibraryState));
        } catch {
        }
    }, [THEOREM_LIBRARY_STORAGE_KEY, theoremLibraryState, isLibraryLoaded]);

    React.useEffect(() => {
        if (!showTheoremLibrary) return;
        setTheoremLibraryExpandedFolderIds((prev) => (prev.includes('root') ? prev : ['root', ...prev]));
    }, [showTheoremLibrary]);

    const theoremInventoryOrdered = React.useMemo(() => {
        const theoremById = new Map(theoremInventory.map((entry) => [entry.theoremId, entry]));
        const ordered: TheoremChipInventoryEntry[] = [];

        recommendedTheoremIds.forEach((theoremId) => {
            const entry = theoremById.get(theoremId);
            if (entry) ordered.push(entry);
        });

        theoremInventory.forEach((entry) => {
            if (!ordered.some((item) => item.theoremId === entry.theoremId)) {
                ordered.push(entry);
            }
        });

        return ordered;
    }, [recommendedTheoremIds, theoremInventory]);

    const availableTheoremIdSet = React.useMemo(() => new Set(theoremInventoryOrdered.map((t) => t.theoremId)), [theoremInventoryOrdered]);

    const normalizedPinnedTheoremIds = React.useMemo(() => {
        const normalized: Array<string | null> = Array.isArray(pinnedTheoremIds) ? pinnedTheoremIds.slice(0, THEOREM_TOOLBAR_PIN_COUNT) : [];
        while (normalized.length < THEOREM_TOOLBAR_PIN_COUNT) normalized.push(null);

        const seen = new Set<string>();
        for (let i = 0; i < normalized.length; i += 1) {
            const id = normalized[i];
            if (!id) continue;
            if (!availableTheoremIdSet.has(id) || seen.has(id)) {
                normalized[i] = null;
                continue;
            }
            seen.add(id);
        }

        const fillCandidates: string[] = [];
        recommendedTheoremIds.forEach((id) => {
            if (availableTheoremIdSet.has(id) && !seen.has(id) && !fillCandidates.includes(id)) fillCandidates.push(id);
        });
        theoremInventoryOrdered.forEach((entry) => {
            if (!seen.has(entry.theoremId) && !fillCandidates.includes(entry.theoremId)) fillCandidates.push(entry.theoremId);
        });

        for (let i = 0; i < normalized.length; i += 1) {
            if (normalized[i]) continue;
            const next = fillCandidates.shift();
            if (!next) break;
            normalized[i] = next;
            seen.add(next);
        }

        return normalized;
    }, [
        availableTheoremIdSet,
        pinnedTheoremIds,
        recommendedTheoremIds,
        theoremInventoryOrdered,
        THEOREM_TOOLBAR_PIN_COUNT,
    ]);

    const [isPinsLoaded, setIsPinsLoaded] = React.useState(false);

    React.useEffect(() => {
        const loadPins = () => {
            if (typeof window === 'undefined') return;
            try {
                const raw = localStorage.getItem(THEOREM_TOOLBAR_PINS_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw) as unknown;
                    if (Array.isArray(parsed)) {
                        const next = parsed.slice(0, THEOREM_TOOLBAR_PIN_COUNT).map((v) => (typeof v === 'string' ? v : null));
                        setPinnedTheoremIds(next);
                    }
                }
            } catch {}
            setIsPinsLoaded(true);
        };

        loadPins();
        window.addEventListener('logic_game_save_loaded', loadPins);
        return () => window.removeEventListener('logic_game_save_loaded', loadPins);
    }, [THEOREM_TOOLBAR_PIN_COUNT, THEOREM_TOOLBAR_PINS_KEY]);

    React.useEffect(() => {
        if (!isPinsLoaded) return;
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(THEOREM_TOOLBAR_PINS_KEY, JSON.stringify(normalizedPinnedTheoremIds));
        } catch {
        }
    }, [THEOREM_TOOLBAR_PINS_KEY, normalizedPinnedTheoremIds, isPinsLoaded]);

    React.useEffect(() => {
        if (pinnedTheoremIds.length !== normalizedPinnedTheoremIds.length) {
            setPinnedTheoremIds(normalizedPinnedTheoremIds);
            return;
        }
        for (let i = 0; i < pinnedTheoremIds.length; i += 1) {
            if (pinnedTheoremIds[i] !== normalizedPinnedTheoremIds[i]) {
                setPinnedTheoremIds(normalizedPinnedTheoremIds);
                break;
            }
        }
    }, [normalizedPinnedTheoremIds, pinnedTheoremIds]);

    React.useEffect(() => {
        if (!showTheoremLibrary) return;
        setShowTheoremMenu(true);
    }, [showTheoremLibrary]);

    React.useEffect(() => {
        if (!showTheoremMenu) return;
        const onPointerDown = (e: MouseEvent) => {
            if (isDraggingTheoremToToolbar) return;
            const target = e.target as Node | null;
            if (!target) return;
            if (theoremMenuRef.current && theoremMenuRef.current.contains(target)) return;
            if (theoremMenuButtonRef.current && theoremMenuButtonRef.current.contains(target)) return;
            setShowTheoremMenu(false);
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [isDraggingTheoremToToolbar, showTheoremMenu]);

    React.useEffect(() => {
        if (!showMoreAtomsMenu) return;
        const onPointerDown = (e: MouseEvent) => {
            const target = e.target as Node | null;
            if (!target) return;
            if (moreAtomsMenuRef.current && moreAtomsMenuRef.current.contains(target)) return;
            if (moreAtomsButtonRef.current && moreAtomsButtonRef.current.contains(target)) return;
            setShowMoreAtomsMenu(false);
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [showMoreAtomsMenu]);

    const canAffordTheorem = (theorem: TheoremChipInventoryEntry) =>
        theorem.freeUsesRemaining > 0 || coins >= theorem.cost;

    const handleTheoremSelect = (theorem: TheoremChipInventoryEntry) => {
        if (!canAffordTheorem(theorem)) return;

        const premises = theorem.premises ?? [];
        const rawFormula = theorem.formula ?? '';
        const conclusion = normalizeTheoremFormula(rawFormula);
        const isFormulaOnly = !rawFormula.trim().startsWith('|-') && !rawFormula.trim().startsWith('⊢');
        const vars = extractVariables([...premises, conclusion]);
        const portRows = Math.max(1, vars.length + premises.length);
        const h = Math.max(6, portRows * 2 + 2);

        onSelectTool({
            type: 'theorem',
            subType: theorem.theoremId,
            customLabel: theorem.formula,
            theoremId: theorem.theoremId,
            sourceIslandId: theorem.sourceIslandId,
            placementCost: theorem.cost,
            theoremName: theorem.name,
            theoremVars: vars,
            theoremPremises: premises,
            theoremConclusion: conclusion,
            theoremIsFormulaOnly: isFormulaOnly,
            w: 10,
            h,
            rotation: 0,
        });
        // We do NOT hide the library here if they are just dragging.
        // It's only hidden explicitly by the library UI's own logic (e.g., Return to game button).
    };

    const isUnlocked = (type: string, subType?: string) => {
        if (!unlockedTools) return true;
        if (type === 'wire') return true; // Wire always unlocked
        if (type === 'mp' && unlockedTools.includes('mp')) return true;
        if (type === 'display' && subType && unlockedTools.includes(`display:${subType}`)) return true;
        if (type === 'bridge') return unlockedTools.includes('bridge');
        return unlockedTools.includes(`${type}:${subType}`);
    };

    const isActive = (subType: string) => activeTool?.subType === subType;
    const isTheoremActive = (theoremId: string) => activeTool?.theoremId === theoremId;
    const isPointerActive = activeTool === null && selectMode === 'pointer';
    const isBoxSelectActive = activeTool === null && selectMode === 'box';
    const activeClass = "ring-2 ring-white ring-offset-2 ring-offset-slate-900";

    const handleReplacePinnedTheorem = React.useCallback((targetIndex: number, theoremId: string) => {
        setPinnedTheoremIds((prev) => {
            const next = Array.isArray(prev) ? prev.slice(0, THEOREM_TOOLBAR_PIN_COUNT) : [];
            while (next.length < THEOREM_TOOLBAR_PIN_COUNT) next.push(null);
            const existingIndex = next.findIndex((id) => id === theoremId);
            if (existingIndex === targetIndex) return next;
            if (existingIndex >= 0) {
                const tmp = next[targetIndex];
                next[targetIndex] = theoremId;
                next[existingIndex] = tmp ?? null;
                return next;
            }
            next[targetIndex] = theoremId;
            return next;
        });
    }, [THEOREM_TOOLBAR_PIN_COUNT]);

    React.useEffect(() => {
        if (!showTheoremLibrary) return;
        if (theoremInventoryOrdered.length === 0) return;
        if (theoremLibrarySelectedId && theoremInventoryOrdered.some((t) => t.theoremId === theoremLibrarySelectedId)) {
            return;
        }
        setTheoremLibrarySelectedId(theoremInventoryOrdered[0].theoremId);
    }, [showTheoremLibrary, theoremInventoryOrdered, theoremLibrarySelectedId]);

    const selectedTheorem = React.useMemo(() => {
        if (!theoremLibrarySelectedId) return null;
        return theoremInventoryOrdered.find((item) => item.theoremId === theoremLibrarySelectedId) ?? null;
    }, [theoremInventoryOrdered, theoremLibrarySelectedId]);

    const selectedTheoremDetails = React.useMemo(() => {
        if (!selectedTheorem) return null;
        const premises = selectedTheorem.premises ?? [];
        const conclusion = normalizeTheoremFormula(selectedTheorem.formula);
        const vars = extractVariables([...premises, conclusion]);
        return { premises, conclusion, vars };
    }, [selectedTheorem, extractVariables]);

    const folderOptions = React.useMemo(() => {
        const out: Array<{ id: string; name: string; depth: number }> = [];
        listFolders(theoremLibraryState.root, 0, out);
        return out;
    }, [listFolders, theoremLibraryState.root]);

    const folderIdSet = React.useMemo(() => new Set(folderOptions.map((f) => f.id)), [folderOptions]);

    const selectedTheoremFolderId = React.useMemo(() => {
        if (!selectedTheorem) return 'root';
        return theoremLibraryState.theoremFolderById[selectedTheorem.theoremId] ?? 'root';
    }, [selectedTheorem, theoremLibraryState.theoremFolderById]);

    React.useEffect(() => {
        if (!folderIdSet.has(theoremLibrarySelectedFolderId)) {
            setTheoremLibrarySelectedFolderId('root');
        }
        if (!theoremLibraryExpandedFolderIds.includes('root')) {
            setTheoremLibraryExpandedFolderIds((prev) => ['root', ...prev]);
        }
    }, [folderIdSet, theoremLibraryExpandedFolderIds, theoremLibrarySelectedFolderId]);

    React.useEffect(() => {
        if (!showTheoremLibrary) return;
        setTheoremLibraryState((prev) => {
            const nextMapping: Record<string, string | undefined> = { ...prev.theoremFolderById };
            let changed = false;
            theoremInventoryOrdered.forEach((theorem) => {
                const current = nextMapping[theorem.theoremId];
                if (!current) {
                    nextMapping[theorem.theoremId] = 'root';
                    changed = true;
                    return;
                }
                if (!folderIdSet.has(current)) {
                    nextMapping[theorem.theoremId] = 'root';
                    changed = true;
                }
            });
            if (!changed) return prev;
            return { ...prev, theoremFolderById: nextMapping };
        });
    }, [folderIdSet, showTheoremLibrary, theoremInventoryOrdered]);

    const addFolder = React.useCallback((parentId: string, folderName: string) => {
        const name = folderName.trim();
        if (!name) return;
        const newId = `folder_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const newFolder: TheoremFolderNode = { id: newId, name, children: [] };

        setTheoremLibraryState((prev) => {
            const insert = (node: TheoremFolderNode): TheoremFolderNode => {
                if (node.id === parentId) {
                    return { ...node, children: [...node.children, newFolder] };
                }
                return { ...node, children: node.children.map(insert) };
            };
            return { ...prev, root: insert(prev.root) };
        });
        setTheoremLibraryExpandedFolderIds((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
    }, []);

    const moveFolder = React.useCallback(
        (folderId: string, targetFolderId: string) => {
            if (folderId === 'root' || folderId === 'trash') return;
            if (targetFolderId === folderId) return;
            setTheoremLibraryState((prev) => {
                if (isDescendantFolder(prev.root, folderId, targetFolderId)) return prev;
                let extracted: TheoremFolderNode | null = null;
                const remove = (node: TheoremFolderNode): TheoremFolderNode => {
                    return {
                        ...node,
                        children: node.children
                            .filter((child) => {
                                if (child.id === folderId) {
                                    extracted = child;
                                    return false;
                                }
                                return true;
                            })
                            .map(remove),
                    };
                };

                const rootAfterRemove = remove(prev.root);
                if (!extracted) return prev;

                const targetExists = Boolean(findFolderById(rootAfterRemove, targetFolderId));
                const finalTargetId = targetExists ? targetFolderId : 'root';

                const insert = (node: TheoremFolderNode): TheoremFolderNode => {
                    if (node.id === finalTargetId) {
                        return { ...node, children: [...node.children, extracted!] };
                    }
                    return { ...node, children: node.children.map(insert) };
                };

                const rootNext = insert(rootAfterRemove);
                return { ...prev, root: rootNext };
            });
        },
        [findFolderById, isDescendantFolder]
    );

    const handleCreateFolder = React.useCallback((parentId: string) => {
        const parent = findFolderById(theoremLibraryState.root, parentId);
        if (!parent) return;
        setCreateFolderParentId(parentId);
        setCreateFolderName('');
        setIsCreateFolderOpen(true);
    }, [findFolderById, theoremLibraryState.root]);

    React.useEffect(() => {
        if (!isCreateFolderOpen) return;
        const raf = requestAnimationFrame(() => {
            createFolderInputRef.current?.focus();
        });
        return () => cancelAnimationFrame(raf);
    }, [isCreateFolderOpen]);

    const setTheoremFolder = React.useCallback((theoremId: string, folderId: string) => {
        const targetId = folderIdSet.has(folderId) ? folderId : 'root';
        setTheoremLibraryState((prev) => ({
            ...prev,
            theoremFolderById: {
                ...prev.theoremFolderById,
                [theoremId]: targetId,
            },
        }));
    }, [folderIdSet]);

    const deleteFolder = React.useCallback(
        (folderId: string) => {
            if (folderId === 'root' || folderId === 'trash') return;
            const subtreeIds = new Set<string>();
            const node = findFolderById(theoremLibraryState.root, folderId);
            if (!node) return;
            collectSubtreeFolderIds(node, subtreeIds);

            setTheoremLibraryState((prev) => {
                const nextMapping: Record<string, string | undefined> = { ...prev.theoremFolderById };
                Object.keys(nextMapping).forEach((theoremId) => {
                    const fId = nextMapping[theoremId];
                    if (fId && subtreeIds.has(fId)) nextMapping[theoremId] = 'trash';
                });

                const remove = (n: TheoremFolderNode): TheoremFolderNode => {
                    return {
                        ...n,
                        children: n.children.filter((c) => c.id !== folderId).map(remove),
                    };
                };

                const rootNext = remove(prev.root);
                const hasTrash = Boolean(findFolderById(rootNext, 'trash'));
                const rootWithTrash = hasTrash
                    ? rootNext
                    : { ...rootNext, children: [...rootNext.children, { id: 'trash', name: 'trash', children: [] }] };

                return { ...prev, root: rootWithTrash, theoremFolderById: nextMapping };
            });

            setTheoremLibrarySelectedFolderId('trash');
            setTheoremLibraryManagePath(['root', 'trash']);
            setTheoremLibraryExpandedFolderIds((prev) => prev.filter((id) => !subtreeIds.has(id)));
        },
        [collectSubtreeFolderIds, findFolderById, theoremLibraryState.root]
    );

    const theoremsByFolderId = React.useMemo(() => {
        const map = new Map<string, TheoremChipInventoryEntry[]>();
        theoremInventoryOrdered.forEach((theorem) => {
            const folderId = theoremLibraryState.theoremFolderById[theorem.theoremId] ?? 'root';
            const list = map.get(folderId);
            if (list) list.push(theorem);
            else map.set(folderId, [theorem]);
        });
        return map;
    }, [theoremInventoryOrdered, theoremLibraryState.theoremFolderById]);

    const managePathNormalized = React.useMemo(() => {
        const raw = Array.isArray(theoremLibraryManagePath) ? theoremLibraryManagePath : ['root'];
        const base = raw.length > 0 && raw[0] === 'root' ? raw : ['root', ...raw.filter((id) => id !== 'root')];
        const next: string[] = ['root'];
        for (let i = 1; i < base.length; i += 1) {
            const id = base[i];
            const exists = Boolean(findFolderById(theoremLibraryState.root, id));
            if (!exists) break;
            next.push(id);
        }
        return next;
    }, [findFolderById, theoremLibraryManagePath, theoremLibraryState.root]);

    const manageCurrentFolderId = managePathNormalized[managePathNormalized.length - 1] ?? 'root';

    React.useEffect(() => {
        if (!showTheoremLibrary) return;
        const currentFolderId = theoremLibrarySelectedFolderId;
        const path = findPathToFolder(theoremLibraryState.root, currentFolderId, ['root']);
        if (path) setTheoremLibraryManagePath(path);
        else setTheoremLibraryManagePath(['root']);
    }, [findPathToFolder, showTheoremLibrary, theoremLibrarySelectedFolderId, theoremLibraryState.root]);

    React.useEffect(() => {
        if (!showTheoremLibrary) return;
        if (theoremLibraryMode !== 'manage') return;
        if (theoremLibrarySelectedFolderId !== manageCurrentFolderId) {
            setTheoremLibrarySelectedFolderId(manageCurrentFolderId);
        }
    }, [manageCurrentFolderId, showTheoremLibrary, theoremLibraryMode, theoremLibrarySelectedFolderId]);

    const manageFolderColumns = React.useMemo(() => {
        const columns: Array<{ folderId: string; folder: TheoremFolderNode; children: TheoremFolderNode[] }> = [];
        managePathNormalized.forEach((folderId) => {
            const folder = findFolderById(theoremLibraryState.root, folderId);
            if (!folder) return;
            const children = [...folder.children].sort((a, b) => getFolderDisplayName(a).localeCompare(getFolderDisplayName(b)));
            columns.push({ folderId, folder, children });
        });
        return columns;
    }, [findFolderById, getFolderDisplayName, managePathNormalized, theoremLibraryState.root]);

    const managePanelWidthCss = React.useMemo(() => {
        const columnWidthRem = 16;
        const columnGapRem = 0.75;
        const paddingRem = 1.5;
        const count = Math.max(1, manageFolderColumns.length);
        const contentWidth = `calc(${count} * ${columnWidthRem}rem + ${Math.max(0, count - 1)} * ${columnGapRem}rem + ${paddingRem}rem)`;
        return `clamp(20rem, ${contentWidth}, 50vw)`;
    }, [manageFolderColumns.length]);

    const toggleFolderExpanded = React.useCallback((folderId: string) => {
        setTheoremLibraryExpandedFolderIds((prev) =>
            prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
        );
    }, []);

    const renderFolderTree = React.useCallback(
        function renderFolderTreeInner(folder: TheoremFolderNode, depth: number): React.ReactNode {
            const expanded = theoremLibraryExpandedFolderIds.includes(folder.id);
            const selected = theoremLibrarySelectedFolderId === folder.id;
            const folderChildren = [...folder.children].sort((a, b) => a.name.localeCompare(b.name));
            const theorems = theoremsByFolderId.get(folder.id) ?? [];

            return (
                <div key={folder.id}>
                    <div
                        className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-2 transition-colors ${
                            selected
                                ? 'border-cyan-400/60 bg-cyan-500/10'
                                : 'border-slate-800 bg-slate-950/30 hover:border-slate-600 hover:bg-slate-900/60'
                        }`}
                        style={{ marginLeft: depth * 10 }}
                    >
                        <button
                            type="button"
                            onClick={() => toggleFolderExpanded(folder.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-900/50 text-slate-200 hover:border-slate-500"
                            aria-label="Toggle folder"
                        >
                            {expanded ? '−' : '+'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setTheoremLibrarySelectedFolderId(folder.id)}
                            className="min-w-0 flex-1 truncate text-left text-sm font-bold text-slate-100"
                            title={getFolderDisplayName(folder)}
                        >
                            {getFolderDisplayName(folder)}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCreateFolder(folder.id)}
                            className="rounded-md border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs font-bold text-slate-200 hover:border-slate-500"
                        >
                            {t('newFolder')}
                        </button>
                    </div>

                    {expanded && (
                        <div className="mt-2 flex flex-col gap-2">
                            {folderChildren.map((child) => renderFolderTreeInner(child, depth + 1))}
                            {theorems.map((theorem) => {
                                const isSelected = theorem.theoremId === theoremLibrarySelectedId;
                                const isFree = theorem.freeUsesRemaining > 0;
                                const statusLabel = isFree ? t('firstUseFree') : `${t('theoremCost')}: ${theorem.cost}`;
                                return (
                                    <button
                                        key={theorem.theoremId}
                                        type="button"
                                        onClick={() => setTheoremLibrarySelectedId(theorem.theoremId)}
                                        draggable
                                        onDragStart={(e) => {
                                                    setIsDraggingTheoremToToolbar(true);
                                                    setShowTheoremMenu(true);
                                                    handleTheoremSelect(theorem);
                                                    e.dataTransfer.setData('application/x-logicgame-theorem-id', theorem.theoremId);
                                                    e.dataTransfer.setData('text/plain', theorem.theoremId);
                                                    e.dataTransfer.effectAllowed = 'copyMove';
                                                }}
                                        onDragEnd={() => {
                                            setIsDraggingTheoremToToolbar(false);
                                            setTheoremMenuDragOverIndex(null);
                                        }}
                                        className={`w-full cursor-grab active:cursor-grabbing rounded-xl border p-3 text-left transition-colors ${
                                            isSelected
                                                ? 'border-cyan-400/70 bg-cyan-500/10'
                                                : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800/60'
                                        }`}
                                        style={{ marginLeft: (depth + 1) * 10 }}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="font-bold text-slate-100">{theorem.name}</div>
                                            <div className="text-[10px] text-slate-400">{statusLabel}</div>
                                        </div>
                                        <div className="mt-1 text-xs text-slate-400">{theorem.formula}</div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        },
        [
            getFolderDisplayName,
            handleCreateFolder,
            theoremLibraryExpandedFolderIds,
            theoremLibrarySelectedFolderId,
            theoremLibrarySelectedId,
            theoremsByFolderId,
            t,
            toggleFolderExpanded,
        ]
    );

    return (
        <>
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur-xl border border-slate-500/50 px-6 py-4 rounded-2xl flex items-end gap-2 shadow-[0_0_40px_-10px_rgba(0,0,0,0.8)] ${showTheoremLibrary ? 'z-[120]' : 'z-50'} pointer-events-auto ring-1 ring-white/10`}>
            
            {/* Tools Group (Pointer & Box Select & Wire) */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-transparent select-none font-bold uppercase tracking-widest">{t('tools')}</span>
                </div>
                <div className="h-12 flex items-center gap-2">
                    {/* Pointer / Select Tool */}
                    <div 
                        id="tool-select"
                        onClick={() => { onSelectTool(null); onSelectModeChange?.('pointer'); }}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-slate-200 bg-slate-800 border border-slate-600
                                hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 rounded-md
                                ${isPointerActive ? activeClass : ''}`}
                        title="Select / Move"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
                            <path d="M13 13l6 6"></path>
                        </svg>
                    </div>

                    {/* Box Select Tool */}
                    <div 
                        id="tool-box-select"
                        onClick={() => { onSelectTool(null); onSelectModeChange?.('box'); }}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-slate-200 bg-slate-800 border border-slate-600
                                hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 rounded-md
                                ${isBoxSelectActive ? activeClass : ''}`}
                        title="Box Select (Right-click to delete selected)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3">
                            <path d="M4 4h16v16H4z"></path>
                        </svg>
                    </div>

                    <div className="w-px h-8 bg-slate-700"></div>

                    {/* Wire Tool */}
                    <div 
                        id="tool-wire"
                        onClick={() => handleSelect('wire', 'formula', 1, 1)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-slate-200 bg-slate-800 border border-slate-600
                                hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 rounded-md
                                ${activeTool?.type === 'wire' ? activeClass : ''}`}
                        title="Wire Tool (R to rotate, T to toggle type)"
                    >
                        {activeTool?.type === 'wire' && activeTool.subType === 'provable' ? (
                             // Yellow Zigzag
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                             </svg>
                        ) : (
                            // Blue Zigzag (Default or Formula)
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        )}
                    </div>

                    {/* Wire Bridge Tool */}
                    {isUnlocked('bridge') && (
                    <div 
                        id="tool-bridge"
                        onClick={() => handleSelect('bridge', 'bridge', 2, 2)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-slate-200 bg-slate-800 border border-slate-600
                                hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 rounded-md
                                ${activeTool?.type === 'bridge' ? activeClass : ''}`}
                        title="Wire Bridge - Allows wires to cross without merging (R to rotate)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 12h4"></path>
                            <path d="M14 12h4"></path>
                            <path d="M12 6v4"></path>
                            <path d="M12 14v4"></path>
                            <circle cx="12" cy="12" r="3" fill="none"></circle>
                        </svg>
                    </div>
                    )}
                </div>
            </div>

            {theoremInventoryOrdered.length > 0 && (
                <>
                    <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

                    <div className="flex flex-col items-center gap-2">
                        <div className="h-[15px] flex items-center">
                            <span className="text-[10px] text-transparent select-none font-bold uppercase tracking-widest">{t('theoremBar')}</span>
                        </div>
                        <div className="h-12 flex items-center gap-3 relative">
                            <button
                                ref={theoremMenuButtonRef}
                                type="button"
                                onClick={() => setShowTheoremMenu((v) => !v)}
                                className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                        text-cyan-100 bg-slate-800 border border-cyan-500/40
                                        hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 rounded-md
                                        ${showTheoremMenu ? activeClass : ''}`}
                                title={t('theoremBar')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12h7"></path>
                                    <path d="M10 6l6 6-6 6"></path>
                                    <path d="M16 6h5v12h-5"></path>
                                </svg>
                            </button>

                            {showTheoremMenu && (
                                <div
                                    ref={theoremMenuRef}
                                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[22rem] max-w-[92vw] rounded-2xl border border-slate-600 bg-slate-900/95 p-3 shadow-2xl ring-1 ring-white/10"
                                >
                                    <div className="grid grid-cols-4 gap-2">
                                        {normalizedPinnedTheoremIds.map((theoremId, idx) => {
                                            const theorem = theoremId
                                                ? theoremInventoryOrdered.find((item) => item.theoremId === theoremId) ?? null
                                                : null;
                                            const affordable = theorem ? canAffordTheorem(theorem) : false;
                                            const disabled = !theorem || !affordable;
                                            const isDragOver = theoremMenuDragOverIndex === idx;
                                            return (
                                                <button
                                                    key={`${idx}-${theoremId ?? 'empty'}`}
                                                    type="button"
                                                    onClick={() => {
                                                        if (!theorem) return;
                                                        handleTheoremSelect(theorem);
                                                        setShowTheoremMenu(false);
                                                        setShowTheoremLibrary(false);
                                                    }}
                                                    disabled={disabled}
                                                    onDragEnter={() => setTheoremMenuDragOverIndex(idx)}
                                                    onDragLeave={() => setTheoremMenuDragOverIndex((prev) => (prev === idx ? null : prev))}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'copy';
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        const dropped =
                                                            e.dataTransfer.getData('application/x-logicgame-theorem-id') ||
                                                            e.dataTransfer.getData('text/plain');
                                                        if (dropped && availableTheoremIdSet.has(dropped)) {
                                                            handleReplacePinnedTheorem(idx, dropped);
                                                        }
                                                setIsDraggingTheoremToToolbar(false);
                                                        setTheoremMenuDragOverIndex(null);
                                                    }}
                                                    className={`h-12 rounded-xl border px-2 text-left transition-colors ${
                                                        isDragOver
                                                            ? 'border-cyan-400/80 bg-cyan-500/10'
                                                            : theorem
                                                                ? 'border-slate-700 bg-slate-950/30 hover:border-slate-500 hover:bg-slate-800/60'
                                                                : 'border-slate-800 bg-slate-950/20 text-slate-600'
                                                    } ${theoremId && isTheoremActive(theoremId) ? activeClass : ''} ${disabled && theorem ? 'opacity-60' : ''}`}
                                                    title={theorem ? `${theorem.name} ${theorem.formula}` : ''}
                                                >
                                                    <div className="truncate text-xs font-bold text-slate-100">{theorem ? theorem.name : '-'}</div>
                                                    {theorem && (
                                                        <div className="mt-0.5 truncate text-[10px] text-slate-400">
                                                            {theorem.freeUsesRemaining > 0 ? t('firstUseFree') : `${t('theoremCost')}: ${theorem.cost}`}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowTheoremLibrary(true)}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-2 text-sm font-bold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800/60"
                                        >
                                            {t('theoremLibrary')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

            {/* ATOMS Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">{t('atoms')}</span>
                </div>
                <div className="h-12 flex items-center gap-3 relative">
                    {/* Atom P */}
                    {isUnlocked('atom', 'P') && (
                    <div 
                        id="tool-atom-P"
                        onClick={() => handleSelect('atom', 'P', 4, 4)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#00d0ff] border border-[#00d0ff] bg-linear-to-br from-[#0a1a2a] to-[#151520] 
                                shadow-[0_0_10px_rgba(0,208,255,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,208,255,0.4)] hover:scale-110 active:scale-95 rounded-md font-bold
                                ${isActive('P') ? activeClass : ''}`}
                        title="Atom P"
                    >
                        P
                    </div>
                    )}

                    {/* Atom Q */}
                    {isUnlocked('atom', 'Q') && (
                    <div 
                        id="tool-atom-Q"
                        onClick={() => handleSelect('atom', 'Q', 4, 4)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#d000ff] border border-[#d000ff] bg-linear-to-br from-[#1a0a2a] to-[#201525] 
                                shadow-[0_0_10px_rgba(208,0,255,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(208,0,255,0.4)] hover:scale-110 active:scale-95 rounded-md font-bold
                                ${isActive('Q') ? activeClass : ''}`}
                        title="Atom Q"
                    >
                        Q
                    </div>
                    )}

                    {/* Atom R */}
                    {isUnlocked('atom', 'R') && (
                    <div 
                        onClick={() => handleSelect('atom', 'R', 4, 4)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#ffaa00] border border-[#ffaa00] bg-linear-to-br from-[#2a1a0a] to-[#252015] 
                                shadow-[0_0_10px_rgba(255,170,0,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(255,170,0,0.4)] hover:scale-110 active:scale-95 rounded-md font-bold
                                ${isActive('R') ? activeClass : ''}`}
                        title="Atom R"
                    >
                        R
                    </div>
                    )}

                    {(isUnlocked('atom', 'S') || isUnlocked('atom', 'T')) && (
                        <>
                            <button
                                ref={moreAtomsButtonRef}
                                type="button"
                                onClick={() => setShowMoreAtomsMenu((v) => !v)}
                                className={`h-12 rounded-md border border-slate-600 bg-slate-800 px-3 text-xs font-bold text-slate-200 transition-all duration-200 hover:-translate-y-1 hover:bg-slate-700 hover:scale-110 active:scale-95 ${
                                    showMoreAtomsMenu ? activeClass : ''
                                }`}
                                title={t('more')}
                            >
                                {t('more')}
                            </button>

                            {showMoreAtomsMenu && (
                                <div
                                    ref={moreAtomsMenuRef}
                                    className="absolute bottom-full mb-3 right-0 w-44 rounded-2xl border border-slate-600 bg-slate-900/95 p-3 shadow-2xl ring-1 ring-white/10"
                                >
                                    <div className="flex flex-col gap-2">
                                        {isUnlocked('atom', 'S') && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleSelect('atom', 'S', 4, 4);
                                                    setShowMoreAtomsMenu(false);
                                                }}
                                                className={`h-12 rounded-xl border border-slate-700 bg-slate-950/30 px-3 text-left font-bold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800/60 ${
                                                    isActive('S') ? activeClass : ''
                                                }`}
                                                title="Atom S"
                                            >
                                                <span className="text-[#f97316]">S</span>
                                            </button>
                                        )}
                                        {isUnlocked('atom', 'T') && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleSelect('atom', 'T', 4, 4);
                                                    setShowMoreAtomsMenu(false);
                                                }}
                                                className={`h-12 rounded-xl border border-slate-700 bg-slate-950/30 px-3 text-left font-bold text-slate-100 transition-colors hover:border-slate-500 hover:bg-slate-800/60 ${
                                                    isActive('T') ? activeClass : ''
                                                }`}
                                                title="Atom T"
                                            >
                                                <span className="text-[#22c55e]">T</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

            {/* GATES Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">{t('gates')}</span>
                </div>
                <div className="h-12 flex items-center gap-3">
                    {/* Implies */}
                    {isUnlocked('gate', 'implies') && (
                    <div 
                        id="tool-gate-implies"
                        onClick={() => handleSelect('gate', 'implies', 4, 4)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#ff0055] border border-[#ff0055] bg-[#1a1a1a] 
                                shadow-[0_0_8px_rgba(255,0,85,0.3)] hover:-translate-y-1 hover:shadow-[0_0_12px_rgba(255,0,85,0.5)] hover:scale-110 active:scale-95
                                rounded-[4px_24px_24px_4px] text-xl font-bold
                                ${isActive('implies') ? activeClass : ''}`}
                        title="Implies (→)"
                    >
                        →
                    </div>
                    )}

                    {/* Not */}
                    {isUnlocked('gate', 'not') && (
                    <div 
                        id="tool-gate-not"
                        onClick={() => handleSelect('gate', 'not', 4, 4)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#ff4400] bg-[rgba(255,68,0,0.1)] 
                                hover:-translate-y-1 hover:scale-110 active:scale-95
                                ${isActive('not') ? activeClass : ''}`}
                        style={{
                            clipPath: 'polygon(0% 0%, 100% 50%, 0% 100%)',
                            borderLeft: '2px solid #ff4400'
                        }}
                        title="Not (¬)"
                    >
                        <span className="ml-1 font-bold text-lg">¬</span>
                    </div>
                    )}
                </div>
            </div>

            <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

            {/* AXIOMS Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">{t('axioms')}</span>
                </div>
                <div className="h-12 flex items-center gap-3">
                    {/* Axiom 1 */}
                    {isUnlocked('axiom', '1') && (
                    <div 
                        onClick={() => handleSelect('axiom', '1', 4, 4)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#00ffaa] border-4 border-double border-[#00ffaa] bg-[#0a1a15] 
                                shadow-[0_0_10px_rgba(0,255,170,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,255,170,0.4)] hover:scale-110 active:scale-95
                                rounded-lg font-serif italic
                                ${isActive('1') ? activeClass : ''}`}
                        title="A → (B → A)"
                    >
                        I
                    </div>
                    )}

                    {/* Axiom 2 */}
                    {isUnlocked('axiom', '2') && (
                    <div 
                        onClick={() => handleSelect('axiom', '2', 4, 6)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#00ffaa] border-4 border-double border-[#00ffaa] bg-[#0a1a15] 
                                shadow-[0_0_10px_rgba(0,255,170,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,255,170,0.4)] hover:scale-110 active:scale-95
                                rounded-lg font-serif italic
                                ${isActive('2') ? activeClass : ''}`}
                        title="(A→(B→C)) → ((A→B)→(A→C))"
                    >
                        II
                    </div>
                    )}

                    {/* Axiom 3 */}
                    {isUnlocked('axiom', '3') && (
                    <div 
                        onClick={() => handleSelect('axiom', '3', 4, 4)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#00ffaa] border-4 border-double border-[#00ffaa] bg-[#0a1a15] 
                                shadow-[0_0_10px_rgba(0,255,170,0.2)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,255,170,0.4)] hover:scale-110 active:scale-95
                                rounded-lg font-serif italic
                                ${isActive('3') ? activeClass : ''}`}
                        title="(¬A → ¬B) → (B → A)"
                    >
                        III
                    </div>
                    )}
                </div>
            </div>

            <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

            {/* RULES Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">{t('rules')}</span>
                </div>
                <div className="h-12 flex items-center gap-3">
                    {/* MP Rule */}
                    {isUnlocked('mp') && (
                    <div 
                        onClick={() => handleSelect('mp', 'mp', 6, 6)}
                        className={`w-12 h-12 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#ffff00] bg-[#1a1a00] 
                                shadow-[0_0_15px_rgba(255,255,0,0.3)] hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,0,0.5)] hover:scale-110 active:scale-95
                                font-bold text-xs
                                ${isActive('mp') ? activeClass : ''}`}
                        style={{
                            clipPath: 'polygon(0% 0%, 60% 0%, 100% 50%, 60% 100%, 0% 100%)'
                        }}
                        title="Modus Ponens"
                    >
                        MP
                    </div>
                    )}
                </div>
            </div>

            <div className="w-px h-8 bg-slate-700 mb-2 mx-2"></div>

            {/* DISPLAY Section */}
            <div className="flex flex-col items-center gap-2">
                <div className="h-[15px] flex items-center">
                    <span className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">{t('display')}</span>
                </div>
                <div className="h-12 flex items-center gap-3">
                    {/* Small Display */}
                    {isUnlocked('display', 'small') && (
                    <div 
                        id="tool-display-small"
                        onClick={() => handleSelect('display', 'small', 4, 4)}
                        className={`w-10 h-10 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#6366f1] border-2 border-[#6366f1] bg-[#1a1a2e] 
                                shadow-[0_0_10px_rgba(99,102,241,0.3)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:scale-110 active:scale-95
                                rounded-lg
                                ${isActive('small') ? activeClass : ''}`}
                        title="Small Display (4x4)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                        </svg>
                    </div>
                    )}

                    {/* Large Display */}
                    {isUnlocked('display', 'large') && (
                    <div 
                        id="tool-display-large"
                        onClick={() => handleSelect('display', 'large', 8, 8)}
                        className={`w-14 h-14 flex justify-center items-center cursor-pointer transition-all duration-200 select-none relative
                                text-[#6366f1] border-2 border-[#6366f1] bg-[#1a1a2e] 
                                shadow-[0_0_10px_rgba(99,102,241,0.3)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:scale-110 active:scale-95
                                rounded-lg
                                ${isActive('large') ? activeClass : ''}`}
                        title="Large Display (8x8)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                    </div>
                    )}
                </div>
            </div>
        </div>
        {showTheoremLibrary && theoremInventoryOrdered.length > 0 && (
            <div className="fixed inset-0 z-[90] bg-slate-950/95 text-white backdrop-blur-sm">
                <div className="absolute top-4 left-4">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300">{t('theoremBar')}</div>
                    <div className="text-2xl font-bold">{t('theoremLibrary')}</div>
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setTheoremLibraryMode((prev) => (prev === 'browse' ? 'manage' : 'browse'));
                            if (theoremLibraryMode === 'browse') {
                                const path = findPathToFolder(theoremLibraryState.root, theoremLibrarySelectedFolderId, ['root']);
                                setTheoremLibraryManagePath(path ?? ['root']);
                            } else {
                                setTheoremLibrarySelectedFolderId(manageCurrentFolderId);
                            }
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-bold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                    >
                        {theoremLibraryMode === 'browse' ? t('manageMode') : t('browseMode')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowTheoremLibrary(false)}
                        className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-bold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                    >
                        {t('returnToGame')}
                    </button>
                </div>

                <div className="h-full w-full px-6 pb-6 pt-20">
                    <div className="flex h-full gap-4">
                        {theoremLibraryMode === 'browse' ? (
                            <div className="w-72 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
                                <div className="flex items-center justify-between gap-3 border-b border-slate-700 p-3">
                                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                        {t('theoremLibrary')}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCreateFolder(theoremLibrarySelectedFolderId)}
                                        className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1 text-xs font-bold text-slate-200 hover:border-slate-500"
                                    >
                                        {t('newFolder')}
                                    </button>
                                </div>
                                <div className="max-h-full overflow-y-auto p-3">
                                    <div className="flex flex-col gap-2">
                                        {renderFolderTree(theoremLibraryState.root, 0)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="shrink-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60"
                                style={{ width: managePanelWidthCss }}
                            >
                                <div className="flex h-full flex-col">
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-700 p-3">
                                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                            {t('manageMode')}
                                        </div>
                                        <div className="text-xs text-slate-500">{t('dragHint')}</div>
                                    </div>
                                    <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
                                        {managePathNormalized.map((folderId, idx) => {
                                            const folder = findFolderById(theoremLibraryState.root, folderId) ?? theoremLibraryState.root;
                                            return (
                                                <React.Fragment key={`${folderId}-${idx}`}>
                                                    {idx > 0 && <span className="text-xs text-slate-600">›</span>}
                                                    <button
                                                        type="button"
                                                        onClick={() => setTheoremLibraryManagePath(managePathNormalized.slice(0, idx + 1))}
                                                        className={`rounded-lg border px-2 py-1 text-xs font-bold transition-colors ${
                                                            idx === managePathNormalized.length - 1
                                                                ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100'
                                                                : 'border-slate-700 bg-slate-900/40 text-slate-200 hover:border-slate-500 hover:text-white'
                                                        }`}
                                                    >
                                                        {getFolderDisplayName(folder)}
                                                    </button>
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-x-auto">
                                        <div className="flex h-full gap-3 p-3">
                                            {manageFolderColumns.map((col, colIdx) => (
                                                <div
                                                    key={col.folderId}
                                                    className="w-64 shrink-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/30"
                                                    onDragEnter={() => setManageFolderDragOverId(col.folderId)}
                                                    onDragLeave={() => setManageFolderDragOverId((prev) => (prev === col.folderId ? null : prev))}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        const theoremId =
                                                            e.dataTransfer.getData('application/x-logicgame-theorem-id') ||
                                                            e.dataTransfer.getData('text/plain');
                                                        const folderId = e.dataTransfer.getData('application/x-logicgame-folder-id');
                                                        if (theoremId && availableTheoremIdSet.has(theoremId)) {
                                                            setTheoremFolder(theoremId, col.folderId);
                                                        } else if (folderId) {
                                                            moveFolder(folderId, col.folderId);
                                                        }
                                                        setManageFolderDragOverId(null);
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 p-3">
                                                        <div className="min-w-0 truncate text-sm font-bold text-slate-100" title={getFolderDisplayName(col.folder)}>
                                                            {getFolderDisplayName(col.folder)}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCreateFolder(col.folderId)}
                                                                className="rounded-md border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs font-bold text-slate-200 hover:border-slate-500"
                                                            >
                                                                {t('newFolder')}
                                                            </button>
                                                            {col.folderId !== 'root' && col.folderId !== 'trash' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeleteFolderCandidateId(col.folderId)}
                                                                    className="rounded-md border border-slate-700 bg-slate-900/50 px-2 py-1 text-xs font-bold text-rose-200 hover:border-rose-400/50"
                                                                >
                                                                    {t('delete')}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="max-h-full overflow-y-auto p-2">
                                                        <div className="flex flex-col gap-2">
                                                            {col.children.map((child) => {
                                                                const selected = managePathNormalized[colIdx + 1] === child.id;
                                                                const dragOver = manageFolderDragOverId === child.id;
                                                                const canDelete = child.id !== 'trash';
                                                                return (
                                                                    <div key={child.id} className="flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setTheoremLibraryManagePath([...managePathNormalized.slice(0, colIdx + 1), child.id]);
                                                                            }}
                                                                            draggable={child.id !== 'trash'}
                                                                            onDragStart={(e) => {
                                                                                if (child.id === 'trash') return;
                                                                                e.dataTransfer.setData('application/x-logicgame-folder-id', child.id);
                                                                                e.dataTransfer.effectAllowed = 'move';
                                                                            }}
                                                                            onDragEnter={() => setManageFolderDragOverId(child.id)}
                                                                            onDragLeave={() => setManageFolderDragOverId((prev) => (prev === child.id ? null : prev))}
                                                                            onDragOver={(e) => {
                                                                                e.preventDefault();
                                                                                e.dataTransfer.dropEffect = 'move';
                                                                            }}
                                                                            onDrop={(e) => {
                                                                                e.preventDefault();
                                                                                const theoremId =
                                                                                    e.dataTransfer.getData('application/x-logicgame-theorem-id') ||
                                                                                    e.dataTransfer.getData('text/plain');
                                                                                const folderId = e.dataTransfer.getData('application/x-logicgame-folder-id');
                                                                                if (theoremId && availableTheoremIdSet.has(theoremId)) {
                                                                                    setTheoremFolder(theoremId, child.id);
                                                                                } else if (folderId) {
                                                                                    moveFolder(folderId, child.id);
                                                                                }
                                                                                setManageFolderDragOverId(null);
                                                                            }}
                                                                            className={`min-w-0 flex-1 truncate rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors ${
                                                                                dragOver
                                                                                    ? 'border-cyan-400/80 bg-cyan-500/10'
                                                                                    : selected
                                                                                        ? 'border-cyan-400/60 bg-cyan-500/10'
                                                                                        : 'border-slate-800 bg-slate-950/20 hover:border-slate-600 hover:bg-slate-900/60'
                                                                            }`}
                                                                            title={getFolderDisplayName(child)}
                                                                        >
                                                                            {getFolderDisplayName(child)}
                                                                        </button>
                                                                        {canDelete && child.id !== 'root' && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setDeleteFolderCandidateId(child.id)}
                                                                                className="shrink-0 rounded-lg border border-slate-800 bg-slate-950/20 px-2 py-2 text-xs font-bold text-rose-200 hover:border-rose-400/50"
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {(theoremsByFolderId.get(col.folderId) ?? [])
                                                                .slice()
                                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                                .map((theorem) => {
                                                                    const isSelected = theorem.theoremId === theoremLibrarySelectedId;
                                                                    const isFree = theorem.freeUsesRemaining > 0;
                                                                    const statusLabel = isFree ? t('firstUseFree') : `${t('theoremCost')}: ${theorem.cost}`;
                                                                    return (
                                                                        <button
                                                                            key={`${col.folderId}-${theorem.theoremId}`}
                                                                            type="button"
                                                                            onClick={() => setTheoremLibrarySelectedId(theorem.theoremId)}
                                                                            draggable
                                                                            onDragStart={(e) => {
                                                                                setIsDraggingTheoremToToolbar(true);
                                                                                setShowTheoremMenu(true);
                                                                                // Always set active tool immediately when dragging starts!
                                                                                handleTheoremSelect(theorem);
                                                                                e.dataTransfer.setData('application/x-logicgame-theorem-id', theorem.theoremId);
                                                                                e.dataTransfer.setData('text/plain', theorem.theoremId);
                                                                                e.dataTransfer.effectAllowed = 'copyMove';
                                                                            }}
                                                                            onDragEnd={() => {
                                                                                setIsDraggingTheoremToToolbar(false);
                                                                                setTheoremMenuDragOverIndex(null);
                                                                            }}
                                                                            onDragOver={(e) => {
                                                                                e.preventDefault();
                                                                                e.dataTransfer.dropEffect = 'move';
                                                                            }}
                                                                            onDrop={(e) => {
                                                                                e.preventDefault();
                                                                                const theoremId =
                                                                                    e.dataTransfer.getData('application/x-logicgame-theorem-id') ||
                                                                                    e.dataTransfer.getData('text/plain');
                                                                                const folderId = e.dataTransfer.getData('application/x-logicgame-folder-id');
                                                                                if (theoremId && availableTheoremIdSet.has(theoremId)) {
                                                                                    setTheoremFolder(theoremId, col.folderId);
                                                                                } else if (folderId) {
                                                                                    moveFolder(folderId, col.folderId);
                                                                                }
                                                                                setManageFolderDragOverId(null);
                                                                            }}
                                                                            className={`w-full cursor-grab active:cursor-grabbing rounded-xl border p-3 text-left transition-colors ${
                                                                                isSelected
                                                                                    ? 'border-cyan-400/70 bg-cyan-500/10'
                                                                                    : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800/60'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <div className="font-bold text-slate-100">{theorem.name}</div>
                                                                                <div className="text-[10px] text-slate-400">{statusLabel}</div>
                                                                            </div>
                                                                            <div className="mt-1 text-xs text-slate-400">{theorem.formula}</div>
                                                                        </button>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
                            {selectedTheorem && selectedTheoremDetails ? (
                                <div className="flex h-full flex-col">
                                    <div className="flex items-start justify-between gap-4 border-b border-slate-700 p-4">
                                        <div className="min-w-0">
                                            <div className="text-xl font-bold text-white">{selectedTheorem.name}</div>
                                            <div className="mt-1 break-words text-sm text-slate-300">{selectedTheorem.formula}</div>
                                            {theoremLibraryMode === 'browse' && (
                                                <div className="mt-3 flex items-center gap-3">
                                                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                                        {t('moveToFolder')}
                                                    </div>
                                                    <select
                                                        value={selectedTheoremFolderId}
                                                        onChange={(e) => setTheoremFolder(selectedTheorem.theoremId, e.target.value)}
                                                        className="min-w-0 max-w-[18rem] flex-1 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                                                    >
                                                        {folderOptions.map((folder) => (
                                                            <option key={folder.id} value={folder.id}>
                                                                {`${'  '.repeat(folder.depth)}${folder.id === 'root' ? t('rootFolder') : folder.id === 'trash' ? t('trash') : folder.name}`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                                                <span>
                                                    {t('freeUsesRemaining')}: {selectedTheorem.freeUsesRemaining}
                                                </span>
                                                <span>
                                                    {t('theoremCost')}: {selectedTheorem.cost}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleTheoremSelect(selectedTheorem);
                                                setShowTheoremLibrary(false);
                                            }}
                                            disabled={!canAffordTheorem(selectedTheorem)}
                                            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                                                canAffordTheorem(selectedTheorem)
                                                    ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                                                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
                                            }`}
                                        >
                                            {t('selectTheoremChip')}
                                        </button>
                                    </div>

                                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                                                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('theoremInputs')}</div>
                                                <div className="mt-3">
                                                    <div className="text-xs font-bold text-slate-300">{t('theoremVariables')}</div>
                                                    {selectedTheoremDetails.vars.length === 0 ? (
                                                        <div className="mt-2 text-sm text-slate-500">-</div>
                                                    ) : (
                                                        <div className="mt-2 flex flex-col gap-2">
                                                            {selectedTheoremDetails.vars.map((v) => (
                                                                <div key={v} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200">
                                                                    <span className="text-slate-400">var_{v}</span> <span className="text-slate-500">→</span> <span className="text-sky-300">{v}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4">
                                                    <div className="text-xs font-bold text-slate-300">{t('theoremPremises')}</div>
                                                    {selectedTheoremDetails.premises.length === 0 ? (
                                                        <div className="mt-2 text-sm text-slate-500">-</div>
                                                    ) : (
                                                        <div className="mt-2 flex flex-col gap-2">
                                                            {selectedTheoremDetails.premises.map((p, idx) => (
                                                                <div key={`${idx}-${p}`} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200">
                                                                    <span className="text-slate-400">prem_{idx}</span>{' '}
                                                                    <span className="text-slate-500">→</span>{' '}
                                                                    <span className="text-amber-300">⊢ {normalizeTheoremFormula(p)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                                                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('theoremOutputs')}</div>
                                                <div className="mt-3 flex flex-col gap-3">
                                                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3 text-sm text-slate-200">
                                                        <div className="text-xs text-slate-400">out</div>
                                                        <div className="mt-1 font-bold text-emerald-300">
                                                            {!selectedTheorem.formula?.trim().startsWith('|-') && !selectedTheorem.formula?.trim().startsWith('⊢') 
                                                                ? selectedTheoremDetails.conclusion 
                                                                : `⊢ ${selectedTheoremDetails.conclusion}`}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3 text-sm text-slate-400">
                                                        <div className="text-xs font-bold uppercase tracking-widest">{t('theoremPremises')}</div>
                                                        <div className="mt-2 text-sm text-slate-300">
                                                            {selectedTheoremDetails.premises.length > 0
                                                                ? selectedTheoremDetails.premises.map((p) => `⊢ ${normalizeTheoremFormula(p)}`).join(', ')
                                                                : '-'}
                                                        </div>
                                                        <div className="mt-2 text-xs text-slate-500">{t('theoremVariables')}: {selectedTheoremDetails.vars.length > 0 ? selectedTheoremDetails.vars.join(', ') : '-'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center text-slate-400">{t('noTheoremsCollected')}</div>
                            )}
                        </div>
                    </div>
                </div>
                {isCreateFolderOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="w-[28rem] max-w-[92vw] rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300">{t('theoremLibrary')}</div>
                                    <div className="text-xl font-bold text-white">{t('newFolder')}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateFolderOpen(false)}
                                    className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                                >
                                    {t('cancel')}
                                </button>
                            </div>

                            <div className="mt-5">
                                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('folderName')}</div>
                                <input
                                    ref={createFolderInputRef}
                                    value={createFolderName}
                                    onChange={(e) => setCreateFolderName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addFolder(createFolderParentId, createFolderName);
                                            setIsCreateFolderOpen(false);
                                        } else if (e.key === 'Escape') {
                                            setIsCreateFolderOpen(false);
                                        }
                                    }}
                                    placeholder={t('folderNamePlaceholder')}
                                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-400/60"
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateFolderOpen(false)}
                                    className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-bold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        addFolder(createFolderParentId, createFolderName);
                                        setIsCreateFolderOpen(false);
                                    }}
                                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-cyan-500"
                                >
                                    {t('create')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {deleteFolderCandidateId != null && (
                    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="w-[32rem] max-w-[92vw] rounded-2xl border border-rose-500/30 bg-slate-900/95 p-6 shadow-2xl">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.25em] text-rose-300">{t('manageMode')}</div>
                                    <div className="text-xl font-bold text-white">{t('deleteFolder')}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDeleteFolderCandidateId(null)}
                                    className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                                >
                                    {t('cancel')}
                                </button>
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-200">
                                {t('deleteFolderConfirm')}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                                {t('deleteFolderMoveToTrash')}
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteFolderCandidateId(null)}
                                    className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-bold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        deleteFolder(deleteFolderCandidateId);
                                        setDeleteFolderCandidateId(null);
                                    }}
                                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-500"
                                >
                                    {t('delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
        </>
    );
}
