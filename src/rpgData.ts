import { RPGLocation, RPGMonster } from './types';

export const INITIAL_RPG_MONSTERS: { [id: string]: RPGMonster } = {
  m_noise: {
    id: 'm_noise',
    name: '잡음 요괴 (Noise Monster)',
    title: '[숲의 방해꾼] 아날로그 파형을 뒤흔드는 잡음 요괴',
    hp: 40,
    maxHp: 40,
    attack: 15,
    expReward: 35,
    itemReward: '연속 스펙트럼 물약 (HP +40 회복)',
    asciiArt: [
      "      ░▒▓█ [잡음 요괴] █▓▒░",
      "      ( ◣_◢ )  \"치이익~ 지지직!\"",
      "     /|  █  |\\  [아날로그 파형 왜곡 중]",
      "      /     \\   [약점: 아날로그의 잡음 취약성 이해]"
    ],
    dialogue: '"크하하! 자연의 소리와 빛은 내 지지직거리는 노이즈 한 방이면 엉망진창이 되지!"',
    questionId: 'Q3_ANALOG_TRAITS_AND_NOISE',
    questionText: '【잡음 요괴의 공격 시험】 다음 중 아날로그 데이터의 특성으로 올바른 약점은?',
    choices: [
      { key: '1', text: '오직 0과 1로만 저장되어 잡음이 전혀 안 낀다.', isCorrect: false, explanation: '그건 디지털의 특징이다! 크하하 오답이다!' },
      { key: '2', text: '자연의 연속적 변화를 나타내지만, 외부 잡음(노이즈)이나 자석에 쉽게 손상된다.', isCorrect: true, explanation: '크악! 내 본질인 아날로그의 잡음 취약성을 꿰뚫다니!' },
      { key: '3', text: '100만 번 복사해도 100% 원본과 동일하게 유지된다.', isCorrect: false, explanation: '틀렸다! 아날로그는 복사할수록 잡음이 쌓인다!' },
      { key: '4', text: '컴퓨터 하드디스크에만 존재하는 데이터다.', isCorrect: false, explanation: '틀렸다! 아날로그는 자연계의 연속 물리량이다!' }
    ],
    defeated: false
  },
  m_corrupt: {
    id: 'm_corrupt',
    name: '데이터 손상 귀신 (Data Corruption Ghost)',
    title: '[아날로그 미궁의 원혼] 테이프를 늘어뜨리는 손상 귀신',
    hp: 50,
    maxHp: 50,
    attack: 20,
    expReward: 40,
    itemReward: '정밀 바늘 센서 (공격력 +5 영구 증가)',
    asciiArt: [
      "       .---.   [데이터 손상 귀신]",
      "      /     \\  ( ఠ_ఠ ) \"늘어나라 테이프여!\"",
      "     | () () |  ~~~~~ [카세트 테이프 훼손 중]",
      "      \\  _  /   [물리적 마모 및 열화 공격]"
    ],
    dialogue: '"카세트 테이프와 비디오 테이프는 복사하고 재생할수록 화질과 음질이 파괴되지!"',
    questionId: 'Q2_ANALOG_VS_DIGITAL_TOOL',
    questionText: '【손상 귀신의 공격 시험】 수은 온도계처럼 끊어지지 않고 연속적으로 변화하는 물리량을 나타내는 것은?',
    choices: [
      { key: '1', text: '디지털 데이터', isCorrect: false, explanation: '디지털은 숫자로 명확히 끊어지는 값이다!' },
      { key: '2', text: '아날로그 데이터', isCorrect: true, explanation: '크윽! 연속적인 물리량의 본질을 정확히 짚어내다니!' },
      { key: '3', text: '인공지능 신경망', isCorrect: false, explanation: '엉뚱한 답이군! 내 공격을 받아라!' },
      { key: '4', text: '컴퓨터 이진 코드', isCorrect: false, explanation: '이진 코드는 디지털이다!' }
    ],
    defeated: false
  },
  m_bit_glitch: {
    id: 'm_bit_glitch',
    name: '비트 왜곡 악마 (Bit Glitch Fiend)',
    title: '[회로망의 악령] 0과 1을 뒤섞으려는 글리치 악마',
    hp: 60,
    maxHp: 60,
    attack: 20,
    expReward: 45,
    itemReward: '디지털 복제 칩 (무손실 복제 에너지 팩)',
    asciiArt: [
      "      [0] [1] [0]  [비트 왜곡 악마]",
      "     ┌─────────┐   ( ಠ益ಠ ) \"0을 1로 바꿔버리겠다!\"",
      "     │ 0 1 0 1 │   /| ⚡ |\\",
      "     └─────────┘   [디지털 이진 회로 공격]"
    ],
    dialogue: '"컴퓨터의 0과 1은 아무리 복사해도 변하지 않는다고? 내가 왜곡해주마!"',
    questionId: 'Q4_DIGITAL_BINARY_AND_LOSSLESS',
    questionText: '【비트 왜곡 악마의 공격 시험】 컴퓨터가 사용하는 기본 데이터 단위와 디지털 데이터의 복제 특성은?',
    choices: [
      { key: '1', text: '0과 1(비트)로 표현되며 100만 번 복사해도 원본과 완벽히 동일(무손실 복제)하다.', isCorrect: true, explanation: '으아악! 0과 1의 완벽한 무손실 복제 방어벽에 막혔다!' },
      { key: '2', text: '복사할 때마다 화질이 흐려져서 10번만 복사하면 사라진다.', isCorrect: false, explanation: '크하하! 그건 아날로그의 약점이지 디지털이 아니다!' },
      { key: '3', text: '오직 아날로그 바늘로만 표현된다.', isCorrect: false, explanation: '디지털은 숫자로 표현된다!' },
      { key: '4', text: '글자만 복제되고 사진은 복제할 수 없다.', isCorrect: false, explanation: '디지털은 모든 미디어를 0과 1로 복제한다!' }
    ],
    defeated: false
  },
  m_boss: {
    id: 'm_boss',
    name: '혼돈의 데이터 드래곤 (Chaos Data Dragon)',
    title: '[최종 보스] 아날로그와 디지털의 균형을 파괴하려는 거룡',
    hp: 100,
    maxHp: 100,
    attack: 25,
    expReward: 100,
    itemReward: '마스터 데이터 크리스털 (승리의 징표)',
    asciiArt: [
      "             /\\___/\\",
      "            (  o o  )    < [혼돈의 데이터 드래곤] >",
      "            /   *   \\    \"자연의 신호와 컴퓨터의 데이터를",
      "           / /|   |\\ \\    모두 삼켜버리겠다!\"",
      "          (_/ |___| \\_)"
    ],
    dialogue: '"인간 수사관이여! 자연의 아날로그 신호와 컴퓨터의 디지털 데이터가 어떻게 조화를 이루는지 증명해 보아라!"',
    questionId: 'Q6_FINAL_SUMMARY_CASE',
    questionText: '【데이터 드래곤의 최종 심판】 아날로그와 디지털 데이터의 비교 중 [틀린 것(오류)]은?',
    choices: [
      { key: '1', text: '아날로그 데이터는 자연의 빛, 소리, 온도처럼 연속적으로 변화하는 물리량을 나타낸다.', isCorrect: false, explanation: '이것은 진실이다! 아날로그는 연속적 물리량이다.' },
      { key: '2', text: '디지털 데이터는 잡음에 강하고 컴퓨터 연산에 적합하여 AI 분석에 최적이다.', isCorrect: false, explanation: '이것도 진실이다! 디지털은 AI 분석의 근간이다.' },
      { key: '3', text: '아날로그 데이터는 카세트테이프처럼 여러 번 복사해도 음질이나 화질이 절대 나빠지지 않는다.', isCorrect: true, explanation: '정확하다! 아날로그는 복사 시 손상되며, 무손실 복제는 오직 디지털의 특성이다! 내가 졌다!' },
      { key: '4', text: '디지털 데이터는 0과 1로 표현되어 장거리 무선 통신 시에도 손실 없이 전송하기 유리하다.', isCorrect: false, explanation: '이것도 올바른 설명이다!' }
    ],
    defeated: false
  }
};

