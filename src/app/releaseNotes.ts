export type ReleaseNote = {
  title: string;
  description: string;
};

export const CURRENT_RELEASE_NOTES_VERSION = '2026.07.01';

export const currentReleaseNotes: ReleaseNote[] = [
  {
    title: 'Motor como biblioteca',
    description: 'El acceso MOTOR ahora permite explorar ejercicios sin modificar rutinas por accidente.',
  },
  {
    title: 'Busqueda global de ejercicios',
    description: 'Podes buscar ejercicios por nombre y ver a que grupo muscular pertenecen.',
  },
  {
    title: 'Series al fallo',
    description: 'Las rutinas ya pueden incluir series al fallo y registrar las repeticiones reales al entrenar.',
  },
  {
    title: 'Peso corporal y perfil',
    description: 'El perfil permite guardar altura y peso para ejercicios que usan peso corporal.',
  },
  {
    title: 'Mejoras PWA',
    description: 'Se suavizaron transiciones y se mejoro la carga del selector muscular en mobile.',
  },
];
