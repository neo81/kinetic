update public.app_releases
set title = case version
  when '2026.07.01' then 'Mejoras de ejercicios y experiencia PWA'
  when '2026.07.29' then 'Sesiones y rutinas más flexibles'
  else title
end
where version in ('2026.07.01', '2026.07.29');

update public.app_release_notes
set
  title = case
    when release_version = '2026.07.01' and position = 1 then 'Motor como biblioteca'
    when release_version = '2026.07.01' and position = 2 then 'Búsqueda global de ejercicios'
    when release_version = '2026.07.01' and position = 3 then 'Series al fallo'
    when release_version = '2026.07.01' and position = 4 then 'Peso corporal y perfil'
    when release_version = '2026.07.01' and position = 5 then 'Mejoras PWA'
    when release_version = '2026.07.29' and position = 1 then 'Ordena tus ejercicios'
    when release_version = '2026.07.29' and position = 2 then 'CORE opcional en cada sesión'
    when release_version = '2026.07.29' and position = 3 then 'Edición de rutinas más estable'
    else title
  end,
  description = case
    when release_version = '2026.07.01' and position = 1 then 'El acceso MOTOR ahora permite explorar ejercicios sin modificar rutinas por accidente.'
    when release_version = '2026.07.01' and position = 2 then 'Puedes buscar ejercicios por nombre y ver a qué grupo muscular pertenecen.'
    when release_version = '2026.07.01' and position = 3 then 'Las rutinas ya pueden incluir series al fallo y registrar las repeticiones reales al entrenar.'
    when release_version = '2026.07.01' and position = 4 then 'El perfil permite guardar altura y peso para ejercicios que usan peso corporal.'
    when release_version = '2026.07.01' and position = 5 then 'Se suavizaron las transiciones y se mejoró la carga del selector muscular en dispositivos móviles.'
    when release_version = '2026.07.29' and position = 1 then 'Ahora puedes cambiar el orden de los ejercicios arrastrándolos desde el asa lateral.'
    when release_version = '2026.07.29' and position = 2 then 'CORE queda disponible al elegir un día, pero solo cuenta si realizas alguno de sus ejercicios.'
    when release_version = '2026.07.29' and position = 3 then 'El orden de los ejercicios se conserva al editarlos y se mejoró el guardado de sus series.'
    else description
  end
where release_version in ('2026.07.01', '2026.07.29');
