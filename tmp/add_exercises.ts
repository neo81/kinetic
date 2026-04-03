import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env.local que suele tener las variables de Vite en este entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const exercises = [
  { "name": "Crunch en polea alta", "equipment": "Polea", "muscle_group_id": 1, "description": "Arrodillado frente a una polea, sujeta la cuerda y flexiona el tronco llevando los codos hacia las rodillas." },
  { "name": "Crunch en máquina", "equipment": "Máquina", "muscle_group_id": 1, "description": "Utiliza la máquina específica para realizar flexiones de tronco con carga." },
  { "name": "Elevación de piernas colgado", "equipment": "Barra de dominadas", "muscle_group_id": 1, "description": "Colgado de una barra de dominadas, eleva las piernas hasta que formen un ángulo de 90 grados con el torso." },
  { "name": "Elevación de rodillas en paralelas", "equipment": "Estación de paralelas", "muscle_group_id": 1, "description": "Apoyado en los antebrazos sobre la estación de paralelas, eleva las rodillas hacia el pecho." },
  { "name": "Russian Twists (Giros rusos)", "equipment": "Peso corporal / Disco", "muscle_group_id": 1, "description": "Sentado en el suelo con las rodillas flexionadas, gira el torso de lado a lado." },
  { "name": "Press Pallof", "equipment": "Polea o Banda", "muscle_group_id": 1, "description": "Sujeta el agarre frente al pecho y extiéndelas, resistiendo la fuerza que intenta girar tu torso." },
  { "name": "Leñador en polea (Woodchoppers)", "equipment": "Polea", "muscle_group_id": 1, "description": "Realiza un movimiento diagonal hacia abajo, cruzando el cuerpo mediante una rotación controlada." },
  { "name": "Rueda abdominal (Ab Wheel)", "equipment": "Rueda abdominal", "muscle_group_id": 1, "description": "De rodillas, desliza la rueda hacia adelante manteniendo el abdomen contraído." }
];

async function addExercises() {
  console.log('Adding exercises to Supabase...');
  for (const ex of exercises) {
    const { data, error } = await supabase
      .from('exercises')
      .insert(ex)
      .select();
    
    if (error) {
      console.error(`Error adding ${ex.name}:`, error.message);
    } else {
      console.log(`Successfully added: ${ex.name}`);
    }
  }
}

addExercises().catch(console.error);