export const RPG_LOCATIONS: { [id: string]: RPGLocation } = {
  loc_entrance: {
    id: 'loc_entrance',
    name: '데이터 던전 입구 (Data Dungeon Gate)',
    description: '오래된 거대한 데이터 서버 타워 아래, 아날로그의 숲과 디지털 코어로 이어지는 갈림길입니다. 안전한 에너지가 흐르고 있습니다.',
    asciiArt: [
      "          ┌───────────────────────────┐",
      "          │   [ 데이터 던전 입구 ]    │",
      "          │ ◀ 서: 재충전소(치료)     │",
      "          │ ▶ 동: 아날로그의 숲      │",
      "          │ ▲ 북: 디지털 복구 코어   │",
      "          └───────────────────────────┘"
    ],
    exits: {
      동: 'loc_analog_forest',
      서: 'loc_sanctuary',
      북: 'loc_digital_core'
    },
    isSanctuary: true,
    clue: '단서: 동쪽은 아날로그 신호가 흐르는 숲이며, 북쪽은 0과 1의 디지털 복구 코어입니다. 서쪽에는 체력을 회복할 수 있는 안전지대가 있습니다.'
  },
  loc_sanctuary: {
    id: 'loc_sanctuary',
    name: '안전 재충전 구역 (Recharge Sanctuary)',
    description: '따스한 녹색 치유 빛이 감도는 곳입니다. 이곳에서 휴식을 취하면 체력(HP)이 완전히 100% 회복됩니다.',
    asciiArt: [
      "          ╔═══════════════════════════╗",
      "          ║   [ 안전 재충전 구역 ]    ║",
      "          ║  + 치유의 에너지 활성화 + ║",
      "          ║  (HP가 모두 회복됩니다)   ║",
      "          ║   ▶ 동: 던전 입구 복귀    ║",
      "          ╚═══════════════════════════╝"
    ],
    exits: {
      동: 'loc_entrance'
    },
    isSanctuary: true,
    clue: '단서: 위험에 처했거나 HP가 낮아졌을 때 언제든 이곳으로 돌아오세요.'
  },
  loc_analog_forest: {
    id: 'loc_analog_forest',
    name: '아날로그의 숲 (Forest of Continuous Waves)',
    description: '부드러운 곡선 파형의 바람이 불고, 시냇물과 바람 소리가 끊김 없이 이어지는 숲입니다. 어두운 그림자 속에 잡음 요괴가 숨어 있습니다.',
    asciiArt: [
      "          /\\  /\\  /\\  [아날로그의 숲]",
      "         /  \\/  \\/  \\ (연속 곡선 파형 ~~~)",
      "         ~~~~~~~~~~~~ [출몰: 잡음 요괴]",
      "         ◀ 서: 던전 입구 | ▶ 동: 테이프 미궁"
    ],
    exits: {
      서: 'loc_entrance',
      동: 'loc_tape_labyrinth'
    },
    monsterId: 'm_noise',
    clue: '학습 단서: 아날로그 데이터는 자연의 빛, 소리, 기온처럼 끊어지지 않는 연속적인 변화를 그대로 나타냅니다.'
  },
  loc_tape_labyrinth: {
    id: 'loc_tape_labyrinth',
    name: '늘어난 테이프의 미궁 (Tape Labyrinth)',
    description: '오래된 카세트 테이프와 LP 레코드판이 얽혀 있는 미궁입니다. 자석의 영향으로 자기장이 불안정하며 데이터 손상 귀신이 배회합니다.',
    asciiArt: [
      "        [●]═════════[●]  [테이프 미궁]",
      "        ░▒▓ 치이익... ▓▒░ (물리적 손상 위험)",
      "        [출몰: 데이터 손상 귀신]",
      "        ◀ 서: 아날로그 숲 | ▲ 북: 디지털 코어"
    ],
    exits: {
      서: 'loc_analog_forest',
      북: 'loc_digital_core'
    },
    monsterId: 'm_corrupt',
    clue: '학습 단서: 아날로그 매체(테이프, LP)는 복사할 때마다 노이즈가 쌓이고, 자석이나 습기 같은 물리적 환경에 의해 쉽게 변형·손상됩니다.'
  },
  loc_digital_core: {
    id: 'loc_digital_core',
    name: '디지털 복구 코어 (Digital Bit Core)',
    description: '수많은 0과 1의 빛기둥이 솟아오르는 미래형 연산 룸입니다. 완벽한 무손실 복제 회로가 작동 중이나 비트 왜곡 악마가 침입했습니다.',
    asciiArt: [
      "        [0] 1 [0] 1 [0] [디지털 복구 코어]",
      "        │█│ │█│ │█│ │█│ (0과 1 이진수 회로)",
      "        [출몰: 비트 왜곡 악마]",
      "        ▼ 남: 던전 입구 | ▲ 북: 마스터 제어실"
    ],
    exits: {
      남: 'loc_entrance',
      북: 'loc_master_chamber',
      동: 'loc_tape_labyrinth'
    },
    monsterId: 'm_bit_glitch',
    clue: '학습 단서: 디지털 데이터는 정보를 0과 1(비트)로 끊어서 표현하므로, 100만 번을 복사해도 100% 원본과 동일한 무손실 복제가 가능합니다.'
  },
  loc_master_chamber: {
    id: 'loc_master_chamber',
    name: '마스터 메인프레임 제어실 (Master Mainframe)',
    description: '모든 데이터가 집결되는 최상층 제어실입니다. 거대한 혼돈의 데이터 드래곤이 중앙 서버를 가로막고 마지막 진단을 시험하고 있습니다.',
    asciiArt: [
      "        ╔═════════════════════════════════╗",
      "        ║    [ 마스터 메인프레임 ]        ║",
      "        ║   최종 결전: 혼돈의 데이터룡    ║",
      "        ║   ▼ 남: 디지털 복구 코어        ║",
      "        ╚═════════════════════════════════╝"
    ],
    exits: {
      남: 'loc_digital_core'
    },
    monsterId: 'm_boss',
    clue: '학습 단서: 아날로그의 연속적 자연 신호를 센서로 수집하여 디지털 데이터(0과 1)로 변환해 처리하는 것이 현대 AI 기술의 핵심입니다.'
  }
};
