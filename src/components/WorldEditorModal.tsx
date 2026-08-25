import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  FileCode,
  HelpCircle,
  Layers,
  MapPin,
  Package,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Share2,
  Shield,
  Skull,
  Trash2,
  Upload,
  X,
  Zap
} from 'lucide-react';
import QRCode from 'qrcode';
import React, { useEffect, useRef, useState } from 'react';
import {
  decodeWorldData,
  exportWorldAsJsonFile,
  generateWorldShareUrl,
  parseWorldFromJson
} from '../storage';
import {
  CustomWorldData,
  GameStep,
  RPGItem,
  RPGJob,
  RPGLocation,
  RPGMonster
} from '../types';

interface WorldEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldData: CustomWorldData;
  onSaveWorld: (world: CustomWorldData) => void;
  onResetToDefault: () => void;
  initialTab?: 'share' | 'map' | 'monsters' | 'jobs' | 'items' | 'quizzes';
}

type EditorTab = 'share' | 'map' | 'monsters' | 'jobs' | 'items' | 'quizzes';

export const WorldEditorModal: React.FC<WorldEditorModalProps> = ({
  isOpen,
  onClose,
  worldData,
  onSaveWorld,
  onResetToDefault,
  initialTab = 'share'
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab);
  const [world, setWorld] = useState<CustomWorldData>(() => JSON.parse(JSON.stringify(worldData)));
  
  // Selection states for sub-editors
  const [selectedLocId, setSelectedLocId] = useState<string>('');
  const [selectedMonsterId, setSelectedMonsterId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedQuizIdx, setSelectedQuizIdx] = useState<number>(0);

  // Status & Feedback
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copySuccessMsg, setCopySuccessMsg] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize when opening
  useEffect(() => {
    if (isOpen) {
      const cloned = JSON.parse(JSON.stringify(worldData)) as CustomWorldData;
      setWorld(cloned);
      setSaveSuccessMsg(null);
      setCopySuccessMsg(false);
      setActiveTab(initialTab);

      const locKeys = Object.keys(cloned.locations || {});
      if (locKeys.length > 0) setSelectedLocId(locKeys[0]);

      const monsterKeys = Object.keys(cloned.monsters || {});
      if (monsterKeys.length > 0) setSelectedMonsterId(monsterKeys[0]);

      const jobKeys = Object.keys(cloned.jobs || {});
      if (jobKeys.length > 0) setSelectedJobId(jobKeys[0]);

      const itemKeys = Object.keys(cloned.items || {});
      if (itemKeys.length > 0) setSelectedItemId(itemKeys[0]);

      setSelectedQuizIdx(0);
    }
  }, [isOpen, worldData, initialTab]);

  // Update Share URL & QR Code whenever world changes
  useEffect(() => {
    if (!isOpen) return;
    try {
      const url = generateWorldShareUrl(world);
      setShareUrl(url);

      if (qrCanvasRef.current) {
        QRCode.toCanvas(qrCanvasRef.current, url, {
          width: 240,
          margin: 1.5,
          color: {
            dark: '#00ff66',
            light: '#07120a'
          }
        }, (err) => {
          if (err) console.error('QR rendering error:', err);
        });
      }
    } catch (e) {
      console.error('Failed to generate QR or share URL:', e);
    }
  }, [isOpen, world, activeTab]);

  if (!isOpen) return null;

  // ----------------------------------------------------------------
  // Handlers: Save & Share
  // ----------------------------------------------------------------
  const handleSaveAndApply = () => {
    onSaveWorld(world);
    setSaveSuccessMsg('✔ 맞춤 월드 데이터(맵/몬스터/직업/퀴즈/아이템)가 즉시 저장 및 적용되었습니다!');
    setTimeout(() => {
      setSaveSuccessMsg(null);
      onClose();
    }, 900);
  };

  const handleCopyLink = async () => {
    try {
      const url = generateWorldShareUrl(world);
      await navigator.clipboard.writeText(url);
      setCopySuccessMsg(true);
      setTimeout(() => setCopySuccessMsg(false), 2500);
    } catch (err) {
      prompt('공유 링크를 복사하세요:', generateWorldShareUrl(world));
    }
  };

  const handleExportJson = () => {
    exportWorldAsJsonFile(world);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = parseWorldFromJson(content);
      if (imported) {
        setWorld(imported);
        alert(`✔ '${imported.title}' 월드 데이터를 성공적으로 불러왔습니다!`);
      } else {
        alert('⚠️ 올바르지 않은 던전 월드 JSON 파일 형식입니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetWorld = () => {
    if (confirm('모든 맵, 몬스터, 직업, 아이템, 퀴즈를 교과서 기본 데이터로 초기화하시겠습니까?')) {
      onResetToDefault();
      onClose();
    }
  };

  // ----------------------------------------------------------------
  // Location (Map) Handlers
  // ----------------------------------------------------------------
  const currentLocation = world.locations[selectedLocId] || Object.values(world.locations)[0];

  const handleLocationChange = (field: keyof RPGLocation, val: any) => {
    if (!currentLocation) return;
    setWorld(prev => ({
      ...prev,
      locations: {
        ...prev.locations,
        [currentLocation.id]: {
          ...prev.locations[currentLocation.id],
          [field]: val
        }
      }
    }));
  };

  const handleExitChange = (direction: '동' | '서' | '남' | '북', targetId: string) => {
    if (!currentLocation) return;
    const currentExits = { ...(currentLocation.exits || {}) };
    if (!targetId || targetId === 'none') {
      delete currentExits[direction];
    } else {
      currentExits[direction] = targetId;
    }
    handleLocationChange('exits', currentExits);
  };

  const handleAddLocation = () => {
    const newId = `loc_custom_${Date.now().toString().slice(-4)}`;
    const newLoc: RPGLocation = {
      id: newId,
      name: '새로운 던전 구역 (New Sector)',
      description: '새롭게 추가된 데이터 연구소의 미개척 통로입니다.',
      asciiArt: [
        '        ┌─────────────────────────┐',
        '        │   [ 새로운 던전 구역 ]  │',
        '        │     탐색 가능 구역      │',
        '        └─────────────────────────┘'
      ],
      exits: {},
      isSanctuary: false,
      clue: '단서: 주변을 면밀히 탐색하여 요괴의 취약점을 파악하세요.'
    };
    setWorld(prev => ({
      ...prev,
      locations: { ...prev.locations, [newId]: newLoc }
    }));
    setSelectedLocId(newId);
  };

  const handleDeleteLocation = (locId: string) => {
    if (Object.keys(world.locations).length <= 1) {
      alert('⚠️ 최소 1개 이상의 던전 맵 구역이 존재해야 합니다.');
      return;
    }
    if (confirm(`'${world.locations[locId]?.name}' 구역을 삭제하시겠습니까?`)) {
      setWorld(prev => {
        const copy = { ...prev.locations };
        delete copy[locId];
        // Clean up references in exits
        Object.keys(copy).forEach(k => {
          if (copy[k].exits) {
            Object.keys(copy[k].exits).forEach(dir => {
              if (copy[k].exits[dir as '동' | '서' | '남' | '북'] === locId) {
                delete copy[k].exits[dir as '동' | '서' | '남' | '북'];
              }
            });
          }
        });
        return { ...prev, locations: copy };
      });
      const remaining = Object.keys(world.locations).filter(k => k !== locId);
      if (remaining.length > 0) setSelectedLocId(remaining[0]);
    }
  };

  // ----------------------------------------------------------------
  // Monster Handlers
  // ----------------------------------------------------------------
  const currentMonster = world.monsters[selectedMonsterId] || Object.values(world.monsters)[0];

  const handleMonsterChange = (field: keyof RPGMonster, val: any) => {
    if (!currentMonster) return;
    setWorld(prev => ({
      ...prev,
      monsters: {
        ...prev.monsters,
        [currentMonster.id]: {
          ...prev.monsters[currentMonster.id],
          [field]: val
        }
      }
    }));
  };

  const handleMonsterChoiceChange = (choiceIdx: number, field: string, val: any) => {
    if (!currentMonster) return;
    const choices = [...(currentMonster.choices || [])];
    if (choices[choiceIdx]) {
      choices[choiceIdx] = { ...choices[choiceIdx], [field]: val };
      handleMonsterChange('choices', choices);
    }
  };

  const handleSetMonsterCorrectChoice = (choiceIdx: number) => {
    if (!currentMonster) return;
    const choices = (currentMonster.choices || []).map((c, i) => ({
      ...c,
      isCorrect: i === choiceIdx
    }));
    handleMonsterChange('choices', choices);
  };

  const handleAddMonster = () => {
    const newId = `m_custom_${Date.now().toString().slice(-4)}`;
    const newMon: RPGMonster = {
      id: newId,
      name: '새로운 데이터 요괴 (New Monster)',
      title: '[던전의 침입자] 새로운 오개념 요괴',
      hp: 50,
      maxHp: 50,
      attack: 18,
      expReward: 40,
      itemReward: '연속 스펙트럼 물약',
      asciiArt: [
        '      ░▒▓ [새로운 데이터 요괴] ▓▒░',
        '      ( >_< )  "데이터를 왜곡하겠다!"',
        '     /|  █  |\\  [시험 문제 출제]'
      ],
      dialogue: '"인간 수사관이여! 내 시험을 통과할 수 있겠느냐!"',
      questionId: `Q_CUSTOM_${Date.now().toString().slice(-4)}`,
      questionText: '【새로운 요괴의 시험】 다음 중 올바른 설명은?',
      choices: [
        { key: '1', text: '오답 보기 1번', isCorrect: false, explanation: '틀렸습니다.' },
        { key: '2', text: '정답 보기 2번', isCorrect: true, explanation: '정답입니다! 훌륭합니다.' },
        { key: '3', text: '오답 보기 3번', isCorrect: false, explanation: '틀렸습니다.' },
        { key: '4', text: '오답 보기 4번', isCorrect: false, explanation: '틀렸습니다.' }
      ],
      defeated: false
    };
    setWorld(prev => ({
      ...prev,
      monsters: { ...prev.monsters, [newId]: newMon }
    }));
    setSelectedMonsterId(newId);
  };

  const handleDeleteMonster = (monId: string) => {
    if (Object.keys(world.monsters).length <= 1) {
      alert('⚠️ 최소 1마리 이상의 요괴가 존재해야 합니다.');
      return;
    }
    if (confirm(`'${world.monsters[monId]?.name}' 요괴를 삭제하시겠습니까?`)) {
      setWorld(prev => {
        const copy = { ...prev.monsters };
        delete copy[monId];
        // Remove from locations
        const updatedLocs = { ...prev.locations };
        Object.keys(updatedLocs).forEach(k => {
          if (updatedLocs[k].monsterId === monId) {
            delete updatedLocs[k].monsterId;
          }
        });
        return { ...prev, monsters: copy, locations: updatedLocs };
      });
      const remaining = Object.keys(world.monsters).filter(k => k !== monId);
      if (remaining.length > 0) setSelectedMonsterId(remaining[0]);
    }
  };

  // ----------------------------------------------------------------
  // Job Handlers
  // ----------------------------------------------------------------
  const currentJob = world.jobs?.[selectedJobId] || Object.values(world.jobs || {})[0];

  const handleJobChange = (field: keyof RPGJob, val: any) => {
    if (!currentJob) return;
    setWorld(prev => ({
      ...prev,
      jobs: {
        ...(prev.jobs || {}),
        [currentJob.id]: {
          ...((prev.jobs || {})[currentJob.id]),
          [field]: val
        }
      }
    }));
  };

  const handleAddJob = () => {
    const newId = `job_custom_${Date.now().toString().slice(-4)}`;
    const newJob: RPGJob = {
      id: newId,
      name: '새로운 직업 클래스',
      title: '특수 데이터 전문가',
      description: '새로운 능력치와 특성을 가진 수사관 직업입니다.',
      baseHp: 110,
      baseAttack: 18,
      startingItems: ['초급 수사관 배지', '연속 스펙트럼 물약'],
      perkName: '신속 해독',
      perkDescription: '전투 시 추가 능력 발동',
      icon: '🕵️'
    };
    setWorld(prev => ({
      ...prev,
      jobs: { ...(prev.jobs || {}), [newId]: newJob }
    }));
    setSelectedJobId(newId);
  };

  const handleDeleteJob = (jobId: string) => {
    if (Object.keys(world.jobs || {}).length <= 1) {
      alert('⚠️ 최소 1개 이상의 직업이 존재해야 합니다.');
      return;
    }
    if (confirm(`'${world.jobs?.[jobId]?.name}' 직업을 삭제하시겠습니까?`)) {
      setWorld(prev => {
        const copy = { ...(prev.jobs || {}) };
        delete copy[jobId];
        return { ...prev, jobs: copy };
      });
      const remaining = Object.keys(world.jobs || {}).filter(k => k !== jobId);
      if (remaining.length > 0) setSelectedJobId(remaining[0]);
    }
  };

  // ----------------------------------------------------------------
  // Item Handlers
  // ----------------------------------------------------------------
  const currentItem = world.items?.[selectedItemId] || Object.values(world.items || {})[0];

  const handleItemChange = (field: keyof RPGItem, val: any) => {
    if (!currentItem) return;
    setWorld(prev => ({
      ...prev,
      items: {
        ...(prev.items || {}),
        [currentItem.id]: {
          ...((prev.items || {})[currentItem.id]),
          [field]: val
        }
      }
    }));
  };

  const handleAddItem = () => {
    const newId = `item_custom_${Date.now().toString().slice(-4)}`;
    const newItem: RPGItem = {
      id: newId,
      name: '새로운 신비한 아이템',
      type: 'potion',
      description: '체력을 회복하거나 공격력을 강화하는 특수 아이템입니다.',
      effectValue: 30,
      icon: '✨'
    };
    setWorld(prev => ({
      ...prev,
      items: { ...(prev.items || {}), [newId]: newItem }
    }));
    setSelectedItemId(newId);
  };

  const handleDeleteItem = (itemId: string) => {
    if (Object.keys(world.items || {}).length <= 1) {
      alert('⚠️ 최소 1개 이상의 아이템이 존재해야 합니다.');
      return;
    }
    if (confirm(`'${world.items?.[itemId]?.name}' 아이템을 삭제하시겠습니까?`)) {
      setWorld(prev => {
        const copy = { ...(prev.items || {}) };
        delete copy[itemId];
        return { ...prev, items: copy };
      });
      const remaining = Object.keys(world.items || {}).filter(k => k !== itemId);
      if (remaining.length > 0) setSelectedItemId(remaining[0]);
    }
  };

  // ----------------------------------------------------------------
  // Quizzes / GameStep Handlers
  // ----------------------------------------------------------------
  const steps = world.gameSteps || [];
  const currentStep = steps[selectedQuizIdx] || steps[0];

  const handleStepFieldChange = (field: keyof GameStep, val: any) => {
    const updated = [...steps];
    updated[selectedQuizIdx] = { ...updated[selectedQuizIdx], [field]: val };
    setWorld(prev => ({ ...prev, gameSteps: updated }));
  };

  const handleAddQuizStep = () => {
    if (steps.length >= 10) {
      alert('⚠️ 문제는 최대 10문제까지만 추가할 수 있습니다.');
      return;
    }
    const num = steps.length + 1;
    const newStep: GameStep = {
      id: `Q${num}_CUSTOM_${Date.now().toString().slice(-4)}`,
      stageId: Math.min(4, Math.ceil(num / 2.5)),
      stageName: `${Math.min(4, Math.ceil(num / 2.5))}단계: 맞춤 데이터 수사`,
      conceptCategory: '종합응용',
      title: `[사건 #${String(num).padStart(2, '0')}] 새로운 데이터 탐구 과제`,
      story: [
        '▶ [SYSTEM] 새로운 수사 데이터 단서가 발견되었습니다.',
        '▶ 문제를 주의 깊게 읽고 올바른 정답을 선택해 주세요.',
        '',
        '【질문】 다음 중 올바른 설명은 무엇일까요?'
      ],
      type: 'choice',
      choices: [
        { key: '1', text: '보기 1번 내용', isCorrect: false, explanation: '1번은 오답입니다.' },
        { key: '2', text: '보기 2번 내용', isCorrect: true, explanation: '정답입니다! 훌륭합니다.' },
        { key: '3', text: '보기 3번 내용', isCorrect: false, explanation: '3번은 오답입니다.' },
        { key: '4', text: '보기 4번 내용', isCorrect: false, explanation: '4번은 오답입니다.' }
      ],
      explanationOnCorrect: ['✔ [수사 성공] 정답입니다! 핵심 개념을 올바르게 이해하셨습니다.'],
      hint: '교과서 내용을 잘 떠올려 보세요!'
    };
    const updated = [...steps, newStep];
    setWorld(prev => ({ ...prev, gameSteps: updated }));
    setSelectedQuizIdx(updated.length - 1);
  };

  const handleDeleteQuizStep = (idx: number) => {
    if (steps.length <= 1) {
      alert('⚠️ 최소 1개 이상의 퀴즈 문제는 유지되어야 합니다.');
      return;
    }
    if (confirm(`'${steps[idx].title}' 문제를 삭제하시겠습니까?`)) {
      const updated = steps.filter((_, i) => i !== idx);
      setWorld(prev => ({ ...prev, gameSteps: updated }));
      setSelectedQuizIdx(Math.max(0, idx - 1));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-text"
      onClick={e => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-6xl h-[92vh] bg-[#0c1422] border-2 border-emerald-500/70 rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-100 font-sans select-text"
        onClick={e => e.stopPropagation()}
      >
        {/* Hidden File Input for JSON Import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportJsonFile}
          accept=".json"
          className="hidden"
        />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#070e1a] border-b border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  🎮 MUD RPG 월드 & 데이터 그래픽 편집기
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hidden sm:inline-block">
                  백엔드리스 (Serverless QR/URL)
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden md:block">
                맵 지형, 출몰 요괴, 직업, 아이템, 퀴즈를 자유롭게 커스텀하고 QR코드 및 링크로 공유하세요.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#09111e] border-b border-neutral-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'share'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Share2 className="w-4 h-4 text-emerald-300" />
            🔗 공유 & QR코드
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'map'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-300" />
            🗺️ 맵/지형 ({Object.keys(world.locations).length})
          </button>

          <button
            onClick={() => setActiveTab('monsters')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'monsters'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Skull className="w-4 h-4 text-emerald-300" />
            👾 몬스터/요괴 ({Object.keys(world.monsters).length})
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'jobs'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-300" />
            🛡️ 직업 클래스 ({Object.keys(world.jobs || {}).length})
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'items'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-300" />
            🎒 아이템 ({Object.keys(world.items || {}).length})
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'quizzes'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-300" />
            📝 퀴즈 문제 ({steps.length}/10)
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#0a121e]">
          
          {/* ========================================================================= */}
          {/* TAB 1: QR & Link Sharing + Metadata                                       */}
          {/* ========================================================================= */}
          {activeTab === 'share' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* World Meta Box */}
              <div className="p-4 sm:p-5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  월드 기본 정보 (World Title & Info)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="block text-xs text-neutral-400 mb-1">월드 제목 (Title)</label>
                    <input
                      type="text"
                      value={world.title}
                      onChange={e => setWorld(w => ({ ...w, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      placeholder="예: 국립데이터연구소: 아날로그 vs 디지털 데이터 던전"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-xs text-neutral-400 mb-1">제작자 (Author)</label>
                    <input
                      type="text"
                      value={world.author || ''}
                      onChange={e => setWorld(w => ({ ...w, author: e.target.value }))}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      placeholder="예: 6학년 1반 김선생님"
                    />
                  </div>
                  <div className="sm:col-span-12">
                    <label className="block text-xs text-neutral-400 mb-1">월드 설명 (Description)</label>
                    <textarea
                      rows={2}
                      value={world.description || ''}
                      onChange={e => setWorld(w => ({ ...w, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                      placeholder="월드에 대한 소개 및 학습 목표..."
                    />
                  </div>
                </div>
              </div>

              {/* QR Code & Direct URL Share Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 sm:p-6 rounded-xl bg-gradient-to-br from-[#0d1f14] via-[#091522] to-[#0a121e] border-2 border-emerald-500/60 shadow-xl">
                {/* Left: QR Canvas */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-[#050c07] rounded-xl border border-emerald-500/40">
                  <div className="p-2 bg-black rounded-lg border border-emerald-500/60 shadow-inner">
                    <canvas ref={qrCanvasRef} className="rounded" />
                  </div>
                  <span className="mt-3 text-xs text-emerald-400 font-mono flex items-center gap-1.5 font-bold">
                    <QrCode className="w-4 h-4" />
                    스마트폰 카메라로 스캔하여 즉시 플레이
                  </span>
                  <span className="text-[11px] text-neutral-400 text-center mt-1">
                    별도의 서버 없이 URL 해시에 모든 데이터가 안전하게 압축 포함되어 있습니다.
                  </span>
                </div>

                {/* Right: Copy Link & File Backup */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                      <Share2 className="w-5 h-5 text-emerald-400" />
                      백엔드리스(Serverless) 링크 및 QR 공유
                    </h3>
                    <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                      내가 만든 <strong>맵 지형, 요괴 능력치/문제, 직업, 아이템</strong> 전체가 압축 URL 링크에 담깁니다.
                      학생들에게 이 링크나 QR코드를 전달하면, 누구나 로그인/서버 없이 즉시 동일한 게임을 플레이할 수 있습니다!
                    </p>

                    {/* Share Link Input Box */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-emerald-300">
                        생성된 공유 웹 링크 (URL)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareUrl}
                          className="flex-1 px-3 py-2 bg-neutral-950/90 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-300 select-all truncate"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-lg transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                        >
                          {copySuccessMsg ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-200" />
                              복사 완료!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              링크 복사
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* JSON Backup & Reset Actions */}
                  <div className="pt-4 border-t border-neutral-800/80 flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={handleExportJson}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors cursor-pointer border border-neutral-700"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      JSON 파일 다운로드
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors cursor-pointer border border-neutral-700"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      JSON 파일 불러오기
                    </button>

                    <button
                      onClick={handleResetWorld}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-colors cursor-pointer border border-amber-500/30 ml-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      기본 던전으로 초기화
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: Map & Location Editor                                              */}
          {/* ========================================================================= */}
          {activeTab === 'map' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Location List */}
              <div className="w-60 sm:w-72 border-r border-neutral-800 bg-[#070e1a] flex flex-col overflow-hidden">
                <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    던전 맵 구역 목록 ({Object.keys(world.locations).length})
                  </span>
                  <button
                    onClick={handleAddLocation}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 추가
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {(Object.values(world.locations) as RPGLocation[]).map(loc => {
                    const isSelected = loc.id === selectedLocId;
                    return (
                      <button
                        key={loc.id}
                        onClick={() => setSelectedLocId(loc.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="text-[11px] opacity-75 font-mono">ID: {loc.id}</div>
                          <div className="truncate font-medium">{loc.name}</div>
                          {loc.monsterId && world.monsters[loc.monsterId] && (
                            <div className="text-[10px] text-red-400 mt-0.5 flex items-center gap-1">
                              👾 {world.monsters[loc.monsterId].name.split(' ')[0]}
                            </div>
                          )}
                        </div>
                        {loc.isSanctuary && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                            치료
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Location Details Form */}
              {currentLocation ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs">
                        구역 ID: {currentLocation.id}
                      </span>
                    </div>
                    {Object.keys(world.locations).length > 1 && (
                      <button
                        onClick={() => handleDeleteLocation(currentLocation.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-red-400 hover:bg-red-500/20 rounded border border-red-500/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        이 구역 삭제
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        구역 이름 (Location Name)
                      </label>
                      <input
                        type="text"
                        value={currentLocation.name}
                        onChange={e => handleLocationChange('name', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                        placeholder="예: 데이터 던전 입구"
                      />
                    </div>

                    <div className="sm:col-span-4 flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-neutral-900 border border-neutral-700 w-full hover:border-emerald-500">
                        <input
                          type="checkbox"
                          checked={!!currentLocation.isSanctuary}
                          onChange={e => handleLocationChange('isSanctuary', e.target.checked)}
                          className="w-4 h-4 text-emerald-500 rounded bg-neutral-800 accent-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs text-emerald-300 font-medium">
                          안전 재충전 구역 (HP 회복소)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      구역 설명 (Description)
                    </label>
                    <textarea
                      rows={3}
                      value={currentLocation.description}
                      onChange={e => handleLocationChange('description', e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-emerald-500"
                      placeholder="구역에 들어섰을 때 출력되는 배경 묘사..."
                    />
                  </div>

                  {/* Connected Exits (동, 서, 남, 북) */}
                  <div className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Compass className="w-4 h-4" />
                      이동 통로 연결 설정 (동, 서, 남, 북 방향 출구)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(['동', '서', '남', '북'] as const).map(dir => (
                        <div key={dir} className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                          <label className="block text-xs font-bold text-emerald-300 mb-1">
                            [{dir}쪽 통로]
                          </label>
                          <select
                            value={currentLocation.exits?.[dir] || 'none'}
                            onChange={e => handleExitChange(dir, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="none">-- 통로 없음 (벽) --</option>
                            {(Object.values(world.locations) as RPGLocation[])
                              .filter(l => l.id !== currentLocation.id)
                              .map(l => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monster Assignment */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        출몰하는 데이터 요괴 지정
                      </label>
                      <select
                        value={currentLocation.monsterId || 'none'}
                        onChange={e => {
                          const val = e.target.value;
                          handleLocationChange('monsterId', val === 'none' ? undefined : val);
                        }}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="none">-- 요괴 없음 (안전/평화 구역) --</option>
                        {(Object.values(world.monsters) as RPGMonster[]).map(m => (
                          <option key={m.id} value={m.id}>
                            👾 {m.name} (HP: {m.hp} | ATK: {m.attack})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        학습 단서 및 힌트 문구 (Clue)
                      </label>
                      <input
                        type="text"
                        value={currentLocation.clue || ''}
                        onChange={e => handleLocationChange('clue', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                        placeholder="예: 단서: 아날로그 데이터는 자연의 연속적인 물리량..."
                      />
                    </div>
                  </div>

                  {/* ASCII Art */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      구역 레트로 ASCII 아트 화면 (줄바꿈 가능)
                    </label>
                    <textarea
                      rows={5}
                      value={(currentLocation.asciiArt || []).join('\n')}
                      onChange={e => handleLocationChange('asciiArt', e.target.value.split('\n'))}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-emerald-400 font-mono leading-tight focus:outline-none focus:border-emerald-500 resize-y"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: Monster & Combat Quiz Editor                                       */}
          {/* ========================================================================= */}
          {activeTab === 'monsters' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Monster List */}
              <div className="w-60 sm:w-72 border-r border-neutral-800 bg-[#070e1a] flex flex-col overflow-hidden">
                <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Skull className="w-3.5 h-3.5 text-red-400" />
                    데이터 요괴 목록 ({Object.keys(world.monsters).length})
                  </span>
                  <button
                    onClick={handleAddMonster}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white font-medium rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 추가
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {(Object.values(world.monsters) as RPGMonster[]).map(m => {
                    const isSelected = m.id === selectedMonsterId;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMonsterId(m.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-red-950/40 border-red-500 text-red-300 font-bold'
                            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="text-[11px] opacity-75 font-mono">ID: {m.id}</div>
                          <div className="truncate font-medium">{m.name}</div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">
                            ❤️ HP {m.hp} | 🗡️ ATK {m.attack}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Monster Details & Combat Quiz Form */}
              {currentMonster ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-xs">
                        요괴 ID: {currentMonster.id}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {currentMonster.title}
                      </span>
                    </div>
                    {Object.keys(world.monsters).length > 1 && (
                      <button
                        onClick={() => handleDeleteMonster(currentMonster.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-red-400 hover:bg-red-500/20 rounded border border-red-500/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        이 요괴 삭제
                      </button>
                    )}
                  </div>

                  {/* Name & Title */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        요괴 이름 (Name)
                      </label>
                      <input
                        type="text"
                        value={currentMonster.name}
                        onChange={e => handleMonsterChange('name', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                        placeholder="예: 잡음 요괴 (Noise Monster)"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        요괴 타이틀/별칭 (Title)
                      </label>
                      <input
                        type="text"
                        value={currentMonster.title}
                        onChange={e => handleMonsterChange('title', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                        placeholder="예: [숲의 방해꾼] 아날로그 파형을 뒤흔드는 요괴"
                      />
                    </div>
                  </div>

                  {/* Stats (HP, MaxHP, Attack, Exp, Drop Item) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">체력 (Max HP)</label>
                      <input
                        type="number"
                        value={currentMonster.maxHp}
                        onChange={e => {
                          const val = Number(e.target.value) || 10;
                          handleMonsterChange('maxHp', val);
                          handleMonsterChange('hp', val);
                        }}
                        className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">공격력 (Attack)</label>
                      <input
                        type="number"
                        value={currentMonster.attack}
                        onChange={e => handleMonsterChange('attack', Number(e.target.value) || 5)}
                        className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">처치 EXP 보상</label>
                      <input
                        type="number"
                        value={currentMonster.expReward}
                        onChange={e => handleMonsterChange('expReward', Number(e.target.value) || 10)}
                        className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">처치 시 드롭 아이템</label>
                      <input
                        type="text"
                        value={currentMonster.itemReward || ''}
                        onChange={e => handleMonsterChange('itemReward', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-red-500"
                        placeholder="예: 연속 스펙트럼 물약"
                      />
                    </div>
                  </div>

                  {/* Encounter Dialogue */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      전투 조우 대사 (Dialogue)
                    </label>
                    <input
                      type="text"
                      value={currentMonster.dialogue || ''}
                      onChange={e => handleMonsterChange('dialogue', e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-red-500"
                      placeholder="요괴와 조우했을 때 외치는 대사..."
                    />
                  </div>

                  {/* Combat Question & 4 Choices */}
                  <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Zap className="w-4 h-4" />
                        전투 공격 퀴즈 문제 및 4지선다 정답 지정
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">요괴의 시험 문제 지문</label>
                      <input
                        type="text"
                        value={currentMonster.questionText}
                        onChange={e => handleMonsterChange('questionText', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-500 font-medium"
                        placeholder="예: 【잡음 요괴의 공격 시험】 아날로그 데이터의 특성은?"
                      />
                    </div>

                    <div className="space-y-2 pt-2">
                      {(currentMonster.choices || []).map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className={`p-2.5 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center gap-2 ${
                            c.isCorrect ? 'bg-red-950/30 border-red-500' : 'bg-neutral-950 border-neutral-800'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="radio"
                              name={`monster_choice_${currentMonster.id}`}
                              checked={c.isCorrect}
                              onChange={() => handleSetMonsterCorrectChoice(cIdx)}
                              className="w-4 h-4 text-red-500 accent-red-500 cursor-pointer"
                            />
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              c.isCorrect ? 'bg-red-500 text-white' : 'bg-neutral-800 text-neutral-300'
                            }`}>
                              [{cIdx + 1}번 {c.isCorrect ? '(정답)' : ''}]
                            </span>
                          </label>

                          <input
                            type="text"
                            value={c.text}
                            onChange={e => handleMonsterChoiceChange(cIdx, 'text', e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-red-500 w-full sm:w-auto"
                            placeholder={`보기 ${cIdx + 1}번 내용`}
                          />

                          <input
                            type="text"
                            value={c.explanation || ''}
                            onChange={e => handleMonsterChoiceChange(cIdx, 'explanation', e.target.value)}
                            className="w-full sm:w-64 px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-neutral-300 focus:outline-none focus:border-red-500 font-mono"
                            placeholder="선택 시 요괴 반응/해설..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ASCII Art */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      요괴 레트로 ASCII 아트 (줄바꿈 가능)
                    </label>
                    <textarea
                      rows={4}
                      value={(currentMonster.asciiArt || []).join('\n')}
                      onChange={e => handleMonsterChange('asciiArt', e.target.value.split('\n'))}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-red-400 font-mono leading-tight focus:outline-none focus:border-red-500 resize-y"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: Job / Class Editor                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'jobs' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Job List */}
              <div className="w-60 sm:w-72 border-r border-neutral-800 bg-[#070e1a] flex flex-col overflow-hidden">
                <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    직업 클래스 목록 ({Object.keys(world.jobs || {}).length})
                  </span>
                  <button
                    onClick={handleAddJob}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 추가
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {(Object.values(world.jobs || {}) as RPGJob[]).map(job => {
                    const isSelected = job.id === selectedJobId;
                    return (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-500 text-sky-300 font-bold'
                            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="text-[11px] opacity-75 font-mono">ID: {job.id}</div>
                          <div className="truncate font-medium flex items-center gap-1.5">
                            <span>{job.icon || '🛡️'}</span>
                            <span>{job.name}</span>
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">
                            ❤️ HP {job.baseHp} | 🗡️ ATK {job.baseAttack}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Job Details Form */}
              {currentJob ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold text-xs">
                        직업 ID: {currentJob.id}
                      </span>
                    </div>
                    {Object.keys(world.jobs || {}).length > 1 && (
                      <button
                        onClick={() => handleDeleteJob(currentJob.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-red-400 hover:bg-red-500/20 rounded border border-red-500/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        이 직업 삭제
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        아이콘 (Emoji)
                      </label>
                      <input
                        type="text"
                        value={currentJob.icon || '🛡️'}
                        onChange={e => handleJobChange('icon', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-center text-lg text-white focus:outline-none focus:border-sky-500"
                        placeholder="💻"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        직업명 (Job Name)
                      </label>
                      <input
                        type="text"
                        value={currentJob.name}
                        onChange={e => handleJobChange('name', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                        placeholder="예: 화이트해커 (White Hacker)"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        직업 칭호 (Title)
                      </label>
                      <input
                        type="text"
                        value={currentJob.title}
                        onChange={e => handleJobChange('title', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                        placeholder="예: 디지털 보안의 수호자"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      직업 소개 및 설명 (Description)
                    </label>
                    <textarea
                      rows={3}
                      value={currentJob.description}
                      onChange={e => handleJobChange('description', e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-sky-500 resize-none"
                    />
                  </div>

                  {/* Stats & Perks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">기본 체력 (Base HP)</label>
                      <input
                        type="number"
                        value={currentJob.baseHp}
                        onChange={e => handleJobChange('baseHp', Number(e.target.value) || 80)}
                        className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">기본 공격력 (Base ATK)</label>
                      <input
                        type="number"
                        value={currentJob.baseAttack}
                        onChange={e => handleJobChange('baseAttack', Number(e.target.value) || 10)}
                        className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">특수 패시브 이름 (Perk)</label>
                      <input
                        type="text"
                        value={currentJob.perkName || ''}
                        onChange={e => handleJobChange('perkName', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-sky-500"
                        placeholder="예: 비트 무손실 타격"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">패시브 설명</label>
                      <input
                        type="text"
                        value={currentJob.perkDescription || ''}
                        onChange={e => handleJobChange('perkDescription', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-sky-500"
                        placeholder="예: 디지털 몬스터에게 추가 피해"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      시작 시 인벤토리에 지급할 아이템 (쉼표로 구분)
                    </label>
                    <input
                      type="text"
                      value={(currentJob.startingItems || []).join(', ')}
                      onChange={e =>
                        handleJobChange(
                          'startingItems',
                          e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        )
                      }
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                      placeholder="예: 초급 수사관 배지, 디지털 복제 칩"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: Item Editor                                                        */}
          {/* ========================================================================= */}
          {activeTab === 'items' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Item List */}
              <div className="w-60 sm:w-72 border-r border-neutral-800 bg-[#070e1a] flex flex-col overflow-hidden">
                <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    아이템 목록 ({Object.keys(world.items || {}).length})
                  </span>
                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 추가
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {(Object.values(world.items || {}) as RPGItem[]).map(item => {
                    const isSelected = item.id === selectedItemId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500 text-amber-300 font-bold'
                            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="text-[11px] opacity-75 font-mono">ID: {item.id}</div>
                          <div className="truncate font-medium flex items-center gap-1.5">
                            <span>{item.icon || '🎒'}</span>
                            <span>{item.name}</span>
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">
                            효과: +{item.effectValue} ({item.type})
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Item Details Form */}
              {currentItem ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs">
                        아이템 ID: {currentItem.id}
                      </span>
                    </div>
                    {Object.keys(world.items || {}).length > 1 && (
                      <button
                        onClick={() => handleDeleteItem(currentItem.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-red-400 hover:bg-red-500/20 rounded border border-red-500/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        이 아이템 삭제
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        아이콘
                      </label>
                      <input
                        type="text"
                        value={currentItem.icon || '🧪'}
                        onChange={e => handleItemChange('icon', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-center text-lg text-white focus:outline-none focus:border-amber-500"
                        placeholder="🧪"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        아이템 이름 (Name)
                      </label>
                      <input
                        type="text"
                        value={currentItem.name}
                        onChange={e => handleItemChange('name', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                        placeholder="예: 연속 스펙트럼 물약"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        아이템 분류 (Type)
                      </label>
                      <select
                        value={currentItem.type}
                        onChange={e => handleItemChange('type', e.target.value as any)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="potion">회복 물약 (HP 회복)</option>
                        <option value="equipment">장비 (공격력 영구 증가)</option>
                        <option value="chip">복제 칩 (공격력 강화)</option>
                        <option value="special">특수 보석 (승리 증표)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      효과 수치 (HP 회복량 또는 공격력 증가량)
                    </label>
                    <input
                      type="number"
                      value={currentItem.effectValue || 0}
                      onChange={e => handleItemChange('effectValue', Number(e.target.value) || 0)}
                      className="w-full sm:w-48 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                      placeholder="예: 40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      아이템 설명 (Description)
                    </label>
                    <textarea
                      rows={3}
                      value={currentItem.description}
                      onChange={e => handleItemChange('description', e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-amber-500 resize-none"
                      placeholder="아이템 사용 시의 효과와 배경 설명..."
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: Textbook Quizzes / Stages Editor                                   */}
          {/* ========================================================================= */}
          {activeTab === 'quizzes' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Step List */}
              <div className="w-56 sm:w-64 border-r border-neutral-800 bg-[#070e1a] flex flex-col overflow-hidden">
                <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    문제 목록 ({steps.length}/10)
                  </span>
                  <button
                    onClick={handleAddQuizStep}
                    disabled={steps.length >= 10}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 추가
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {steps.map((s, idx) => {
                    const isSelected = idx === selectedQuizIdx;
                    return (
                      <button
                        key={s.id || idx}
                        onClick={() => setSelectedQuizIdx(idx)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="text-[11px] opacity-75 font-mono">
                            {idx + 1}번 문제 ({s.stageName || `${s.stageId}단계`})
                          </div>
                          <div className="truncate font-medium">
                            {s.title.replace(/^\[사건 #\d+\]\s*/, '')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Step Form */}
              {currentStep ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs">
                        {selectedQuizIdx + 1}번 퀴즈 문제 편집 중
                      </span>
                    </div>
                    {steps.length > 1 && (
                      <button
                        onClick={() => handleDeleteQuizStep(selectedQuizIdx)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-red-400 hover:bg-red-500/20 rounded border border-red-500/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        이 문제 삭제
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        수사 단계 분류 (직접 입력)
                      </label>
                      <input
                        type="text"
                        value={currentStep.stageName || ''}
                        onChange={e => {
                          const val = e.target.value;
                          handleStepFieldChange('stageName', val);
                          const match = val.match(/^(\d+)/);
                          if (match) handleStepFieldChange('stageId', Number(match[1]));
                        }}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                        placeholder="예: 1단계: 데이터의 개념과 분류"
                      />
                    </div>

                    <div className="sm:col-span-7">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        사건 제목 (Title)
                      </label>
                      <input
                        type="text"
                        value={currentStep.title}
                        onChange={e => handleStepFieldChange('title', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                        placeholder="예: [사건 #01] 데이터 연구소의 비밀 금고"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      사건 시나리오 & 본문 지문 내용 (줄바꿈 가능)
                    </label>
                    <textarea
                      rows={4}
                      value={currentStep.story.join('\n')}
                      onChange={e => handleStepFieldChange('story', e.target.value.split('\n'))}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed resize-y"
                    />
                  </div>

                  {/* 4 Choices */}
                  <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      4지선다 보기 및 정답 지정 (라디오 버튼)
                    </span>

                    <div className="space-y-2">
                      {(currentStep.choices || []).map((choice, cIdx) => (
                        <div
                          key={cIdx}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                            choice.isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/80'
                              : 'bg-neutral-950 border-neutral-800'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="radio"
                              name={`quiz_step_choice_${selectedQuizIdx}`}
                              checked={choice.isCorrect}
                              onChange={() => {
                                const choices = (currentStep.choices || []).map((c, i) => ({
                                  ...c,
                                  isCorrect: i === cIdx
                                }));
                                handleStepFieldChange('choices', choices);
                              }}
                              className="w-4 h-4 text-emerald-500 accent-emerald-500 cursor-pointer"
                            />
                            <span className={`font-bold text-xs px-2 py-0.5 rounded ${
                              choice.isCorrect ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'
                            }`}>
                              [{cIdx + 1}번]
                            </span>
                          </label>

                          <input
                            type="text"
                            value={choice.text}
                            onChange={e => {
                              const choices = [...(currentStep.choices || [])];
                              choices[cIdx] = { ...choices[cIdx], text: e.target.value };
                              handleStepFieldChange('choices', choices);
                            }}
                            className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                            placeholder={`보기 ${cIdx + 1}번 내용을 입력하세요`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation & Hint */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        정답 시 해설 문구
                      </label>
                      <textarea
                        rows={3}
                        value={currentStep.explanationOnCorrect.join('\n')}
                        onChange={e => handleStepFieldChange('explanationOnCorrect', e.target.value.split('\n'))}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 resize-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        HINT 힌트 문구
                      </label>
                      <textarea
                        rows={3}
                        value={currentStep.hint}
                        onChange={e => handleStepFieldChange('hint', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 resize-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-5 py-3.5 bg-[#070e1a] border-t border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {saveSuccessMsg && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                {saveSuccessMsg}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              닫기 / 취소
            </button>
            <button
              onClick={handleSaveAndApply}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-900/40 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              전체 저장하고 게임에 즉시 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
