import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  HelpCircle,
  Layers,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { GameStep, QuestionChoice } from '../types';

interface TeacherAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameSteps: GameStep[];
  onSave: (steps: GameStep[]) => void;
  onResetToDefault: () => void;
}

export const TeacherAdminModal: React.FC<TeacherAdminModalProps> = ({
  isOpen,
  onClose,
  gameSteps,
  onSave,
  onResetToDefault
}) => {
  const [steps, setSteps] = useState<GameStep[]>(() => JSON.parse(JSON.stringify(gameSteps)));
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Synchronize when opening
  React.useEffect(() => {
    if (isOpen) {
      setSteps(JSON.parse(JSON.stringify(gameSteps)));
      setSelectedIdx(0);
      setSaveSuccessMsg(null);
    }
  }, [isOpen, gameSteps]);

  if (!isOpen) return null;

  const currentStep = steps[selectedIdx] || steps[0];

  const handleFieldChange = (field: keyof GameStep, value: any) => {
    const updated = [...steps];
    updated[selectedIdx] = {
      ...updated[selectedIdx],
      [field]: value
    };
    setSteps(updated);
  };

  const handleStoryChange = (textValue: string) => {
    const lines = textValue.split('\n');
    handleFieldChange('story', lines);
  };

  const handleChoiceChange = (choiceIndex: number, newText: string) => {
    const updated = [...steps];
    const choices = [...(updated[selectedIdx].choices || [])];
    if (choices[choiceIndex]) {
      choices[choiceIndex] = {
        ...choices[choiceIndex],
        text: newText
      };
      updated[selectedIdx].choices = choices;
      setSteps(updated);
    }
  };

  const handleSetCorrectChoice = (choiceIndex: number) => {
    const updated = [...steps];
    const choices = (updated[selectedIdx].choices || []).map((c, i) => ({
      ...c,
      isCorrect: i === choiceIndex
    }));
    updated[selectedIdx].choices = choices;
    setSteps(updated);
  };

  const handleAddQuestion = () => {
    if (steps.length >= 10) {
      alert('⚠️ 문제는 최대 10문제까지만 추가할 수 있습니다.');
      return;
    }

    const newNumber = steps.length + 1;
    const newStep: GameStep = {
      id: `Q${newNumber}_CUSTOM_${Date.now().toString().slice(-4)}`,
      stageId: Math.min(4, Math.ceil(newNumber / 2.5)),
      stageName: `${Math.min(4, Math.ceil(newNumber / 2.5))}단계: 맞춤 데이터 수사`,
      conceptCategory: '종합응용',
      title: `[사건 #${String(newNumber).padStart(2, '0')}] 새로운 데이터 탐구 과제`,
      story: [
        `▶ [SYSTEM] 새로운 수사 데이터 단서가 발견되었습니다.`,
        `▶ 문제를 주의 깊게 읽고 올바른 정답을 선택해 주세요.`,
        ``,
        `【질문】 다음 중 올바른 설명은 무엇일까요?`,
        ` [1] 보기 1번 설명`,
        ` [2] 보기 2번 설명`,
        ` [3] 보기 3번 설명`,
        ` [4] 보기 4번 설명`
      ],
      type: 'choice',
      choices: [
        { key: '1', text: '보기 1번 내용', isCorrect: false, explanation: '1번은 오답입니다.' },
        { key: '2', text: '보기 2번 내용', isCorrect: true, explanation: '정답입니다! 훌륭합니다.' },
        { key: '3', text: '보기 3번 내용', isCorrect: false, explanation: '3번은 오답입니다.' },
        { key: '4', text: '보기 4번 내용', isCorrect: false, explanation: '4번은 오답입니다.' }
      ],
      explanationOnCorrect: [
        `✔ [수사 성공] 정답입니다! 핵심 개념을 올바르게 이해하셨습니다.`
      ],
      hint: '교과서 내용을 잘 떠올려 보세요!'
    };

    const newSteps = [...steps, newStep];
    setSteps(newSteps);
    setSelectedIdx(newSteps.length - 1);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (steps.length <= 1) {
      alert('⚠️ 최소 1개 이상의 문제는 유지되어야 합니다.');
      return;
    }
    if (confirm(`'${steps[idx].title}' 문제를 정말로 삭제하시겠습니까?`)) {
      const newSteps = steps.filter((_, i) => i !== idx);
      setSteps(newSteps);
      setSelectedIdx(Math.max(0, idx - 1));
    }
  };

  const handleSaveAndApply = () => {
    onSave(steps);
    setSaveSuccessMsg('✔ 교사용 문제 데이터가 성공적으로 저장되어 게임에 즉시 적용되었습니다!');
    setTimeout(() => {
      setSaveSuccessMsg(null);
      onClose();
    }, 900);
  };

  const handleReset = () => {
    if (confirm('교과서 기본 6개 문제로 모두 초기화하시겠습니까?')) {
      onResetToDefault();
      onClose();
    }
  };

  const correctChoiceIndex = (currentStep.choices || []).findIndex(c => c.isCorrect);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-text"
      onClick={e => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-5xl h-[90vh] bg-[#0e1626] border-2 border-emerald-500/60 rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-100 font-sans select-text"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#09101c] border-b border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  교사용 문제 관리 툴 (Admin Editor)
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  현재 {steps.length} / 최대 10문제
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Main Content (Split Sidebar & Form) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Question Tabs List */}
          <div className="w-56 sm:w-64 border-r border-neutral-800 bg-[#09101c]/80 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                문제 목록 ({steps.length}/10)
              </span>
              <button
                onClick={handleAddQuestion}
                disabled={steps.length >= 10}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> 추가
              </button>
            </div>

            {/* List items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {steps.map((s, idx) => {
                const isSelected = idx === selectedIdx;
                return (
                  <button
                    key={s.id || idx}
                    onClick={() => setSelectedIdx(idx)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs sm:text-sm transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300 font-bold shadow-sm'
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
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}

              {steps.length >= 10 && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>최대 10문제까지만 추가할 수 있습니다.</span>
                </div>
              )}
            </div>

            {/* Bottom Quick Action */}
            <div className="p-2.5 border-t border-neutral-800 bg-[#070d17]">
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 text-xs py-2 text-neutral-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                기본 문제로 초기화
              </button>
            </div>
          </div>

          {/* Right Column: Active Question Form */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#0b1320]">
            
            {/* Top Bar inside Form */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs">
                  {selectedIdx + 1}번 수사 문제 편집 중
                </span>
                <span className="text-xs text-neutral-400">
                  (ID: {currentStep.id})
                </span>
              </div>

              {steps.length > 1 && (
                <button
                  onClick={() => handleDeleteQuestion(selectedIdx)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 text-red-400 hover:bg-red-500/20 rounded border border-red-500/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  이 문제 삭제
                </button>
              )}
            </div>

            {/* Row 1: Stage & Title */}
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
                    handleFieldChange('stageName', val);
                    const match = val.match(/^(\d+)/);
                    if (match) {
                      handleFieldChange('stageId', Number(match[1]));
                    }
                  }}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
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
                  onChange={e => handleFieldChange('title', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
                  placeholder="예: [사건 #01] 데이터 연구소의 비밀 금고와 정의"
                />
              </div>
            </div>

            {/* Row 2: Scenario / Story Content */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center justify-between">
                <span>사건 시나리오 & 본문 지문 내용 (줄바꿈 가능)</span>
                <span className="text-[11px] text-neutral-400 font-normal">
                  (터미널 화면에 순차적으로 출력될 내용입니다)
                </span>
              </label>
              <textarea
                rows={5}
                value={currentStep.story.join('\n')}
                onChange={e => handleStoryChange(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs sm:text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed resize-y"
                placeholder="지문 내용을 입력하세요..."
              />
            </div>

            {/* Row 3: 4 Choices & Answer Selection */}
            <div className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  4지선다 보기 및 정답 지정 (라디오 버튼 클릭)
                </span>
                <span className="text-xs text-amber-300 font-medium">
                  ※ 정답인 보기에 체크하세요 (현재 정답: {correctChoiceIndex >= 0 ? `${correctChoiceIndex + 1}번` : '미지정'})
                </span>
              </div>

              <div className="space-y-2.5">
                {(currentStep.choices || []).map((choice, cIdx) => (
                  <div
                    key={cIdx}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                      choice.isCorrect
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="radio"
                        name={`correct_choice_${selectedIdx}`}
                        checked={choice.isCorrect}
                        onChange={() => handleSetCorrectChoice(cIdx)}
                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0 bg-neutral-900 cursor-pointer accent-emerald-500"
                      />
                      <span className={`font-bold text-xs sm:text-sm px-2 py-0.5 rounded ${
                        choice.isCorrect ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'
                      }`}>
                        [{cIdx + 1}번]
                      </span>
                    </label>

                    <input
                      type="text"
                      value={choice.text}
                      onChange={e => handleChoiceChange(cIdx, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-neutral-900/90 border border-neutral-700 rounded text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                      placeholder={`보기 ${cIdx + 1}번 내용을 입력하세요`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Row 4: Explanation on Correct & Hint */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  정답 시 해설 문구
                </label>
                <textarea
                  rows={3}
                  value={currentStep.explanationOnCorrect.join('\n')}
                  onChange={e => handleFieldChange('explanationOnCorrect', e.target.value.split('\n'))}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 resize-none font-mono"
                  placeholder="학생이 정답을 맞혔을 때 출력될 해설..."
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
                  onChange={e => handleFieldChange('hint', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 resize-none font-mono"
                  placeholder="학생이 'HINT' 명령어를 입력했을 때 보여줄 힌트..."
                />
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-5 py-3.5 bg-[#09101c] border-t border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
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
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs sm:text-sm font-medium transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSaveAndApply}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
            >
              <Save className="w-4 h-4" />
              저장하고 게임에 즉시 적용
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
