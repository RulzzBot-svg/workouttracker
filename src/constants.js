export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const CATEGORIES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];

export const CATEGORY_COLORS = {
  Chest:     { bg: '#fde8e8', border: '#f9b8b8', badge: '#e05a5a' },
  Back:      { bg: '#e8f0fd', border: '#b8cef9', badge: '#4a7ce0' },
  Legs:      { bg: '#e8fde8', border: '#b8f9b8', badge: '#3daa3d' },
  Shoulders: { bg: '#fdf4e8', border: '#f9ddb8', badge: '#d97a2e' },
  Arms:      { bg: '#f4e8fd', border: '#d8b8f9', badge: '#8c3de0' },
  Core:      { bg: '#e8fdf4', border: '#b8f9d8', badge: '#2eb88a' },
  Cardio:    { bg: '#fef9e8', border: '#f9edb8', badge: '#c9a520' },
  Other:     { bg: '#f3f3f3', border: '#d4d4d4', badge: '#777777' },
};

export const EXERCISE_LIST = [
  // ── Chest ──
  { name: 'Bench Press',             category: 'Chest' },
  { name: 'Incline Bench Press',     category: 'Chest' },
  { name: 'Decline Bench Press',     category: 'Chest' },
  { name: 'Dumbbell Flyes',          category: 'Chest' },
  { name: 'Cable Flyes',             category: 'Chest' },
  { name: 'Push-ups',                category: 'Chest' },
  { name: 'Chest Dips',              category: 'Chest' },
  { name: 'Pec Dec Machine',         category: 'Chest' },
  { name: 'Close-Grip Bench Press',  category: 'Chest' },

  // ── Back ──
  { name: 'Pull-ups',                category: 'Back' },
  { name: 'Chin-ups',                category: 'Back' },
  { name: 'Barbell Rows',            category: 'Back' },
  { name: 'Dumbbell Rows',           category: 'Back' },
  { name: 'Seated Cable Rows',       category: 'Back' },
  { name: 'Lat Pulldowns',           category: 'Back' },
  { name: 'T-Bar Rows',              category: 'Back' },
  { name: 'Deadlifts',               category: 'Back' },
  { name: 'Hyperextensions',         category: 'Back' },
  { name: 'Face Pulls',              category: 'Back' },

  // ── Legs ──
  { name: 'Back Squats',             category: 'Legs' },
  { name: 'Front Squats',            category: 'Legs' },
  { name: 'Goblet Squats',           category: 'Legs' },
  { name: 'Leg Press',               category: 'Legs' },
  { name: 'Romanian Deadlifts',      category: 'Legs' },
  { name: 'Walking Lunges',          category: 'Legs' },
  { name: 'Reverse Lunges',          category: 'Legs' },
  { name: 'Leg Extensions',          category: 'Legs' },
  { name: 'Leg Curls',               category: 'Legs' },
  { name: 'Calf Raises',             category: 'Legs' },
  { name: 'Hip Thrusts',             category: 'Legs' },
  { name: 'Step-ups',                category: 'Legs' },

  // ── Shoulders ──
  { name: 'Overhead Press',          category: 'Shoulders' },
  { name: 'Dumbbell Shoulder Press', category: 'Shoulders' },
  { name: 'Arnold Press',            category: 'Shoulders' },
  { name: 'Lateral Raises',          category: 'Shoulders' },
  { name: 'Front Raises',            category: 'Shoulders' },
  { name: 'Rear Delt Flyes',         category: 'Shoulders' },
  { name: 'Upright Rows',            category: 'Shoulders' },
  { name: 'Shrugs',                  category: 'Shoulders' },

  // ── Arms ──
  { name: 'Barbell Curls',           category: 'Arms' },
  { name: 'Dumbbell Curls',          category: 'Arms' },
  { name: 'Hammer Curls',            category: 'Arms' },
  { name: 'Preacher Curls',          category: 'Arms' },
  { name: 'Cable Curls',             category: 'Arms' },
  { name: 'Tricep Pushdowns',        category: 'Arms' },
  { name: 'Skull Crushers',          category: 'Arms' },
  { name: 'Tricep Dips',             category: 'Arms' },
  { name: 'Overhead Tricep Extension', category: 'Arms' },
  { name: 'Reverse Curls',           category: 'Arms' },

  // ── Core ──
  { name: 'Plank',                   category: 'Core' },
  { name: 'Crunches',                category: 'Core' },
  { name: 'Hanging Leg Raises',      category: 'Core' },
  { name: 'Ab Wheel Rollout',        category: 'Core' },
  { name: 'Cable Crunch',            category: 'Core' },
  { name: 'Russian Twists',          category: 'Core' },
  { name: 'Dead Bug',                category: 'Core' },
  { name: 'Bird Dog',                category: 'Core' },

  // ── Cardio ──
  { name: 'Running',                 category: 'Cardio' },
  { name: 'Cycling',                 category: 'Cardio' },
  { name: 'Jump Rope',               category: 'Cardio' },
  { name: 'Rowing Machine',          category: 'Cardio' },
  { name: 'Stair Climber',           category: 'Cardio' },
  { name: 'Burpees',                 category: 'Cardio' },
  { name: 'High Knees',              category: 'Cardio' },

  // ── Other ──
  { name: 'Battle Ropes',            category: 'Other' },
  { name: 'Kettlebell Swings',       category: 'Other' },
  { name: 'Box Jumps',               category: 'Other' },
  { name: "Farmer's Walk",           category: 'Other' },
  { name: 'Tire Flips',              category: 'Other' },
];
