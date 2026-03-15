-- ─────────────────────────────────────────────
-- Seed: Mock Users
-- Passwords are all "password123" (bcrypt, cost 10)
-- ─────────────────────────────────────────────
INSERT INTO users (username, email, password_hash) VALUES
  ('alice',   'alice@example.com', '$2b$10$BKksIFcv8X1oVJltSO5IYeJrWGHsKULdJzO.oSgaBczEcI09FHQ1y'),
  ('bob',     'bob@example.com',   '$2b$10$.Gz5dnUEkBdCoeG.v1nkG.Juum2e/V8X0/xNgL7EencajX4GQYG.C')
ON CONFLICT (username) DO NOTHING;

-- ─────────────────────────────────────────────
-- Seed: Exercise Catalog
-- ─────────────────────────────────────────────
INSERT INTO exercises (name, category) VALUES
  -- Chest
  ('Bench Press',               'Chest'),
  ('Incline Bench Press',       'Chest'),
  ('Decline Bench Press',       'Chest'),
  ('Dumbbell Flyes',            'Chest'),
  ('Incline Dumbbell Flyes',    'Chest'),
  ('Cable Flyes',               'Chest'),
  ('Low-to-High Cable Flyes',   'Chest'),
  ('High-to-Low Cable Flyes',   'Chest'),
  ('Push-ups',                  'Chest'),
  ('Wide-Grip Push-ups',        'Chest'),
  ('Chest Dips',                'Chest'),
  ('Pec Dec Machine',           'Chest'),
  ('Close-Grip Bench Press',    'Chest'),
  ('Dumbbell Bench Press',      'Chest'),
  ('Landmine Press',            'Chest'),
  ('Svend Press',               'Chest'),
  -- Back
  ('Pull-ups',                  'Back'),
  ('Wide-Grip Pull-ups',        'Back'),
  ('Chin-ups',                  'Back'),
  ('Barbell Rows',              'Back'),
  ('Pendlay Rows',              'Back'),
  ('Dumbbell Rows',             'Back'),
  ('Chest-Supported Rows',      'Back'),
  ('Seated Cable Rows',         'Back'),
  ('Wide-Grip Cable Rows',      'Back'),
  ('Lat Pulldowns',             'Back'),
  ('Close-Grip Lat Pulldowns',  'Back'),
  ('T-Bar Rows',                'Back'),
  ('Deadlifts',                 'Back'),
  ('Sumo Deadlifts',            'Back'),
  ('Trap Bar Deadlifts',        'Back'),
  ('Hyperextensions',           'Back'),
  ('Face Pulls',                'Back'),
  ('Straight-Arm Pulldowns',    'Back'),
  ('Single-Arm Lat Pulldown',   'Back'),
  ('Inverted Rows',             'Back'),
  -- Legs
  ('Back Squats',               'Legs'),
  ('Front Squats',              'Legs'),
  ('Goblet Squats',             'Legs'),
  ('Hack Squats',               'Legs'),
  ('Leg Press',                 'Legs'),
  ('Romanian Deadlifts',        'Legs'),
  ('Stiff-Leg Deadlifts',       'Legs'),
  ('Walking Lunges',            'Legs'),
  ('Reverse Lunges',            'Legs'),
  ('Bulgarian Split Squats',    'Legs'),
  ('Leg Extensions',            'Legs'),
  ('Leg Curls',                 'Legs'),
  ('Seated Leg Curls',          'Legs'),
  ('Calf Raises (Standing)',    'Legs'),
  ('Calf Raises (Seated)',      'Legs'),
  ('Hip Thrusts',               'Legs'),
  ('Glute Bridges',             'Legs'),
  ('Step-ups',                  'Legs'),
  ('Box Squats',                'Legs'),
  ('Sissy Squats',              'Legs'),
  ('Nordic Curls',              'Legs'),
  ('Sumo Squats',               'Legs'),
  -- Shoulders
  ('Overhead Press',            'Shoulders'),
  ('Dumbbell Shoulder Press',   'Shoulders'),
  ('Arnold Press',              'Shoulders'),
  ('Seated Dumbbell Press',     'Shoulders'),
  ('Lateral Raises',            'Shoulders'),
  ('Cable Lateral Raises',      'Shoulders'),
  ('Front Raises',              'Shoulders'),
  ('Rear Delt Flyes',           'Shoulders'),
  ('Reverse Pec Dec',           'Shoulders'),
  ('Upright Rows',              'Shoulders'),
  ('Shrugs',                    'Shoulders'),
  ('Dumbbell Shrugs',           'Shoulders'),
  ('Plate Front Raises',        'Shoulders'),
  ('Behind-the-Neck Press',     'Shoulders'),
  ('Pike Push-ups',             'Shoulders'),
  -- Arms
  ('Barbell Curls',             'Arms'),
  ('Dumbbell Curls',            'Arms'),
  ('Hammer Curls',              'Arms'),
  ('Concentration Curls',       'Arms'),
  ('Preacher Curls',            'Arms'),
  ('Cable Curls',               'Arms'),
  ('Spider Curls',              'Arms'),
  ('Incline Dumbbell Curls',    'Arms'),
  ('Zottman Curls',             'Arms'),
  ('Reverse Curls',             'Arms'),
  ('Tricep Pushdowns',          'Arms'),
  ('Skull Crushers',            'Arms'),
  ('Tricep Dips',               'Arms'),
  ('Overhead Tricep Extension', 'Arms'),
  ('Cable Tricep Kickbacks',    'Arms'),
  ('Close-Grip Push-ups',       'Arms'),
  ('Diamond Push-ups',          'Arms'),
  ('Rope Pushdowns',            'Arms'),
  ('EZ-Bar Curls',              'Arms'),
  ('Wrist Curls',               'Arms'),
  -- Core
  ('Plank',                     'Core'),
  ('Side Plank',                'Core'),
  ('Crunches',                  'Core'),
  ('Bicycle Crunches',          'Core'),
  ('Hanging Leg Raises',        'Core'),
  ('Ab Wheel Rollout',          'Core'),
  ('Cable Crunch',              'Core'),
  ('Russian Twists',            'Core'),
  ('Dead Bug',                  'Core'),
  ('Bird Dog',                  'Core'),
  ('V-Ups',                     'Core'),
  ('Toe Touches',               'Core'),
  ('Flutter Kicks',             'Core'),
  ('Hollow Body Hold',          'Core'),
  ('Mountain Climbers',         'Core'),
  ('Pallof Press',              'Core'),
  ('Woodchoppers',              'Core'),
  ('Dragon Flags',              'Core'),
  -- Cardio
  ('Running',                   'Cardio'),
  ('Treadmill Incline Walk',    'Cardio'),
  ('Cycling',                   'Cardio'),
  ('Stationary Bike',           'Cardio'),
  ('Jump Rope',                 'Cardio'),
  ('Rowing Machine',            'Cardio'),
  ('Stair Climber',             'Cardio'),
  ('Elliptical',                'Cardio'),
  ('Burpees',                   'Cardio'),
  ('High Knees',                'Cardio'),
  ('Jumping Jacks',             'Cardio'),
  ('Box Jumps',                 'Cardio'),
  ('Sprint Intervals',          'Cardio'),
  ('Sled Push',                 'Cardio'),
  ('Swimming',                  'Cardio'),
  ('Jump Squats',               'Cardio'),
  -- Other
  ('Battle Ropes',              'Other'),
  ('Kettlebell Swings',         'Other'),
  ('Kettlebell Clean & Press',  'Other'),
  ('Kettlebell Turkish Get-Up', 'Other'),
  ('Farmer''s Walk',            'Other'),
  ('Tire Flips',                'Other'),
  ('Sled Drag',                 'Other'),
  ('Medicine Ball Slams',       'Other'),
  ('Sandbag Carries',           'Other'),
  ('Resistance Band Pull-Aparts','Other'),
  ('TRX Row',                   'Other'),
  ('TRX Push-up',               'Other'),
  ('Rope Climb',                'Other'),
  ('Sled Pull',                 'Other')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────
