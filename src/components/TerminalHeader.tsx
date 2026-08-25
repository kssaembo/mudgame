import React from 'react';
import { ColorTheme, StudentSession } from '../types';
import { RPG_LOCATIONS } from '../rpgData';

interface TerminalHeaderProps {
  session: StudentSession | null;
  currentStepIndex: number;
  totalSteps: number;
  theme: ColorTheme;
  soundEnabled: boolean;
  crtEnabled: boolean;
  onOpenAdmin: (tab?: 'share' | 'map' | 'monsters' | 'jobs' | 'items' | 'quizzes') => void;
  worldTitle?: string;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  session,
  currentStepIndex,
  totalSteps,
  theme,
  soundEnabled,
  crtEnabled,
  onOpenAdmin,
  worldTitle
}) => {
  const getThemeClass = () => {
    switch (theme) {
      case 'amber':
        return 'border-[#ffb000]/40 text-[#ffb000] bg-[#1a1400]/95';
      case 'blue':
        return 'border-[#00ffff]/40 text-[#00ffff] bg-[#001133]/95';
      case 'white':
        return 'border-[#e0e0e0]/40 text-[#e0e0e0] bg-[#141414]/95';
      case 'green':
      default:
        return 'border-[#00ff66]/40 text-[#00ff66] bg-[#051408]/95';
    }
  };

  const studentDisplay = session?.studentId || '미등록 요원';
  const jobDisplay = session?.stats?.jobTitle || '';
  const level = session?.stats?.level ?? 1;
  const hp = session?.stats?.hp ?? 100;
  const maxHp = session?.stats?.maxHp ?? 100;
  const attack = session?.stats?.attack ?? 15;
  const exp = session?.stats?.exp ?? 0;
  const maxExp = session?.stats?.maxExp ?? 100;
  const locName = session ? (RPG_LOCATIONS[session.stats.locationId]?.name.split(' (')[0] || '데이터 던전 입구') : '데이터 던전 입구';

  return (
    <header
      id="terminal-header-bar"
      className={`w-full border-b px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm select-none tracking-tight flex flex-col gap-1 backdrop-blur-md z-30 transition-colors duration-200 ${getThemeClass()}`}
    >
      {/* 1st Row: Specification Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-xs sm:text-sm">
          <span className="font-bold flex items-center gap-1 text-emerald-400">
            <span className="inline-block w-2 h-2 rounded-full animate-ping bg-emerald-400" />
            [요원: <strong className="text-white underline">{studentDisplay}</strong>
            {jobDisplay && <span className="text-xs text-sky-300 ml-1">({jobDisplay})</span>}
          </span>
          <span className="opacity-40">│</span>
          <span>레벨: <strong className="text-yellow-300">Lv.{level}</strong></span>
          <span className="opacity-40">│</span>
          <span>체력: <strong className="text-red-400 font-bold">❤️ {hp}/{maxHp}</strong></span>
          <span className="opacity-40">│</span>
          <span>공격력: <strong className="text-cyan-300">🗡️ {attack}</strong></span>
          <span className="opacity-40">│</span>
          <span>경험치: <strong className="text-amber-300">🌟 {exp}/{maxExp}</strong></span>
          <span className="opacity-40">│</span>
          <span>위치: <strong className="text-white font-semibold">{locName}</strong>]</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] sm:text-xs opacity-95">
          <button
            onClick={() => onOpenAdmin('share')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 border border-sky-500/40 font-semibold cursor-pointer transition-colors"
            title="QR코드 및 링크 복사로 다른 사람과 게임 주고받기"
          >
            📱 QR / 링크 공유
          </button>

          <button
            onClick={() => onOpenAdmin('map')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 font-semibold cursor-pointer transition-colors"
            title="맵, 몬스터, 직업, 퀴즈, 아이템 그래픽 편집기 열기 (명령어: 관리자)"
          >
            ⚙️ 월드 편집기
          </button>
        </div>
      </div>

      {/* 2nd Row: Exact Korean Guide Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1 border-t border-current/20 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold px-2 py-0.5 rounded bg-white/10 text-[11px] sm:text-xs text-yellow-300">
            [기본 명령어: 동, 서, 남, 북 | 봐라 | 공격 | 상태 | 가방 | 도움말 | 리포트 | 공유 | 관리자 | CSV | 다운]
          </span>
        </div>

        <div className="text-[11px] sm:text-xs opacity-80 text-emerald-300 truncate max-w-xs sm:max-w-md">
          {worldTitle ? `🗺️ [${worldTitle}]` : '※ 100% 한글 명령어로 이동 및 전투 수행'}
        </div>
      </div>
    </header>
  );
};

