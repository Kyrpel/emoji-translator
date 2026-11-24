// Riddle topics. Shared by the page (the slips above the field) and the
// server (validation, the judge's context, link previews).
//   label        on the slip the creator taps
//   about(w)     finishes "It's about …" for the guesser. w.poss is "Maria’s" or "their",
//                w.is is "Maria is" or "they are"
//   placeholder  an example sentence for the field

export const TOPICS = [
  {
    id: 'ex',
    label: 'My ex',
    about: (w) => `${w.poss} ex`,
    placeholder: 'My ex still has my hoodie and my Netflix password',
  },
  {
    id: 'weekend',
    label: 'My weekend',
    about: (w) => `${w.poss} weekend`,
    placeholder: 'I slept until 2pm and ate cereal for dinner',
  },
  {
    id: 'job',
    label: 'My job, honestly',
    about: (w) => `${w.poss} job`,
    placeholder: 'I pretend to type when my boss walks past',
  },
  {
    id: 'decision',
    label: 'My worst decision',
    about: (w) => `${w.poss} worst decision`,
    placeholder: 'I cut my own fringe at 3am',
  },
  {
    id: 'love',
    label: 'My love life',
    about: (w) => `${w.poss} love life`,
    placeholder: 'I fell for someone because they had a dog',
  },
  {
    id: 'now',
    label: 'Right now',
    about: (w) => `what ${w.is} doing right now`,
    placeholder: 'I am hiding in the bathroom at a wedding',
  },
  {
    id: 'secret',
    label: 'A secret',
    about: () => 'a secret',
    placeholder: 'I still sleep with my childhood teddy bear',
  },
  {
    id: 'movie',
    label: 'A movie',
    about: () => 'a movie',
    placeholder: 'The Lion King',
  },
];

export const topicById = (id) => TOPICS.find((t) => t.id === id) || null;

// "It's about Maria’s ex" / "It's about their ex"
export const topicHint = (topicId, name) => {
  const topic = topicById(topicId);
  if (!topic) return '';
  const w = name ? { poss: `${name}’s`, is: `${name} is` } : { poss: 'their', is: 'they are' };
  return `It’s about ${topic.about(w)}`;
};