-- Seed: Workout Splits for alice (user 1)
-- ─────────────────────────────────────────────
DO $$
DECLARE
  alice_id   BIGINT;
  bob_id     BIGINT;
  ppl_id     INTEGER;
  bro_id     INTEGER;
  bob_split  INTEGER;
BEGIN
  SELECT id INTO alice_id FROM users WHERE username = 'alice';
  SELECT id INTO bob_id   FROM users WHERE username = 'bob';

  -- ── Alice: PPL Split (active) ──────────────────
  INSERT INTO workout_splits (user_id, name, is_active)
  VALUES (alice_id, 'PPL Split', TRUE)
  ON CONFLICT DO NOTHING
  RETURNING id INTO ppl_id;

  IF ppl_id IS NULL THEN
    SELECT id INTO ppl_id FROM workout_splits WHERE user_id = alice_id AND name = 'PPL Split';
  END IF;

  INSERT INTO split_days (split_id, day_name, day_type, exercises) VALUES
    (ppl_id, 'Monday',    'Workout', '[
      {"name":"Bench Press","category":"Chest"},
      {"name":"Incline Bench Press","category":"Chest"},
      {"name":"Cable Flyes","category":"Chest"},
      {"name":"Dumbbell Shoulder Press","category":"Shoulders"},
      {"name":"Tricep Pushdowns","category":"Arms"},
      {"name":"Skull Crushers","category":"Arms"}
    ]'),
    (ppl_id, 'Tuesday',   'Workout', '[
      {"name":"Deadlifts","category":"Back"},
      {"name":"Barbell Rows","category":"Back"},
      {"name":"Lat Pulldowns","category":"Back"},
      {"name":"Seated Cable Rows","category":"Back"},
      {"name":"Barbell Curls","category":"Arms"},
      {"name":"Hammer Curls","category":"Arms"}
    ]'),
    (ppl_id, 'Wednesday', 'Workout', '[
      {"name":"Back Squats","category":"Legs"},
      {"name":"Leg Press","category":"Legs"},
      {"name":"Romanian Deadlifts","category":"Legs"},
      {"name":"Leg Extensions","category":"Legs"},
      {"name":"Leg Curls","category":"Legs"},
      {"name":"Calf Raises (Standing)","category":"Legs"}
    ]'),
    (ppl_id, 'Thursday',  'Rest',    '[]'),
    (ppl_id, 'Friday',    'Workout', '[
      {"name":"Overhead Press","category":"Shoulders"},
      {"name":"Dumbbell Bench Press","category":"Chest"},
      {"name":"Lateral Raises","category":"Shoulders"},
      {"name":"Rear Delt Flyes","category":"Shoulders"},
      {"name":"Tricep Dips","category":"Arms"},
      {"name":"Rope Pushdowns","category":"Arms"}
    ]'),
    (ppl_id, 'Saturday',  'Workout', '[
      {"name":"Pull-ups","category":"Back"},
      {"name":"Dumbbell Rows","category":"Back"},
      {"name":"Face Pulls","category":"Back"},
      {"name":"Straight-Arm Pulldowns","category":"Back"},
      {"name":"Preacher Curls","category":"Arms"},
      {"name":"Cable Curls","category":"Arms"}
    ]'),
    (ppl_id, 'Sunday',    'Workout', '[
      {"name":"Bulgarian Split Squats","category":"Legs"},
      {"name":"Hip Thrusts","category":"Legs"},
      {"name":"Walking Lunges","category":"Legs"},
      {"name":"Seated Leg Curls","category":"Legs"},
      {"name":"Calf Raises (Seated)","category":"Legs"}
    ]')
  ON CONFLICT (split_id, day_name) DO NOTHING;

  -- ── Alice: Bro Split ───────────────────────────
  INSERT INTO workout_splits (user_id, name, is_active)
  VALUES (alice_id, 'Bro Split', FALSE)
  ON CONFLICT DO NOTHING
  RETURNING id INTO bro_id;

  IF bro_id IS NULL THEN
    SELECT id INTO bro_id FROM workout_splits WHERE user_id = alice_id AND name = 'Bro Split';
  END IF;

  INSERT INTO split_days (split_id, day_name, day_type, exercises) VALUES
    (bro_id, 'Monday',    'Workout', '[
      {"name":"Bench Press","category":"Chest"},
      {"name":"Incline Bench Press","category":"Chest"},
      {"name":"Dumbbell Flyes","category":"Chest"},
      {"name":"Cable Flyes","category":"Chest"},
      {"name":"Chest Dips","category":"Chest"}
    ]'),
    (bro_id, 'Tuesday',   'Workout', '[
      {"name":"Deadlifts","category":"Back"},
      {"name":"Pull-ups","category":"Back"},
      {"name":"Barbell Rows","category":"Back"},
      {"name":"Lat Pulldowns","category":"Back"},
      {"name":"Seated Cable Rows","category":"Back"}
    ]'),
    (bro_id, 'Wednesday', 'Workout', '[
      {"name":"Back Squats","category":"Legs"},
      {"name":"Leg Press","category":"Legs"},
      {"name":"Romanian Deadlifts","category":"Legs"},
      {"name":"Leg Extensions","category":"Legs"},
      {"name":"Leg Curls","category":"Legs"},
      {"name":"Hip Thrusts","category":"Legs"}
    ]'),
    (bro_id, 'Thursday',  'Workout', '[
      {"name":"Overhead Press","category":"Shoulders"},
      {"name":"Arnold Press","category":"Shoulders"},
      {"name":"Lateral Raises","category":"Shoulders"},
      {"name":"Rear Delt Flyes","category":"Shoulders"},
      {"name":"Shrugs","category":"Shoulders"}
    ]'),
    (bro_id, 'Friday',    'Workout', '[
      {"name":"Barbell Curls","category":"Arms"},
      {"name":"Hammer Curls","category":"Arms"},
      {"name":"Preacher Curls","category":"Arms"},
      {"name":"Tricep Pushdowns","category":"Arms"},
      {"name":"Skull Crushers","category":"Arms"},
      {"name":"Overhead Tricep Extension","category":"Arms"}
    ]'),
    (bro_id, 'Saturday',  'Workout', '[
      {"name":"Plank","category":"Core"},
      {"name":"Hanging Leg Raises","category":"Core"},
      {"name":"Bicycle Crunches","category":"Core"},
      {"name":"Running","category":"Cardio"},
      {"name":"Jump Rope","category":"Cardio"}
    ]'),
    (bro_id, 'Sunday',    'Rest',    '[]')
  ON CONFLICT (split_id, day_name) DO NOTHING;

  -- ── Bob: Upper/Lower Split ─────────────────────
  INSERT INTO workout_splits (user_id, name, is_active)
  VALUES (bob_id, 'Upper/Lower Split', TRUE)
  ON CONFLICT DO NOTHING
  RETURNING id INTO bob_split;

  IF bob_split IS NULL THEN
    SELECT id INTO bob_split FROM workout_splits WHERE user_id = bob_id AND name = 'Upper/Lower Split';
  END IF;

  INSERT INTO split_days (split_id, day_name, day_type, exercises) VALUES
    (bob_split, 'Monday',    'Workout', '[
      {"name":"Bench Press","category":"Chest"},
      {"name":"Barbell Rows","category":"Back"},
      {"name":"Overhead Press","category":"Shoulders"},
      {"name":"Lat Pulldowns","category":"Back"},
      {"name":"Barbell Curls","category":"Arms"},
      {"name":"Tricep Pushdowns","category":"Arms"}
    ]'),
    (bob_split, 'Tuesday',   'Workout', '[
      {"name":"Back Squats","category":"Legs"},
      {"name":"Romanian Deadlifts","category":"Legs"},
      {"name":"Leg Press","category":"Legs"},
      {"name":"Leg Curls","category":"Legs"},
      {"name":"Calf Raises (Standing)","category":"Legs"}
    ]'),
    (bob_split, 'Wednesday', 'Rest',    '[]'),
    (bob_split, 'Thursday',  'Workout', '[
      {"name":"Incline Bench Press","category":"Chest"},
      {"name":"Deadlifts","category":"Back"},
      {"name":"Dumbbell Shoulder Press","category":"Shoulders"},
      {"name":"Seated Cable Rows","category":"Back"},
      {"name":"Hammer Curls","category":"Arms"},
      {"name":"Skull Crushers","category":"Arms"}
    ]'),
    (bob_split, 'Friday',    'Workout', '[
      {"name":"Front Squats","category":"Legs"},
      {"name":"Bulgarian Split Squats","category":"Legs"},
      {"name":"Leg Extensions","category":"Legs"},
      {"name":"Seated Leg Curls","category":"Legs"},
      {"name":"Hip Thrusts","category":"Legs"},
      {"name":"Calf Raises (Seated)","category":"Legs"}
    ]'),
    (bob_split, 'Saturday',  'Workout', '[
      {"name":"Running","category":"Cardio"},
      {"name":"Plank","category":"Core"},
      {"name":"Ab Wheel Rollout","category":"Core"}
    ]'),
    (bob_split, 'Sunday',    'Rest',    '[]')
  ON CONFLICT (split_id, day_name) DO NOTHING;

