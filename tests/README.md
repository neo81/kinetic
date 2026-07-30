# Pruebas

Este directorio separa pruebas de interfaz y pruebas de carga.

## E2E con Playwright

Ejecuta un flujo de humo contra la app local. Playwright levanta `npm run dev`
automáticamente si no hay un servidor activo en `http://127.0.0.1:3000`.

```powershell
npm run test:e2e
```

El flujo real de rutina (`routine-session.spec.ts`) se salta si no hay
credenciales E2E. Para ejecutarlo contra tu usuario de prueba:

```powershell
$env:E2E_USER_EMAIL="tu-email@example.com"
$env:E2E_USER_PASSWORD="tu-password"
npm run test:e2e
```

El flujo multiusuario (`multiuser.spec.ts`) necesita dos usuarios E2E:

```powershell
$env:E2E_USER_EMAIL="test@mail.com"
$env:E2E_USER_PASSWORD="123456"
$env:E2E_USER2_EMAIL="test2@mail.com"
$env:E2E_USER2_PASSWORD="123456"
npm run test:e2e
```

El flujo concurrente de 5 usuarios (`concurrent-users.spec.ts`) necesita cinco
usuarios E2E con rutinas grandes ya sembradas:

```powershell
$env:E2E_USER_EMAIL="test@mail.com"
$env:E2E_USER_PASSWORD="123456"
$env:E2E_USER2_EMAIL="test2@mail.com"
$env:E2E_USER2_PASSWORD="123456"
$env:E2E_USER3_EMAIL="test3@mail.com"
$env:E2E_USER3_PASSWORD="123456"
$env:E2E_USER4_EMAIL="test4@mail.com"
$env:E2E_USER4_PASSWORD="123456"
$env:E2E_USER5_EMAIL="test5@mail.com"
$env:E2E_USER5_PASSWORD="123456"
npm run test:e2e
```

`concurrent-finalization.spec.ts` usa los mismos cinco usuarios y finaliza cinco
rutinas de 50 series cada una en simultaneo. Luego valida que cada sesión
aparezca en Historial con 10 ejercicios.

Estas variables se aplican solo a esa ventana de PowerShell. El usuario debe
tener al menos una rutina activa con ejercicios. La prueba inicia una rutina,
marca un ejercicio como `Salteado` y cancela el entrenamiento para no finalizar
ni registrar volumen.

Para depurar visualmente:

```powershell
npm run test:e2e:ui
```

## Carga con k6

Valida que la app responda bajo una carga liviana.

```powershell
npm run test:load:k6
```

Si la terminal no reconoce `k6`, cierra y abre PowerShell para refrescar el PATH
o ejecuta:

```powershell
& "C:\Program Files\k6\k6.exe" run tests/load/smoke.k6.js
```

Estas pruebas son de humo. No usan usuarios reales ni escriben datos en Supabase.
