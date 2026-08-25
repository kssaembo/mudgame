import { useEffect, useRef, useState } from 'react';
import { TerminalHeader } from './components/TerminalHeader';
import { TerminalScreen } from './components/TerminalScreen';
import { WorldEditorModal } from './components/WorldEditorModal';
import { ASCII_TITLE } from './gameData';
import { DEFAULT_CUSTOM_WORLD } from './rpgData';
import { soundFx } from './sound';
import {
  clearStudentLogs,
  copyJsonReport,
  decodeWorldData,
  downloadCsvLog,
  downloadResultJpg,
  getLogs,
  getStoredSession,
  loadCustomWorld,
  resetCustomWorldToDefault,
  saveCustomWorld,
  saveLogEntry,
  saveSession
} from './storage';
import {
  ColorTheme,
  CustomWorldData,
  Direction,
  GameStep,
  LearningLogEntry,
  RPGJob,
  RPGMonster,
  RPGStats,
  StudentSession,
  TerminalBoxData,
  TerminalLine
} from './types';

export default function App() {
  const [theme, setTheme] = useState<ColorTheme>('green');
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Dynamic Custom World (Map, Monsters, Jobs, Items, Quizzes)
  const [worldData, setWorldData] = useState<CustomWorldData>(() => {
    // 1. First priority: check URL hash for shared world
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      const match = hash.match(/#world=([^&]+)/);
      if (match && match[1]) {
        const decoded = decodeWorldData(match[1]);
        if (decoded) {
          saveCustomWorld(decoded);
          return decoded;
        }
      }
    }
    // 2. Fallback to localStorage or default
    return loadCustomWorld();
  });

  // World Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editorInitialTab, setEditorInitialTab] = useState<'share' | 'map' | 'monsters' | 'jobs' | 'items' | 'quizzes'>('share');

  const [session, setSession] = useState<StudentSession | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now());
  const [attemptCounts, setAttemptCounts] = useState<{ [key: string]: number }>({});

  // Dynamic Monsters state
  const [monsters, setMonsters] = useState<{ [id: string]: RPGMonster }>(() => worldData.monsters);

  // Active Combat state (when fighting in a room)
  const [activeBattleMonsterId, setActiveBattleMonsterId] = useState<string | null>(null);

  // Pending Job selection state during new player registration
  const [pendingPlayerName, setPendingPlayerName] = useState<string | null>(null);

  const [lines, setLines] = useState<TerminalLine[]>([]);
  const lineIdCounter = useRef(1);
  const hasInitializedRef = useRef(false);

  // Synchronize monsters if worldData changes
  useEffect(() => {
    setMonsters(worldData.monsters);
  }, [worldData]);

  // Listen to hash changes if a shared link is opened while running
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/#world=([^&]+)/);
      if (match && match[1]) {
        const decoded = decodeWorldData(match[1]);
        if (decoded) {
          setWorldData(decoded);
          setMonsters(decoded.monsters);
          saveCustomWorld(decoded);
          soundFx.playLevelUp();
          addDirectLine('box', '', true, {
            title: '★ 외부 공유 커스텀 월드 로드 완료! ★',
            badge: decoded.version,
            variant: 'certificate',
            lines: [
              `새로운 게임 월드 [${decoded.title}]이(가) 적용되었습니다!`,
              `• 제작자 : ${decoded.author}`,
              `• 장소 수 : ${Object.keys(decoded.locations).length}개 구역`,
              `• 몬스터 : ${Object.keys(decoded.monsters).length}마리`,
              `• 직업군 : ${Object.keys(decoded.jobs || {}).length}개 직업`,
              `• 학습 문제 : ${decoded.gameSteps?.length || 0}문항`,
              '────────────────────────────────────────────────────────',
              '▶ 언제든지 \'공유\' 명령어로 QR코드/링크를 생성할 수 있습니다.'
            ]
          });
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Queue system for sequential typewriter line streaming
  const lineQueueRef = useRef<{
    type: TerminalLine['type'];
    text: string;
    highlight?: boolean;
    instant?: boolean;
    boxData?: TerminalBoxData;
  }[]>([]);
  const isStreamingRef = useRef(false);

  const processNextInQueue = () => {
    if (lineQueueRef.current.length === 0) {
      isStreamingRef.current = false;
      return;
    }

    isStreamingRef.current = true;
    const nextItem = lineQueueRef.current.shift()!;

    const newLine: TerminalLine = {
      id: `line_${lineIdCounter.current++}`,
      type: nextItem.type,
      text: nextItem.text,
      timestamp: new Date().toLocaleTimeString(),
      highlight: nextItem.highlight || false,
      boxData: nextItem.boxData
    };

    setLines(prev => [...prev, newLine]);

    // Delay calculation
    if (
      nextItem.instant ||
      nextItem.type === 'ascii' ||
      nextItem.type === 'box' ||
      nextItem.type === 'user' ||
      !nextItem.text.trim()
    ) {
      setTimeout(processNextInQueue, 8);
    } else {
      const calculatedDelay = Math.min(140, Math.max(30, nextItem.text.length * 3));
      setTimeout(processNextInQueue, calculatedDelay);
    }
  };

  const enqueueLines = (
    newLines: {
      type: TerminalLine['type'];
      text: string;
      highlight?: boolean;
      instant?: boolean;
      boxData?: TerminalBoxData;
    }[],
    clearQueue: boolean = false
  ) => {
    if (clearQueue) {
      lineQueueRef.current = [];
    }
    lineQueueRef.current.push(...newLines);
    if (!isStreamingRef.current) {
      processNextInQueue();
    }
  };

  const addDirectLine = (type: TerminalLine['type'], text: string, highlight: boolean = false, boxData?: TerminalBoxData) => {
    enqueueLines([{ type, text, highlight, instant: true, boxData }]);
  };

  // Initial welcome screen (1 time execution)
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const existing = getStoredSession();
    const initLines: { type: TerminalLine['type']; text: string; highlight?: boolean; instant?: boolean; boxData?: TerminalBoxData }[] = [];

    // ASCII Title
    ASCII_TITLE.forEach(l => initLines.push({ type: 'ascii', text: l, instant: true }));

    // Check if loaded from custom shared URL
    const hasCustomUrl = typeof window !== 'undefined' && window.location.hash.includes('#world=');

    // Introductory narrative
    initLines.push(
      { type: 'narrative', text: '' },
      { type: 'system', text: `▶ [SYSTEM] 데이터 던전 사이버 MUD 터미널 온라인 가동 완료 (월드: ${worldData.title})` },
      { type: 'system', text: '▶ 프로토콜: 100% 한글 텍스트 어드벤처 RPG [초등 6학년 실과 데이터와 인공지능]' },
      { type: 'narrative', text: '' },
      { type: 'dialogue', text: '김박사: "국립데이터연구소의 데이터 던전에 아날로그와 디지털을 왜곡하는 요괴들이 나타났습니다!"' },
      { type: 'dialogue', text: '       "동, 서, 남, 북 방향으로 이동하며 단서를 찾고, [공격]으로 요괴의 질문을 격파하십시오!"' },
      { type: 'narrative', text: '' },
      { type: 'help', text: '※ 100% 한글 입력: [동, 서, 남, 북, 봐라, 공격, 상태, 가방, 직업, 공유, 관리자, 도움말, 리포트, 다운]' }
    );

    if (hasCustomUrl) {
      initLines.push(
        { type: 'narrative', text: '' },
        { type: 'success', text: `🔗 [공유 월드 감지] '${worldData.title}'(제작: ${worldData.author}) 커스텀 월드에 성공적으로 연결되었습니다!` }
      );
    }

    if (existing && existing.stats) {
      initLines.push(
        { type: 'narrative', text: '' },
        { type: 'success', text: `▶ 이전 수사관 요원 세션 발견: [${existing.studentId}] (Lv.${existing.stats.level}, HP ${existing.stats.hp}/${existing.stats.maxHp})` },
        { type: 'prompt', text: `  이어서 계속하시려면 [예] 또는 [Y]를 입력하시거나, 새로운 요원 이름(닉네임)을 입력하세요.` }
      );
    } else {
      initLines.push(
        { type: 'narrative', text: '' },
        { type: 'prompt', text: '▶ [요원 등록] 이름을 입력하세요. (예: 60101_홍길동 또는 김철수)' }
      );
    }

    enqueueLines(initLines);
  }, []);

  // Print current location / "봐라" command
  const printLookLocation = (locId: string, currentSession: StudentSession | null) => {
    const loc = worldData.locations[locId] || DEFAULT_CUSTOM_WORLD.locations[locId];
    if (!loc) {
      addDirectLine('error', `▶ 알 수 없는 위치(${locId})입니다. 입구로 이동합니다.`);
      return;
    }

    setStepStartTime(Date.now());
    const locLines: { type: TerminalLine['type']; text: string; highlight?: boolean; instant?: boolean }[] = [
      { type: 'narrative', text: '──────────────────────────────────────────────────────────────────────', instant: true },
      { type: 'system', text: `[위치: ${loc.name}]`, highlight: true },
      { type: 'narrative', text: '' }
    ];

    if (loc.asciiArt && loc.asciiArt.length > 0) {
      loc.asciiArt.forEach(a => locLines.push({ type: 'ascii', text: a, instant: true }));
      locLines.push({ type: 'narrative', text: '' });
    }

    locLines.push({ type: 'narrative', text: `▶ ${loc.description}` });

    if (loc.clue) {
      locLines.push({ type: 'help', text: `💡 ${loc.clue}` });
    }

    // Exits info in Korean
    const exitDirections = Object.keys(loc.exits) as Direction[];
    const exitNames = exitDirections
      .filter(d => !!loc.exits[d])
      .map(d => {
        const targetId = loc.exits[d]!;
        const targetLoc = worldData.locations[targetId] || DEFAULT_CUSTOM_WORLD.locations[targetId];
        return `${d}쪽: ${targetLoc ? targetLoc.name.split(' (')[0] : targetId}`;
      })
      .join(' | ');

    locLines.push({ type: 'system', text: `🚪 [이동 가능한 길] ${exitNames || '없음 (막힌 길)'}` });

    // Monster info
    if (loc.monsterId) {
      const monster = monsters[loc.monsterId] || worldData.monsters[loc.monsterId];
      const isDefeated = currentSession?.clearedMonsters?.includes(loc.monsterId) || monster?.defeated;
      if (monster && !isDefeated) {
        locLines.push(
          { type: 'narrative', text: '' },
          { type: 'error', text: `⚔️ [경고! 몬스터 출몰] '${monster.name}'이(가) 길을 가로막고 있습니다! (HP: ${monster.hp}/${monster.maxHp})` },
          { type: 'prompt', text: `▶ 요괴를 물리치려면 '공격' 명령어를 입력하세요.` }
        );
      } else {
        locLines.push(
          { type: 'narrative', text: '' },
          { type: 'success', text: `✔ [평화] 이곳의 데이터 요괴는 이미 퇴치되었습니다. 안전합니다.` }
        );
      }
    }

    // Recharge sanctuary
    if (loc.isSanctuary && currentSession) {
      if (currentSession.stats.hp < currentSession.stats.maxHp) {
        const healedSession = {
          ...currentSession,
          stats: {
            ...currentSession.stats,
            hp: currentSession.stats.maxHp
          }
        };
        setSession(healedSession);
        saveSession(healedSession);
        soundFx.playSuccess();
        locLines.push(
          { type: 'narrative', text: '' },
          { type: 'success', text: `💖 [치유의 빛] 따스한 에너지가 스며들어 체력이 100% (❤️ ${healedSession.stats.maxHp}/${healedSession.stats.maxHp}) 완전히 회복되었습니다!` }
        );
      }
    }

    locLines.push({ type: 'prompt', text: '' });
    enqueueLines(locLines);
  };

  // Start battle with monster
  const triggerBattle = (monsterId: string) => {
    const monster = monsters[monsterId] || worldData.monsters[monsterId];
    if (!monster) return;

    setActiveBattleMonsterId(monsterId);
    setStepStartTime(Date.now());
    soundFx.playBeep();

    const battleLines: { type: TerminalLine['type']; text: string; highlight?: boolean; instant?: boolean }[] = [
      { type: 'narrative', text: '══════════════════════════════════════════════════════════════════════', instant: true },
      { type: 'error', text: `⚔️ [전투 개시] ${monster.title}!`, highlight: true },
      { type: 'narrative', text: '' }
    ];

    if (monster.asciiArt && monster.asciiArt.length > 0) {
      monster.asciiArt.forEach(a => battleLines.push({ type: 'ascii', text: a, instant: true }));
    }

    battleLines.push(
      { type: 'narrative', text: '' },
      { type: 'dialogue', text: `${monster.name}: "${monster.dialogue}"` },
      { type: 'narrative', text: '' },
      { type: 'error', text: `[문제] ${monster.questionText}`, highlight: true },
      { type: 'narrative', text: '' }
    );

    monster.choices.forEach((c) => {
      battleLines.push({ type: 'narrative', text: ` [${c.key}] ${c.text}` });
    });

    battleLines.push(
      { type: 'narrative', text: '' },
      { type: 'prompt', text: '▶ 올바른 개념 선택지 번호(1~4) 또는 한글을 입력하여 공격하십시오!' }
    );

    enqueueLines(battleLines);
  };

  // Handle attack response
  const handleBattleAnswer = (answer: string, monsterId: string) => {
    if (!session) return;
    const monster = monsters[monsterId] || worldData.monsters[monsterId];
    if (!monster) return;

    const timeSpentSec = Math.max(1, Math.round((Date.now() - stepStartTime) / 1000));
    const attemptKey = `battle_${monsterId}`;
    const currentAttempt = (attemptCounts[attemptKey] || 0) + 1;
    setAttemptCounts(prev => ({ ...prev, [attemptKey]: currentAttempt }));

    const matchChoice = monster.choices.find(
      c => c.key === answer || c.text.includes(answer) || (answer === 'O' && c.key === 'O') || (answer === 'X' && c.key === 'X')
    );

    if (!matchChoice) {
      soundFx.playError();
      addDirectLine('error', `▶ 올바른 선택지 번호(1~${monster.choices.length})를 입력해 주세요.`);
      return;
    }

    const isCorrect = matchChoice.isCorrect;
    const feedbackExplanation = matchChoice.explanation;

    // Log recording
    const logEntry: LearningLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      studentId: session.studentId,
      stage: 'RPG 전투',
      stageName: monster.name,
      questionId: monster.questionId || monster.id,
      conceptCategory: monster.id.includes('noise') || monster.id.includes('corrupt') ? '아날로그_특성' : '디지털_특성',
      userInput: answer,
      isCorrect,
      timeSpentSec,
      attemptCount: currentAttempt,
      playerHpAfter: isCorrect ? session.stats.hp : Math.max(0, session.stats.hp - monster.attack),
      playerExpAfter: isCorrect ? session.stats.exp + monster.expReward : session.stats.exp,
      playerLevelAfter: session.stats.level
    };
    saveLogEntry(logEntry);

    if (isCorrect) {
      // Monster defeated!
      soundFx.playSuccess();
      const expGained = monster.expReward;
      let newExp = session.stats.exp + expGained;
      let newLevel = session.stats.level;
      let newMaxHp = session.stats.maxHp;
      let newHp = session.stats.hp;
      let newAttack = session.stats.attack;
      let leveledUp = false;

      // Level up check
      if (newExp >= session.stats.maxExp) {
        newLevel += 1;
        newExp = newExp - session.stats.maxExp;
        newMaxHp += 20;
        newHp = newMaxHp; // Full restore on level up
        newAttack += 10;
        leveledUp = true;
      }

      const newInventory = [...session.stats.inventory];
      if (monster.itemReward && !newInventory.includes(monster.itemReward)) {
        newInventory.push(monster.itemReward);
      }

      const updatedCleared = session.clearedMonsters.includes(monsterId)
        ? session.clearedMonsters
        : [...session.clearedMonsters, monsterId];

      const updatedSession: StudentSession = {
        ...session,
        totalAttempts: session.totalAttempts + 1,
        correctCount: session.correctCount + 1,
        score: session.score + 25,
        clearedMonsters: updatedCleared,
        stats: {
          ...session.stats,
          level: newLevel,
          hp: newHp,
          maxHp: newMaxHp,
          attack: newAttack,
          exp: newExp,
          inventory: newInventory
        }
      };

      if (monster.id.includes('noise') || monster.id.includes('corrupt')) {
        updatedSession.analogTotal += 1;
        updatedSession.analogScore += 1;
      } else {
        updatedSession.digitalTotal += 1;
        updatedSession.digitalScore += 1;
      }

      // Update monster state
      setMonsters(prev => ({
        ...prev,
        [monsterId]: { ...prev[monsterId], hp: 0, defeated: true }
      }));

      setSession(updatedSession);
      saveSession(updatedSession);
      setActiveBattleMonsterId(null);

      const winLines: { type: TerminalLine['type']; text: string; highlight?: boolean; instant?: boolean; boxData?: TerminalBoxData }[] = [
        { type: 'success', text: `✔ [공격 적중! 정답!] 몬스터에게 ${session.stats.attack * 3} 대미지! '${monster.name}' 처치 완료!` },
        { type: 'success', text: `  ${feedbackExplanation}` },
        { type: 'success', text: `🌟 [보상 획득] EXP +${expGained} | 점수 +25점!` }
      ];

      if (monster.itemReward) {
        winLines.push({ type: 'success', text: `🎁 [아이템 획득] '${monster.itemReward}'이(가) 가방에 보관되었습니다!` });
      }

      if (leveledUp) {
        soundFx.playLevelUp();
        winLines.push(
          { type: 'narrative', text: '' },
          {
            type: 'box',
            text: '',
            instant: true,
            boxData: {
              title: '★ 레 벨 업 (LEVEL UP)! ★',
              badge: `Lv.${newLevel}`,
              variant: 'certificate',
              lines: [
                `축하합니다! ${session.studentId} 요원이 Lv.${newLevel}로 승급했습니다!`,
                `• 최대 체력(HP) : ${newMaxHp} (체력 완전 회복 ❤️)`,
                `• 공격력(ATK)   : ${newAttack} (🗡️ +10 상승)`,
                `• 다음 레벨까지 : ${session.stats.maxExp - newExp} EXP 필요`
              ]
            }
          }
        );
      }

      // Check if all monsters in this world cleared or boss defeated
      const totalMonstersCount = Object.keys(worldData.monsters).length;
      const isBossOrAllCleared = monster.id === 'm_boss' || updatedCleared.length >= Math.max(1, totalMonstersCount);

      if (isBossOrAllCleared) {
        updatedSession.completedAt = new Date().toISOString();
        setIsCompleted(true);
        setSession(updatedSession);
        saveSession(updatedSession);

        winLines.push(
          { type: 'narrative', text: '' },
          {
            type: 'box',
            text: '',
            instant: true,
            boxData: {
              title: `★ [${worldData.title}] 정복 & 마스터 수사관 임명장 ★`,
              badge: 'Master Detective',
              variant: 'certificate',
              lines: [
                `요원 성명 : ${session.studentId} (${session.stats.jobTitle || '수사관'} / 최종 Lv.${newLevel} | 🗡️ ATK ${newAttack})`,
                `정복 일자 : ${new Date().toLocaleDateString('ko-KR')}`,
                '────────────────────────────────────────────────────────',
                `위 학생은 [${worldData.title}]의 모든 데이터 요괴를 물리치고`,
                '아날로그와 디지털의 원리를 완벽히 증명하였으므로',
                '[마스터 데이터 수사관]으로 임명합니다.',
                '────────────────────────────────────────────────────────',
                '국립사이버데이터수사본부장 ㊞'
              ]
            }
          },
          { type: 'prompt', text: '▶ [결과 확인/제출] \'리포트\', \'공유\', \'CSV\', \'JSON\', \'다운\' 명령어로 결과를 확인하세요!' }
        );
      } else {
        winLines.push({ type: 'prompt', text: '▶ 주변을 살피려면 \'봐라\' 또는 이동할 방향(\'동\', \'서\', \'남\', \'북\')을 입력하세요.' });
      }

      enqueueLines(winLines);
    } else {
      // Wrong answer -> Monster counter-attacks
      soundFx.playError();
      const damageTaken = monster.attack;
      const remainingHp = Math.max(0, session.stats.hp - damageTaken);

      const updatedSession: StudentSession = {
        ...session,
        totalAttempts: session.totalAttempts + 1,
        stats: {
          ...session.stats,
          hp: remainingHp
        }
      };

      if (monster.id.includes('noise') || monster.id.includes('corrupt')) {
        updatedSession.analogTotal += 1;
      } else {
        updatedSession.digitalTotal += 1;
      }

      const failLines: { type: TerminalLine['type']; text: string; highlight?: boolean; instant?: boolean }[] = [
        { type: 'error', text: `✘ [오답 / 공격 실패] ${feedbackExplanation}` },
        { type: 'error', text: `💥 [${monster.name}의 오개념 반격!] 요원에게 ${damageTaken} 피해! (현재 HP: ❤️ ${remainingHp}/${session.stats.maxHp})` }
      ];

      if (remainingHp <= 0) {
        // Player defeated -> Safe return to sanctuary
        updatedSession.stats.hp = session.stats.maxHp;
        updatedSession.stats.locationId = 'loc_sanctuary';
        setSession(updatedSession);
        saveSession(updatedSession);
        setActiveBattleMonsterId(null);

        failLines.push(
          { type: 'narrative', text: '' },
          { type: 'error', text: '💀 [전투 불능] 체력이 0이 되었습니다! 비상 긴급 탈출 시스템이 작동합니다...' },
          { type: 'success', text: '🛡️ [안전 재충전 구역]으로 무사히 후송되어 체력이 100% 회복되었습니다.' },
          { type: 'prompt', text: '▶ 정비 후 다시 \'동\'쪽으로 나아가 요괴에게 재도전하세요!' }
        );
      } else {
        setSession(updatedSession);
        saveSession(updatedSession);
        failLines.push(
          { type: 'dialogue', text: `김박사: "포기하지 마세요! 개념을 다시 떠올려 보고 다시 답하세요!"` },
          { type: 'prompt', text: `▶ 다시 선택지 번호(1~${monster.choices.length})를 입력하여 공격하세요:` }
        );
      }

      enqueueLines(failLines);
    }
  };

  // Select Job Helper
  const applyJobToSession = (jobKey: string, studentId: string) => {
    const jobList = Object.values(worldData.jobs || DEFAULT_CUSTOM_WORLD.jobs) as RPGJob[];
    const selectedJob = jobList.find(
      (j, idx) => (idx + 1).toString() === jobKey || j.id === jobKey || j.name === jobKey || j.title.includes(jobKey)
    ) || jobList[0];

    const initialStats: RPGStats = {
      level: 1,
      hp: selectedJob.baseHp,
      maxHp: selectedJob.baseHp,
      attack: selectedJob.baseAttack,
      exp: 0,
      maxExp: 100,
      locationId: 'loc_entrance',
      inventory: [...selectedJob.startingItems],
      jobId: selectedJob.id,
      jobTitle: selectedJob.name
    };

    const newSession: StudentSession = {
      studentId,
      startedAt: new Date().toISOString(),
      score: 0,
      totalAttempts: 0,
      correctCount: 0,
      currentStageIndex: 1,
      currentStepIndex: 0,
      analogScore: 0,
      analogTotal: 0,
      digitalScore: 0,
      digitalTotal: 0,
      stats: initialStats,
      clearedMonsters: [],
      visitedLocations: ['loc_entrance']
    };

    setSession(newSession);
    saveSession(newSession);
    setPendingPlayerName(null);
    soundFx.playConnectModem();

    enqueueLines([
      { type: 'narrative', text: '' },
      { type: 'success', text: `✔ [신임 요원 등록 완료] ${studentId} 요원님, ${selectedJob.name} 직업으로 던전에 입장합니다!` },
      { type: 'system', text: `▶ 초기 능력치: Lv.1 | 체력: ❤️ ${selectedJob.baseHp}/${selectedJob.baseHp} | 공격력: 🗡️ ${selectedJob.baseAttack} | 특성: [${selectedJob.perkName}]` },
      { type: 'system', text: `▶ 기본 지급품: ${selectedJob.startingItems.join(', ')}` },
      { type: 'system', text: `▶ 한글 명령어: '동', '서', '남', '북'으로 이동 / '봐라'로 주변 탐색 / '공격'으로 요괴 격파 / '공유'로 QR 생성` },
      { type: 'narrative', text: '' }
    ]);

    printLookLocation('loc_entrance', newSession);
  };

  // Main Command Handler
  const handleCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    soundFx.playBeep();
    addDirectLine('user', `COMMAND> ${cmd}`);

    const lowerCmd = cmd.toLowerCase();

    // 0. If pending Job selection during registration
    if (pendingPlayerName) {
      applyJobToSession(cmd, pendingPlayerName);
      return;
    }

    // 1. If currently in Battle, route numbers/answers to battle handler
    if (activeBattleMonsterId) {
      handleBattleAnswer(cmd, activeBattleMonsterId);
      return;
    }

    // ----------------------------------------------------
    // 100% KOREAN RPG COMMANDS DISPATCHER
    // ----------------------------------------------------

    // 1. HELP / 도움말
    if (cmd === '도움말' || lowerCmd === 'help' || cmd === '?') {
      enqueueLines([
        {
          type: 'box',
          text: '',
          instant: true,
          boxData: {
            title: '[한글 전용 MUD RPG 명령어 가이드]',
            badge: 'Guide',
            variant: 'help',
            lines: [
              '• 동, 서, 남, 북  : 해당 방향의 장소로 이동',
              '• 봐라, 둘러보기  : 현재 위치의 지형, 출몰 몬스터, 학습 단서 확인',
              '• 공격, 싸우기    : 현재 방에 있는 데이터 요괴와 전투 시작',
              '• 상태, 정보      : 레벨, 직업, 체력(HP), 공격력, 경험치(EXP), 위치 확인',
              '• 가방, 인벤토리  : 소지한 아이템 및 보상 확인',
              '• 직업, 전직      : 직업 목록 및 특성 확인',
              '• 공유, QR, 링크  : [서버리스 공유] QR코드 및 웹 링크 복사창 열기',
              '• 관리자, 에디터  : [그래픽 편집기] 맵, 몬스터, 직업, 아이템, 퀴즈 GUI 열기',
              '• 리포트, 결과    : 화이트해커 학습 진단서 터미널 출력',
              '• CSV, csv        : 학습 이력 데이터 CSV 파일 다운로드',
              '• JSON, json      : 학습 진단 JSON 데이터 클립보드 복사',
              '• 다운, JPG       : 명예 수사관 결과표 JPG 이미지 다운로드',
              '• 리셋, 재시작    : 처음부터 게임 다시 시작'
            ]
          }
        }
      ]);
      return;
    }

    // 2. SHARE / QR CODE & LINK MODAL
    if (cmd === '공유' || lowerCmd === 'share' || cmd === 'qr' || lowerCmd === 'qr' || cmd === '링크' || cmd === '코드' || lowerCmd === 'code') {
      setEditorInitialTab('share');
      setIsEditorOpen(true);
      soundFx.playSuccess();
      addDirectLine('system', '▶ [QR / 링크 공유] 백엔드리스 QR코드 및 공유 링크 생성 창을 열었습니다.');
      return;
    }

    // 3. GRAPHICAL WORLD EDITOR / 관리자 / 에디터
    if (cmd === '관리자' || lowerCmd === 'admin' || cmd === '교사' || cmd === '에디터' || lowerCmd === 'editor' || cmd === '월드' || cmd === '편집') {
      setEditorInitialTab('map');
      setIsEditorOpen(true);
      soundFx.playSuccess();
      addDirectLine('system', '▶ [월드 편집기] 맵, 몬스터, 직업, 아이템, 퀴즈를 그래픽으로 수정하는 창을 열었습니다.');
      return;
    }

    // 4. JOB LIST & SELECTION
    if (cmd === '직업' || cmd === '전직' || lowerCmd === 'job' || lowerCmd === 'jobs') {
      const jobs = Object.values(worldData.jobs || DEFAULT_CUSTOM_WORLD.jobs) as RPGJob[];
      const jobLines = jobs.map(
        (j, i) => `[${i + 1}] ${j.icon} ${j.name} (${j.title}) : HP ${j.baseHp} | ATK ${j.baseAttack} | 특성: ${j.perkName}`
      );

      enqueueLines([
        {
          type: 'box',
          text: '',
          instant: true,
          boxData: {
            title: '[데이터 수사관 직업 목록]',
            badge: 'Jobs',
            variant: 'status',
            lines: [
              session ? `현재 나의 직업: [${session.stats.jobTitle || '초급 수사관'}]` : '등록 가능한 직업군:',
              '────────────────────────────────────────────────────────',
              ...jobLines,
              '────────────────────────────────────────────────────────',
              '※ 월드 편집기(명령어: 관리자)에서 새로운 직업을 만들거나 스탯을 수정할 수 있습니다.'
            ]
          }
        }
      ]);
      return;
    }

    // 5. STATUS / 상태
    if (cmd === '상태' || lowerCmd === 'status') {
      if (!session) {
        addDirectLine('error', '▶ 현재 등록된 요원 정보가 없습니다. 이름을 먼저 입력하세요.');
        return;
      }
      const loc = worldData.locations[session.stats.locationId] || DEFAULT_CUSTOM_WORLD.locations[session.stats.locationId];
      const locName = loc?.name || session.stats.locationId;
      const totalAttempts = session.totalAttempts;
      const rate = totalAttempts > 0 ? Math.round((session.correctCount / totalAttempts) * 100) : 0;
      enqueueLines([
        {
          type: 'box',
          text: '',
          instant: true,
          boxData: {
            title: '[요원 상태 및 능력치 정보]',
            badge: 'Status',
            variant: 'status',
            lines: [
              `■ 요원 닉네임   : ${session.studentId}`,
              `■ 담당 직업     : ${session.stats.jobTitle || '수사관'} (Lv.${session.stats.level})`,
              `■ 체력 (HP)      : ❤️ ${session.stats.hp} / ${session.stats.maxHp}`,
              `■ 공격력 (ATK)   : 🗡️ ${session.stats.attack}`,
              `■ 경험치 (EXP)   : 🌟 ${session.stats.exp} / ${session.stats.maxExp}`,
              `■ 현재 위치     : 📍 ${locName}`,
              `■ 처치한 요괴   : ⚔️ ${session.clearedMonsters.length}마리`,
              `■ 누적 점수     : ${session.score}점 (정답률: ${rate}%)`
            ]
          }
        }
      ]);
      return;
    }

    // 6. INVENTORY / 가방
    if (cmd === '가방' || cmd === '인벤토리' || lowerCmd === 'inventory' || lowerCmd === 'bag') {
      if (!session) {
        addDirectLine('error', '▶ 요원 정보가 없습니다.');
        return;
      }
      const items = session.stats.inventory;
      enqueueLines([
        {
          type: 'box',
          text: '',
          instant: true,
          boxData: {
            title: '[소지품 가방]',
            badge: 'Inventory',
            variant: 'inventory',
            lines: items.length > 0
              ? items.map((it, i) => `[${i + 1}] 📦 ${it}`)
              : ['(가방이 비어 있습니다. 요괴를 물리치고 보상을 획득하세요!)']
          }
        }
      ]);
      return;
    }

    // 7. LOOK / 봐라
    if (cmd === '봐라' || cmd === '둘러보기' || cmd === '살펴보기' || lowerCmd === 'look') {
      if (!session) {
        addDirectLine('error', '▶ 먼저 이름을 입력하여 로그인하세요.');
        return;
      }
      printLookLocation(session.stats.locationId, session);
      return;
    }

    // 8. MOVEMENT: 동, 서, 남, 북
    if (cmd === '동' || cmd === '서' || cmd === '남' || cmd === '북' || cmd === '동쪽' || cmd === '서쪽' || cmd === '남쪽' || cmd === '북쪽') {
      if (!session) {
        addDirectLine('error', '▶ 먼저 이름을 입력하여 로그인하세요.');
        return;
      }

      const dir = (cmd[0] as Direction);
      const currentLoc = worldData.locations[session.stats.locationId] || DEFAULT_CUSTOM_WORLD.locations[session.stats.locationId];
      const nextLocId = currentLoc?.exits[dir];

      if (!nextLocId) {
        soundFx.playError();
        addDirectLine('error', `▶ ${dir}쪽으로는 길이 막혀 있어 이동할 수 없습니다. ('봐라' 명령어로 길을 확인하세요)`);
        return;
      }

      soundFx.playSuccess();
      const updatedVisited = session.visitedLocations.includes(nextLocId)
        ? session.visitedLocations
        : [...session.visitedLocations, nextLocId];

      const updatedSession: StudentSession = {
        ...session,
        visitedLocations: updatedVisited,
        stats: {
          ...session.stats,
          locationId: nextLocId
        }
      };

      setSession(updatedSession);
      saveSession(updatedSession);

      addDirectLine('system', `▶ [이동] ${dir}쪽으로 발걸음을 옮깁니다...`);
      printLookLocation(nextLocId, updatedSession);
      return;
    }

    // 9. ATTACK / 공격
    if (cmd === '공격' || cmd.startsWith('공격 ') || cmd === '싸우기' || lowerCmd === 'attack') {
      if (!session) {
        addDirectLine('error', '▶ 요원 이름을 먼저 등록하세요.');
        return;
      }
      const currentLoc = worldData.locations[session.stats.locationId] || DEFAULT_CUSTOM_WORLD.locations[session.stats.locationId];
      if (!currentLoc?.monsterId) {
        addDirectLine('system', '▶ 이곳에는 공격할 요괴가 없습니다. 평화로운 지역입니다.');
        return;
      }
      const monsterId = currentLoc.monsterId;
      const monster = monsters[monsterId] || worldData.monsters[monsterId];
      if (session.clearedMonsters.includes(monsterId) || monster?.defeated) {
        addDirectLine('success', '▶ 이곳의 요괴는 이미 처치되었습니다!');
        return;
      }
      triggerBattle(monsterId);
      return;
    }

    // 10. REPORT / 리포트
    if (cmd === '리포트' || cmd === '결과' || cmd === '진단서' || lowerCmd === 'report') {
      if (!session) {
        addDirectLine('error', '▶ 세션 정보가 없습니다. 먼저 게임을 진행해 주세요.');
        return;
      }
      const logs = getLogs(session.studentId);
      const totalAttempts = logs.length;
      const correctAttempts = logs.filter(l => l.isCorrect).length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      const analogLogs = logs.filter(l => l.conceptCategory.includes('아날로그') || l.questionId.includes('ANALOG') || l.questionId.includes('noise') || l.questionId.includes('corrupt'));
      const analogCorrect = analogLogs.filter(l => l.isCorrect).length;
      const analogAcc = analogLogs.length > 0 ? Math.round((analogCorrect / analogLogs.length) * 100) : 100;

      const digitalLogs = logs.filter(l => l.conceptCategory.includes('디지털') || l.questionId.includes('DIGITAL') || l.questionId.includes('bit') || l.questionId.includes('boss'));
      const digitalCorrect = digitalLogs.filter(l => l.isCorrect).length;
      const digitalAcc = digitalLogs.length > 0 ? Math.round((digitalCorrect / digitalLogs.length) * 100) : 100;

      let grade = 'S급 (마스터 데이터 수사관)';
      if (accuracy < 70) grade = 'B급 (수습 데이터 수사관)';
      else if (accuracy < 85) grade = 'A급 (정예 데이터 수사관)';

      const totalMonstersCount = Object.keys(worldData.monsters).length;

      enqueueLines([
        {
          type: 'box',
          text: '',
          instant: true,
          boxData: {
            title: `[${worldData.title} 요원 학습 진단서]`,
            badge: 'Report',
            variant: 'report',
            lines: [
              `■ 요원 식별자   : ${session.studentId} (${session.stats.jobTitle || '수사관'} / Lv.${session.stats.level})`,
              `■ 수사관 등급   : ${grade}`,
              `■ 최종 능력치   : ❤️ 체력 ${session.stats.hp}/${session.stats.maxHp} | 🗡️ 공격력 ${session.stats.attack} | 🌟 EXP ${session.stats.exp}`,
              `■ 던전 정복률   : ${totalMonstersCount}개 중 ${session.clearedMonsters.length}마리 처치 완료`,
              `■ 정답률 / 시도 : ${accuracy}% (${totalAttempts}회 시도 중 ${session.correctCount}회 정답)`,
              '────────────────────────────────────────────────────────',
              '■ [개념별 역량 분석표]',
              `  1. 아날로그 데이터 이해도 : [${'■'.repeat(Math.round(analogAcc / 10))}${'□'.repeat(10 - Math.round(analogAcc / 10))}] ${analogAcc}%`,
              '     - 연속적 물리량 변화(곡선 파형), 외부 잡음(노이즈) 손상 취약성',
              `  2. 디지털 데이터 이해도   : [${'■'.repeat(Math.round(digitalAcc / 10))}${'□'.repeat(10 - Math.round(digitalAcc / 10))}] ${digitalAcc}%`,
              '     - 0과 1 비트 수치화, 무손실 복제, 대용량 저장, 빠른 초고속 전송',
              '────────────────────────────────────────────────────────',
              '■ [교사 및 AI 총평]',
              accuracy >= 85
                ? '  "아날로그의 연속적 특성과 디지털의 무손실/전송 특성을 완벽히 마스터했습니다!"'
                : '  "아날로그의 잡음 취약성과 디지털의 0/1 무손실 복제 원리를 다시 복습해보세요!"'
            ]
          }
        },
        { type: 'prompt', text: '▶ [데이터 내보내기] \'공유\' (QR코드 생성), \'CSV\' (엑셀 파일 다운), \'JSON\' (클립보드 복사), \'다운\' (JPG 이미지)' }
      ]);
      soundFx.playLevelUp();
      return;
    }

    // 11. CSV DOWNLOAD
    if (cmd === 'CSV' || lowerCmd === 'csv') {
      if (!session) {
        addDirectLine('error', '▶ 저장할 학습 데이터가 없습니다.');
        return;
      }
      const ok = downloadCsvLog(session);
      if (ok) {
        soundFx.playSuccess();
        addDirectLine('success', `✔ [CSV 다운로드 완료] '${session.studentId}_RPG_MUD_Log.csv' 파일이 저장되었습니다.`);
      } else {
        addDirectLine('error', '▶ CSV 다운로드에 실패했습니다.');
      }
      return;
    }

    // 12. JSON CLIPBOARD COPY
    if (cmd === 'JSON' || lowerCmd === 'json') {
      if (!session) {
        addDirectLine('error', '▶ 복사할 학습 데이터가 없습니다.');
        return;
      }
      const res = await copyJsonReport(session);
      if (res.success) {
        soundFx.playSuccess();
        addDirectLine('success', '✔ [JSON 복사 완료] 진단 데이터 JSON이 클립보드에 복사되었습니다! (Ctrl+V로 제출 가능)');
      } else {
        addDirectLine('error', '▶ JSON 복사에 실패했습니다.');
      }
      return;
    }

    // 13. JPG IMAGE DOWNLOAD
    if (cmd === '다운' || cmd === '다운로드' || lowerCmd === 'down' || lowerCmd === 'jpg') {
      if (!session) {
        addDirectLine('error', '▶ 다운로드할 요원 정보가 없습니다.');
        return;
      }
      addDirectLine('system', '▶ [다운로드] 고화질 레트로 RPG 결과표 JPG 생성 중...');
      const res = await downloadResultJpg(session, 4);
      if (res.success) {
        soundFx.playSuccess();
        addDirectLine('success', `✔ [JPG 다운로드 완료] '${res.filename}' 저장을 시작했습니다!`);
      } else {
        addDirectLine('error', '▶ JPG 생성에 실패했습니다.');
      }
      return;
    }

    // 14. RESET / 리셋
    if (cmd === '리셋' || cmd === '재시작' || lowerCmd === 'restart' || lowerCmd === 'reset') {
      if (session) {
        clearStudentLogs(session.studentId);
      }
      lineQueueRef.current = [];
      isStreamingRef.current = false;
      setSession(null);
      setPendingPlayerName(null);
      setIsCompleted(false);
      setAttemptCounts({});
      setActiveBattleMonsterId(null);
      setMonsters(worldData.monsters);
      setLines([]);
      ASCII_TITLE.forEach(l => addDirectLine('ascii', l));
      addDirectLine('system', '▶ 데이터 던전 시스템이 초기화되었습니다.');
      addDirectLine('prompt', '▶ [요원 등록] 이름을 입력하세요. (예: 60101_홍길동 또는 김철수)');
      soundFx.playConnectModem();
      return;
    }

    // ----------------------------------------------------
    // LOGIN STATE HANDLING (if not yet registered)
    // ----------------------------------------------------
    if (!session) {
      const stored = getStoredSession();
      if ((cmd === '예' || cmd === '네' || lowerCmd === 'y') && stored) {
        setSession(stored);
        soundFx.playConnectModem();
        addDirectLine('success', `✔ [세션 복구] ${stored.studentId} 요원님, 데이터 던전 수사를 재개합니다.`);
        printLookLocation(stored.stats?.locationId || 'loc_entrance', stored);
        return;
      }

      // Start player registration -> Job Selection prompt
      const studentId = cmd.replace(/\s+/g, '_');
      setPendingPlayerName(studentId);

      const jobList = Object.values(worldData.jobs || DEFAULT_CUSTOM_WORLD.jobs) as RPGJob[];
      const jobChoices = jobList.map(
        (j, i) => ` [${i + 1}] ${j.icon} ${j.name} : HP ${j.baseHp} | ATK ${j.baseAttack} | 특성: ${j.perkName}`
      );

      enqueueLines([
        { type: 'narrative', text: '' },
        { type: 'success', text: `▶ 요원명 [${studentId}] 확인! 직업군을 선택해 주세요:` },
        ...jobChoices.map(jc => ({ type: 'system' as const, text: jc })),
        { type: 'narrative', text: '' },
        { type: 'prompt', text: '▶ 직업 번호(1~4) 또는 직업 이름을 입력하세요 (기본값: 1번 화이트해커):' }
      ]);
      return;
    }

    // Default Fallback
    soundFx.playError();
    addDirectLine('help', `❓ 알 수 없는 명령어입니다: '${cmd}' (명령어 목록을 보려면 '도움말' 또는 '봐라'를 입력하세요)`);
  };

  const handleSaveWorld = (newWorld: CustomWorldData) => {
    saveCustomWorld(newWorld);
    setWorldData(newWorld);
    setMonsters(newWorld.monsters);
    addDirectLine('box', '', true, {
      title: '✔ [월드 데이터 저장 및 즉시 적용 완료]',
      badge: 'Updated',
      variant: 'status',
      lines: [
        `월드명 : ${newWorld.title} (ver ${newWorld.version})`,
        `• 맵 장소     : ${Object.keys(newWorld.locations).length}곳`,
        `• 몬스터     : ${Object.keys(newWorld.monsters).length}마리`,
        `• 직업/아이템 : ${Object.keys(newWorld.jobs || {}).length}직업 / ${Object.keys(newWorld.items || {}).length}아이템`,
        `• 학습 퀴즈   : ${newWorld.gameSteps?.length || 0}문제`,
        '────────────────────────────────────────────────────────',
        '▶ \'공유\' 명령어를 입력하여 친구/학생들에게 QR코드 및 링크를 배포하세요!'
      ]
    });
  };

  const handleResetWorldToDefault = () => {
    const defaults = resetCustomWorldToDefault();
    setWorldData(defaults);
    setMonsters(defaults.monsters);
    addDirectLine('system', '▶ [월드 초기화] 기본 데이터 던전 맵/몬스터/직업/문제로 초기화되었습니다.');
  };

  const handleKeyPressSound = () => {
    soundFx.playKeyClick();
  };

  const promptPrefix = session ? `[${session.studentId}@데이터던전]$ ` : pendingPlayerName ? `[직업선택@MUD]$ ` : `[미등록_요원@MUD]$ `;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white select-none">
      {/* 100% Retro CLI Status Header Bar */}
      <TerminalHeader
        session={session}
        currentStepIndex={0}
        totalSteps={worldData.gameSteps?.length || 6}
        theme={theme}
        soundEnabled={soundEnabled}
        crtEnabled={crtEnabled}
        worldTitle={worldData.title}
        onOpenAdmin={(tab) => {
          setEditorInitialTab(tab || 'map');
          setIsEditorOpen(true);
        }}
      />

      {/* Terminal Screen Stream & Command Prompt */}
      <TerminalScreen
        lines={lines}
        theme={theme}
        crtEnabled={crtEnabled}
        onSendCommand={handleCommand}
        onKeyPressSound={handleKeyPressSound}
        promptPrefix={promptPrefix}
        isCompleted={isCompleted}
        isAdminOpen={isEditorOpen}
      />

      {/* Serverless QR Sharing & World/Monster/Job/Quiz GUI Editor */}
      <WorldEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        worldData={worldData}
        onSaveWorld={handleSaveWorld}
        onResetToDefault={handleResetWorldToDefault}
        initialTab={editorInitialTab}
      />
    </div>
  );
}