END $$;

-- ─────────────────────────────────────────────
-- Seed: Sample Workout History for alice
-- ─────────────────────────────────────────────
DO $$
DECLARE
  alice_id BIGINT;
BEGIN
  SELECT id INTO alice_id FROM users WHERE username = 'alice';

  INSERT INTO workout_history (user_id, exercise_name, category, sets, reps, weight, note, logged_at) VALUES
    (alice_id, 'Bench Press',        'Chest',     4, 8,  80.0,  'Felt strong today',   NOW() - INTERVAL '6 days'),
    (alice_id, 'Incline Bench Press','Chest',     3, 10, 65.0,  NULL,                  NOW() - INTERVAL '6 days'),
    (alice_id, 'Tricep Pushdowns',   'Arms',      3, 12, 30.0,  NULL,                  NOW() - INTERVAL '6 days'),
    (alice_id, 'Deadlifts',          'Back',      4, 5,  120.0, 'New PR!',             NOW() - INTERVAL '5 days'),
    (alice_id, 'Barbell Rows',       'Back',      4, 8,  70.0,  NULL,                  NOW() - INTERVAL '5 days'),
    (alice_id, 'Barbell Curls',      'Arms',      3, 10, 35.0,  NULL,                  NOW() - INTERVAL '5 days'),
    (alice_id, 'Back Squats',        'Legs',      5, 5,  100.0, 'Focused on depth',    NOW() - INTERVAL '4 days'),
    (alice_id, 'Leg Press',          'Legs',      3, 12, 140.0, NULL,                  NOW() - INTERVAL '4 days'),
    (alice_id, 'Romanian Deadlifts', 'Legs',      3, 10, 75.0,  NULL,                  NOW() - INTERVAL '4 days'),
    (alice_id, 'Overhead Press',     'Shoulders', 4, 8,  52.5,  NULL,                  NOW() - INTERVAL '2 days'),
    (alice_id, 'Lateral Raises',     'Shoulders', 4, 15, 12.0,  'Drop set on last set',NOW() - INTERVAL '2 days'),
    (alice_id, 'Pull-ups',           'Back',      4, 8,  NULL,  'Bodyweight',          NOW() - INTERVAL '1 day'),
    (alice_id, 'Face Pulls',         'Back',      3, 15, 20.0,  NULL,                  NOW() - INTERVAL '1 day'),
    (alice_id, 'Preacher Curls',     'Arms',      3, 12, 25.0,  NULL,                  NOW() - INTERVAL '1 day'),
    (alice_id, 'Bench Press',        'Chest',     4, 8,  82.5,  'Slight improvement',  NOW())
  ON CONFLICT DO NOTHING;

END $$;
