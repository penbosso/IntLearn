export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    type: 'quiz_score';
    score: number;
  };
};

const badgeDefinitions: Badge[] = [
  {
    id: 'topic_novice',
    name: 'Topic Novice',
    description: 'Scored 70% or higher on a quiz for the first time.',
    icon: '🎓',
    criteria: {
      type: 'quiz_score',
      score: 70,
    },
  },
  {
    id: 'topic_pro',
    name: 'Topic Pro',
    description: 'Scored 90% or higher on a quiz.',
    icon: '🌟',
    criteria: {
      type: 'quiz_score',
      score: 90,
    },
  },
  {
    id: 'topic_master',
    name: 'Topic Master',
    description: 'Scored a perfect 100% on a quiz!',
    icon: '🏆',
    criteria: {
      type: 'quiz_score',
      score: 100,
    },
  },
];

export function getBadgeDefinitions(): Badge[] {
  return badgeDefinitions;
}
