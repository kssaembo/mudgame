import React, { useEffect, useRef, useState } from 'react';
import { ColorTheme, TerminalLine } from '../types';

interface TerminalScreenProps {
  lines: TerminalLine[];
  theme: ColorTheme;
  crtEnabled: boolean;
  onSendCommand: (cmd: string) => void;
  onKeyPressSound: () => void;
  promptPrefix: string;
  isCompleted: boolean;
  isAdminOpen?: boolean;
}

export const TerminalScreen: React.FC<TerminalScreenProps> = ({
  lines,
  theme,
  crtEnabled,
  onSendCommand,
  onKeyPressSound,
  promptPrefix,
  isCompleted,
  isAdminOpen = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new lines
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // Keep focus on terminal input only when clicking the terminal background (and never when modal/admin is open)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (isAdminOpen) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Do not steal focus if clicking any form control, button, or modal dialog
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON' ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select') ||
        target.closest('button') ||
        target.closest('[role="dialog"]') ||
        target.closest('.fixed')
      ) {
        return;
      }

      inputRef.current?.focus();
    };

    if (!isAdminOpen) {
      inputRef.current?.focus();
    }

    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [isAdminOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyPressSound();

    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed.length > 0) {
        setHistory(prev => [...prev, trimmed]);
        setHistoryIndex(-1);
        onSendCommand(trimmed);
        setInputValue('');
      } else {
        onSendCommand('');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputValue(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (history.length === 0 || historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setInputValue('');
      } else {
        setHistoryIndex(nextIndex);
        setInputValue(history[nextIndex]);
      }
    }
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'amber':
        return {
          bg: 'bg-[#0f0c05]',
          text: 'text-[#ffb000]',
          promptColor: 'text-[#ffcc33]',
          glow: 'drop-shadow-[0_0_6px_rgba(255,176,0,0.45)]',
          borderColor: 'border-[#ffb000]',
          borderSoft: 'border-[#ffb000]/40',
          boxBg: 'bg-[#ffb000]/5',
          cursorColor: 'bg-[#ffb000]',
          selectionColor: 'selection:bg-[#ffb000]/30 selection:text-[#ffea80]'
        };
      case 'blue':
        return {
          bg: 'bg-[#00081a]',
          text: 'text-[#00ffff]',
          promptColor: 'text-[#80ffff]',
          glow: 'drop-shadow-[0_0_6px_rgba(0,255,255,0.45)]',
          borderColor: 'border-[#00ffff]',
          borderSoft: 'border-[#00ffff]/40',
          boxBg: 'bg-[#00ffff]/5',
          cursorColor: 'bg-[#00ffff]',
          selectionColor: 'selection:bg-[#00ffff]/30 selection:text-[#ffffff]'
        };
      case 'white':
        return {
          bg: 'bg-[#0a0a0a]',
          text: 'text-[#e6e6e6]',
          promptColor: 'text-[#ffffff]',
          glow: 'drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]',
          borderColor: 'border-[#e6e6e6]',
          borderSoft: 'border-[#e6e6e6]/40',
          boxBg: 'bg-[#ffffff]/5',
          cursorColor: 'bg-[#ffffff]',
          selectionColor: 'selection:bg-[#ffffff]/30 selection:text-[#ffffff]'
        };
      case 'green':
      default:
        return {
          bg: 'bg-[#050c06]',
          text: 'text-[#00ff66]',
          promptColor: 'text-[#55ff88]',
          glow: 'drop-shadow-[0_0_6px_rgba(0,255,102,0.45)]',
          borderColor: 'border-[#00ff66]',
          borderSoft: 'border-[#00ff66]/40',
          boxBg: 'bg-[#00ff66]/5',
          cursorColor: 'bg-[#00ff66]',
          selectionColor: 'selection:bg-[#00ff66]/30 selection:text-[#caffd8]'
        };
    }
  };

  const currentTheme = getThemeStyles();

  const renderLine = (line: TerminalLine) => {
    // ----------------------------------------------------
    // Perfect Rectangular Box Line Rendering (No ASCII misalignment)
    // ----------------------------------------------------
    if (line.type === 'box' && line.boxData) {
      const { title, badge, lines: boxLines, variant } = line.boxData;
      let headerColor = currentTheme.text;
      let borderColor = currentTheme.borderSoft;
      let titleBg = 'bg-black/80';

      if (variant === 'help') {
        headerColor = 'text-yellow-300';
        borderColor = 'border-yellow-400/50';
      } else if (variant === 'status') {
        headerColor = currentTheme.text;
        borderColor = currentTheme.borderSoft;
      } else if (variant === 'report') {
        headerColor = 'text-emerald-300';
        borderColor = 'border-emerald-400/60';
      } else if (variant === 'certificate') {
        headerColor = 'text-yellow-300';
        borderColor = 'border-yellow-400/80';
      }

      return (
        <div
          key={line.id}
          className={`my-3 relative w-full max-w-3xl border-2 ${borderColor} ${currentTheme.boxBg} rounded-md p-3 sm:p-4 font-mono shadow-lg`}
        >
          {/* Box Header Badge centered or pinned */}
          {title && (
            <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-black border border-current text-xs sm:text-sm font-bold flex items-center gap-2">
              <span className={headerColor}>{title}</span>
              {badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white font-normal">
                  {badge}
                </span>
              )}
            </div>
          )}

          {/* Box Inner Lines */}
          <div className="space-y-1 pt-1 text-xs sm:text-sm leading-relaxed">
            {boxLines.map((content, idx) => {
              const isDivider = content.startsWith('──') || content.startsWith('══') || content === '---';
              if (isDivider) {
                return (
                  <div key={idx} className="my-1.5 border-t border-current/25" />
                );
              }
              return (
                <div
                  key={idx}
                  className={`break-words tracking-tight ${
                    content.includes('★') ? 'text-yellow-300 font-bold text-center py-1' :
                    content.includes('✔') ? 'text-emerald-300 font-bold' :
                    content.includes('■') ? 'text-white font-semibold' : ''
                  }`}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    let colorClass = currentTheme.text;
    let extraClass = '';

    if (line.type === 'user') {
      colorClass = 'text-white font-bold';
    } else if (line.type === 'success') {
      colorClass = theme === 'amber' ? 'text-[#ffe57f] font-bold' : 'text-[#7dffb3] font-bold';
    } else if (line.type === 'error') {
      colorClass = 'text-[#ff5555] font-bold';
    } else if (line.type === 'ascii') {
      colorClass = `${currentTheme.text} font-mono leading-tight whitespace-pre overflow-x-auto`;
    } else if (line.type === 'report') {
      colorClass = theme === 'blue' ? 'text-[#a6ffff]' : theme === 'amber' ? 'text-[#ffdf80]' : 'text-[#a3ffcc]';
      extraClass = 'font-mono whitespace-pre';
    } else if (line.type === 'help') {
      colorClass = 'text-[#ffd700] opacity-95';
    } else if (line.highlight) {
      colorClass = 'text-yellow-300 font-semibold';
    }

    return (
      <div
        key={line.id}
        className={`leading-relaxed tracking-normal font-mono break-words ${colorClass} ${extraClass}`}
      >
        {line.text === '' ? '\u00A0' : line.text}
      </div>
    );
  };

  return (
    <div
      id="terminal-container"
      ref={containerRef}
      className={`relative flex-1 w-full overflow-y-auto p-3 sm:p-6 font-mono text-sm sm:text-base ${currentTheme.bg} ${currentTheme.selectionColor} ${currentTheme.glow} transition-colors duration-200`}
    >
      {/* CRT Scanline Overlay */}
      {crtEnabled && (
        <div
          id="crt-overlay"
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-20 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.5)_95%)] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px]"
        />
      )}

      {/* Terminal Output History */}
      <div className="space-y-1.5 min-h-[calc(100vh-140px)] flex flex-col justify-end">
        <div className="space-y-1 max-w-4xl">
          {lines.map(renderLine)}
        </div>

        {/* Active Command Input Line */}
        <div
          id="command-prompt-area"
          className="pt-3 pb-6 flex items-center flex-wrap gap-2 text-sm sm:text-base font-bold max-w-4xl"
        >
          <span className={`${currentTheme.promptColor} whitespace-nowrap select-none`}>
            {promptPrefix}
          </span>
          <div className="relative flex-1 min-w-[220px] flex items-center">
            <input
              id="terminal-cli-input"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              aria-label="터미널 명령어 입력창"
              className="w-full bg-transparent outline-none border-none text-white font-mono placeholder:text-neutral-500 pr-6"
              placeholder={isCompleted ? "한글 명령어를 입력하세요 (리포트, CSV, JSON, 다운, 리셋)" : "한글 명령어(동, 서, 남, 북, 봐라, 공격, 상태, 가방)나 선택 번호를 입력하고 Enter..."}
            />
            {/* Blinking block cursor */}
            <span
              aria-hidden="true"
              className={`inline-block w-2.5 h-4 -ml-4 animate-[pulse_0.8s_infinite] ${currentTheme.cursorColor}`}
            />
          </div>
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
