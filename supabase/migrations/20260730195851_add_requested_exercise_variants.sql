with requested_exercises (
  name,
  description,
  muscle_group_code,
  equipment
) as (
  values
    (
      'Remo con Mancuernas y Pecho Apoyado',
      'Boca abajo sobre un banco inclinado, rema con ambas mancuernas hacia los costados del torso, junta las escápulas y baja con control sin despegar el pecho.',
      'dorsales',
      'Banco inclinado y mancuernas'
    ),
    (
      'Remo con Barra T y Pecho Apoyado',
      'Con el pecho apoyado en la plataforma, tira de la barra T hacia el torso manteniendo los codos controlados y baja hasta extender los brazos.',
      'dorsales',
      'Máquina de Barra T'
    ),
    (
      'Remo en Máquina con Pecho Apoyado',
      'Sentado con el pecho firme contra el apoyo, lleva las asas hacia el torso sin encoger los hombros y regresa lentamente a la posición inicial.',
      'dorsales',
      'Máquina'
    ),
    (
      'Curl de Bíceps en Polea con Barra Recta',
      'De pie frente a la polea baja, flexiona los codos con agarre supino manteniéndolos junto al cuerpo y baja la barra de forma controlada.',
      'biceps',
      'Polea y barra recta'
    ),
    (
      'Curl Martillo en Polea con Cuerda',
      'De pie frente a la polea baja, flexiona los codos con agarre neutro sobre la cuerda sin adelantar los hombros y vuelve con control.',
      'biceps',
      'Polea y cuerda'
    ),
    (
      'Curl de Bíceps Unilateral en Polea',
      'De pie frente a la polea baja, flexiona un codo manteniendo el brazo estable, contrae el bíceps y regresa lentamente antes de cambiar de lado.',
      'biceps',
      'Polea y asa individual'
    ),
    (
      'Pullover en Polea Alta',
      'De pie frente a la polea alta, lleva la barra desde la altura de los hombros hasta los muslos con los brazos casi extendidos y vuelve sin perder tensión.',
      'dorsales',
      'Polea'
    ),
    (
      'Pullover con Mancuerna',
      'Tumbado en un banco, sostén una mancuerna sobre el pecho y llévala en arco detrás de la cabeza con los codos levemente flexionados; vuelve con control.',
      'dorsales',
      'Banco y mancuerna'
    ),
    (
      'Pullover en Máquina',
      'Sentado en la máquina, empuja el apoyo en arco hacia el torso manteniendo la espalda estable y regresa lentamente hasta sentir el estiramiento dorsal.',
      'dorsales',
      'Máquina'
    )
)
insert into public.exercises (
  name,
  description,
  muscle_group_id,
  equipment,
  is_active,
  user_id
)
select
  requested.name,
  requested.description,
  muscle_group.id,
  requested.equipment,
  true,
  null
from requested_exercises requested
join public.muscle_groups muscle_group
  on muscle_group.code = requested.muscle_group_code
where not exists (
  select 1
  from public.exercises existing
  where lower(existing.name) = lower(requested.name)
);
