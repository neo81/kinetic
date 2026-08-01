alter table public.exercises
  add column if not exists name_en text,
  add column if not exists description_en text;

comment on column public.exercises.name_en is
  'Optional English display name. The canonical exercise name remains in name.';

comment on column public.exercises.description_en is
  'Optional English display description. The canonical description remains in description.';

with translations (name_es, name_en, description_en) as (
  values
    (
      'Remo con Mancuernas y Pecho Apoyado',
      'Chest-Supported Dumbbell Row',
      'Lie face down on an incline bench and row both dumbbells toward your torso. Squeeze your shoulder blades and lower the weight under control without lifting your chest.'
    ),
    (
      'Remo con Barra T y Pecho Apoyado',
      'Chest-Supported T-Bar Row',
      'Keep your chest firmly supported and pull the T-bar toward your torso with controlled elbows. Lower it until your arms are extended.'
    ),
    (
      'Remo en Máquina con Pecho Apoyado',
      'Chest-Supported Machine Row',
      'Sit with your chest against the pad, pull the handles toward your torso without shrugging, and return slowly to the starting position.'
    ),
    (
      'Curl de Bíceps en Polea con Barra Recta',
      'Straight-Bar Cable Biceps Curl',
      'Stand facing a low cable and curl the straight bar with an underhand grip. Keep your elbows close to your sides and lower the bar under control.'
    ),
    (
      'Curl Martillo en Polea con Cuerda',
      'Rope Cable Hammer Curl',
      'Stand facing a low cable and curl the rope with a neutral grip. Keep your shoulders stable and return under control.'
    ),
    (
      'Curl de Bíceps Unilateral en Polea',
      'Single-Arm Cable Biceps Curl',
      'Stand facing a low cable and curl one arm while keeping the upper arm stable. Contract the biceps and return slowly before switching sides.'
    ),
    (
      'Pullover en Polea Alta',
      'High Cable Pullover',
      'Stand facing a high cable and bring the bar from shoulder height down toward your thighs with nearly straight arms. Return without losing tension.'
    ),
    (
      'Pullover con Mancuerna',
      'Dumbbell Pullover',
      'Lie on a bench holding one dumbbell over your chest. Lower it in an arc behind your head with slightly bent elbows, then return under control.'
    ),
    (
      'Pullover en Máquina',
      'Machine Pullover',
      'Sit in the machine and drive the pad in an arc toward your torso while keeping your back stable. Return slowly until you feel a lat stretch.'
    )
)
update public.exercises as exercise
set
  name_en = translations.name_en,
  description_en = translations.description_en
from translations
where exercise.user_id is null
  and lower(exercise.name) = lower(translations.name_es);
