import { DEFAULT_GAME_STEPS } from './gameData';
import { GameStep, LearningLogEntry, StudentSession } from './types';

const LOG_STORAGE_PREFIX = 'mud_data_learning_logs_';
const SESSION_STORAGE_KEY = 'mud_data_current_session';
const CUSTOM_STEPS_STORAGE_KEY = 'mud_custom_game_steps';

export function saveLogEntry(entry: LearningLogEntry): void {
  try {
    const key = `${LOG_STORAGE_PREFIX}${entry.studentId}`;
    const raw = localStorage.getItem(key);
    const logs: LearningLogEntry[] = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save learning log:', err);
  }
}

export function getLogs(studentId: string): LearningLogEntry[] {
  try {
    const key = `${LOG_STORAGE_PREFIX}${studentId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to get logs:', err);
    return [];
  }
}

export function saveSession(session: StudentSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

export function getStoredSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStudentLogs(studentId: string): void {
  try {
    localStorage.removeItem(`${LOG_STORAGE_PREFIX}${studentId}`);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear logs:', err);
  }
}

// --------------------------------------------------------------------
// CSV Export Function
// --------------------------------------------------------------------
export function downloadCsvLog(session: StudentSession): boolean {
  try {
    const logs = getLogs(session.studentId);
    const headers = [
      'Timestamp',
      'Student_ID',
      'Player_Level',
      'Player_HP',
      'Player_EXP',
      'Stage',
      'Stage_Name',
      'Question_ID',
      'Concept_Category',
      'User_Input',
      'Is_Correct',
      'Time_Spent_Seconds',
      'Attempt_Count'
    ];

    const rows = logs.map(l => [
      l.timestamp,
      `"${l.studentId}"`,
      l.playerLevelAfter ?? session.stats.level,
      l.playerHpAfter ?? session.stats.hp,
      l.playerExpAfter ?? session.stats.exp,
      `"${l.stage}"`,
      `"${l.stageName.replace(/"/g, '""')}"`,
      `"${l.questionId}"`,
      `"${l.conceptCategory}"`,
      `"${l.userInput.replace(/"/g, '""')}"`,
      l.isCorrect ? 'TRUE' : 'FALSE',
      l.timeSpentSec,
      l.attemptCount
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `${session.studentId}_RPG_MUD_Log.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to download CSV:', err);
    return false;
  }
}

// --------------------------------------------------------------------
// JSON Export / Clipboard
// --------------------------------------------------------------------
export async function copyJsonReport(session: StudentSession): Promise<{ success: boolean; dataString: string }> {
  try {
    const logs = getLogs(session.studentId);
    const payload = {
      app: '사이버 데이터 탐정 MUD RPG',
      studentId: session.studentId,
      sessionStartedAt: session.startedAt,
      sessionCompletedAt: session.completedAt || null,
      stats: session.stats,
      score: session.score,
      totalAttempts: session.totalAttempts,
      correctCount: session.correctCount,
      clearedMonsters: session.clearedMonsters,
      visitedLocations: session.visitedLocations,
      analogScore: session.analogScore,
      analogTotal: session.analogTotal,
      digitalScore: session.digitalScore,
      digitalTotal: session.digitalTotal,
      learningLogs: logs
    };
    const str = JSON.stringify(payload, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(str);
    }
    return { success: true, dataString: str };
  } catch (err) {
    console.error('Failed to copy JSON:', err);
    return { success: false, dataString: '' };
  }
}

// --------------------------------------------------------------------
// Custom Game Steps (Teacher Tool)
// --------------------------------------------------------------------
export function loadGameSteps(): GameStep[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STEPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load custom steps:', err);
  }
  return DEFAULT_GAME_STEPS;
}

export function saveCustomGameSteps(steps: GameStep[]): void {
  try {
    localStorage.setItem(CUSTOM_STEPS_STORAGE_KEY, JSON.stringify(steps));
  } catch (err) {
    console.error('Failed to save custom steps:', err);
  }
}

export function resetGameStepsToDefault(): GameStep[] {
  try {
    localStorage.removeItem(CUSTOM_STEPS_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset steps:', err);
  }
  return DEFAULT_GAME_STEPS;
}

// --------------------------------------------------------------------
// High-Quality Retro JPG Image Generator (Canvas API)
// --------------------------------------------------------------------
export function downloadResultJpg(
  session: StudentSession,
  totalStepsCount: number
): Promise<{ success: boolean; filename: string }> {
  return new Promise((resolve) => {
    try {
      const logs = getLogs(session.studentId);
      const totalAttempts = logs.length;
      const correctAttempts = logs.filter(l => l.isCorrect).length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      const analogLogs = logs.filter(l => l.conceptCategory.includes('아날로그') || l.questionId.includes('ANALOG'));
      const analogCorrect = analogLogs.filter(l => l.isCorrect).length;
      const analogAcc = analogLogs.length > 0 ? Math.round((analogCorrect / analogLogs.length) * 100) : 100;

      const digitalLogs = logs.filter(l => l.conceptCategory.includes('디지털') || l.questionId.includes('DIGITAL'));
      const digitalCorrect = digitalLogs.filter(l => l.isCorrect).length;
      const digitalAcc = digitalLogs.length > 0 ? Math.round((digitalCorrect / digitalLogs.length) * 100) : 100;

      let grade = 'S급 (마스터 데이터 수사관)';
      if (accuracy < 70) grade = 'B급 (수습 데이터 수사관)';
      else if (accuracy < 85) grade = 'A급 (정예 데이터 수사관)';

      // Setup Canvas
      const width = 1200;
      const height = 1500;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ success: false, filename: '' });
        return;
      }

      // Background - Retro Dark Terminal
      ctx.fillStyle = '#060d08';
      ctx.fillRect(0, 0, width, height);

      // Outer Double Border - Neon Green
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      ctx.strokeStyle = '#008833';
      ctx.lineWidth = 2;
      ctx.strokeRect(42, 42, width - 84, height - 84);

      // Header Banner
      ctx.fillStyle = '#00ff66';
      ctx.font = 'bold 36px monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[ 사이버 데이터 탐정 MUD RPG : 학습 진단서 ]', width / 2, 100);

      ctx.fillStyle = '#88ffaa';
      ctx.font = '22px monospace, sans-serif';
      ctx.fillText('초등학교 6학년 실과 [데이터와 인공지능: 아날로그 vs 디지털]', width / 2, 140);

      // Horizontal Divider
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 170);
      ctx.lineTo(width - 60, 170);
      ctx.stroke();

      // Certificate Section Box
      ctx.fillStyle = '#0a1a0e';
      ctx.fillRect(70, 200, width - 140, 360);
      ctx.strokeStyle = '#00cc55';
      ctx.strokeRect(70, 200, width - 140, 360);

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 32px monospace, sans-serif';
      ctx.fillText('★ 명 예  수 사 관  임 명 장 ★', width / 2, 260);

      ctx.fillStyle = '#e0ffe8';
      ctx.font = '22px monospace, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`수사관 성명 : ${session.studentId} (Lv.${session.stats.level} | 🗡️ ATK ${session.stats.attack})`, 110, 320);
      ctx.fillText(`수사관 등급 : ${grade}`, 110, 360);
      ctx.fillText(`임명 일자   : ${new Date().toLocaleDateString('ko-KR')} ${new Date().toLocaleTimeString('ko-KR')}`, 110, 400);

      ctx.fillStyle = '#a0eebb';
      ctx.font = '18px monospace, sans-serif';
      ctx.fillText('위 학생은 초등 6학년 실과 데이터와 인공지능 단원의 아날로그 및 디지털 데이터', 110, 450);
      ctx.fillText('개념, 연속성, 외부 노이즈 손상 취약성, 0과 1 무손실 복제, 대용량 초고속 전송 등', 110, 480);
      ctx.fillText('던전 요괴를 물리치고 핵심 탐구 미션을 완수하였으므로 본 임명장을 수여합니다.', 110, 510);

      // Official Stamp (Seal)
      ctx.save();
      ctx.strokeStyle = '#ff3344';
      ctx.lineWidth = 4;
      ctx.strokeRect(width - 240, 420, 110, 110);
      ctx.fillStyle = '#ff4455';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('국립데이터', width - 185, 465);
      ctx.fillText('수사본부장', width - 185, 495);
      ctx.restore();

      // Stats Section
      ctx.fillStyle = '#00ff66';
      ctx.font = 'bold 28px monospace, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('■ 수사 및 RPG 전투 종합 성적', 70, 620);

      const maxScore = totalStepsCount * 20;
      const scoreRows = [
        `• 최종 레벨 / 능력치 : Lv.${session.stats.level} (체력: ${session.stats.hp}/${session.stats.maxHp} | 공격력: ${session.stats.attack} | EXP: ${session.stats.exp}/${session.stats.maxExp})`,
        `• 처치한 데이터 요괴 : ${session.clearedMonsters.length}마리 완료`,
        `• 획득 아이템 목록   : ${session.stats.inventory.length > 0 ? session.stats.inventory.join(', ') : '없음'}`,
        `• 문제 정답률 / 시도 : ${accuracy}% (${totalAttempts}회 시도 중 ${session.correctCount}회 정답)`
      ];

      ctx.fillStyle = '#ffffff';
      ctx.font = '22px monospace, sans-serif';
      scoreRows.forEach((row, i) => {
        ctx.fillText(row, 90, 670 + i * 36);
      });

      // Concept Competency Bars
      ctx.fillStyle = '#00ff66';
      ctx.font = 'bold 28px monospace, sans-serif';
      ctx.fillText('■ 개념별 세부 역량 분석표', 70, 840);

      // Bar 1: Analog Data
      ctx.fillStyle = '#a0ffbb';
      ctx.font = '22px monospace, sans-serif';
      ctx.fillText(`1. 아날로그 데이터 이해도 : ${analogAcc}%`, 90, 890);
      ctx.fillStyle = '#112816';
      ctx.fillRect(90, 905, 600, 24);
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(90, 905, (600 * analogAcc) / 100, 24);
      ctx.fillStyle = '#88c999';
      ctx.font = '17px monospace, sans-serif';
      ctx.fillText('   (연속적인 물리량 변화 곡선 표현, 외부 환경 잡음/노이즈 변형 취약성)', 90, 955);

      // Bar 2: Digital Data
      ctx.fillStyle = '#a0ffbb';
      ctx.font = '22px monospace, sans-serif';
      ctx.fillText(`2. 디지털 데이터 이해도   : ${digitalAcc}%`, 90, 1010);
      ctx.fillStyle = '#112816';
      ctx.fillRect(90, 1025, 600, 24);
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(90, 1025, (600 * digitalAcc) / 100, 24);
      ctx.fillStyle = '#88c999';
      ctx.font = '17px monospace, sans-serif';
      ctx.fillText('   (0과 1 비트 이진수 표현, 무손실 복제, 대용량 저장 및 초고속 전송)', 90, 1075);

      // Evaluation Comment Box
      ctx.fillStyle = '#0a1a0e';
      ctx.fillRect(70, 1130, width - 140, 220);
      ctx.strokeStyle = '#008833';
      ctx.strokeRect(70, 1130, width - 140, 220);

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 24px monospace, sans-serif';
      ctx.fillText('■ 수사관 총평 (교사 및 AI 피드백)', 100, 1180);

      ctx.fillStyle = '#ffffff';
      ctx.font = '20px monospace, sans-serif';
      if (accuracy >= 85) {
        ctx.fillText('"아날로그의 연속적 특성과 디지털의 무손실 복제 및 초고속 전송 특성을 완벽히 마스터했습니다."', 100, 1230);
        ctx.fillText('"데이터 던전의 요괴들을 모두 퇴치하고 마스터 데이터 수사관으로 당당히 등극했습니다."', 100, 1270);
      } else {
        ctx.fillText('"아날로그 데이터의 외부 잡음 취약성과 디지털 데이터의 0과 1 무손실 복제 원리를', 100, 1230);
        ctx.fillText(' 추가로 복습하면 더욱 훌륭한 미래 인공지능 데이터 전문가로 성장할 수 있습니다."', 100, 1270);
      }

      // Footer
      ctx.fillStyle = '#00ff66';
      ctx.font = '16px monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('사이버 데이터 탐정 사무소 RPG MUD System | National Cyber Data HQ', width / 2, 1430);

      // Convert to JPG Blob and Download
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ success: false, filename: '' });
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const sanitizedName = session.studentId.replace(/[^a-zA-Z0-9가-힣_]/g, '_');
          const filename = `${sanitizedName}_데이터수사_RPG_학습결과표.jpg`;
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve({ success: true, filename });
        },
        'image/jpeg',
        0.95
      );
    } catch (err) {
      console.error('Error generating JPG:', err);
      resolve({ success: false, filename: '' });
    }
  });
}
