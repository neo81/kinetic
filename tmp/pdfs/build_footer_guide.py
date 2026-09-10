from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Preformatted
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader

OUT = Path('output/pdf/Guia_Footer_Liquid_Glass.pdf')
OUT.parent.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyGuide', fontName='Helvetica', fontSize=10, leading=14, spaceAfter=8))
styles.add(ParagraphStyle(name='TitleGuide', fontName='Helvetica-Bold', fontSize=25, leading=29, spaceAfter=16))
styles.add(ParagraphStyle(name='SectionGuide', fontName='Helvetica-Bold', fontSize=15, leading=19, spaceAfter=12))
styles.add(ParagraphStyle(name='CellGuide', fontName='Helvetica', fontSize=9, leading=12))
styles.add(ParagraphStyle(name='CodeGuide', fontName='Courier', fontSize=8, leading=11, spaceAfter=12))
story = []
def p(s): story.append(Paragraph(s, styles['BodyGuide']))
def title(s): story.append(Paragraph(s, styles['TitleGuide']))
def section(s): story.append(Paragraph(s, styles['SectionGuide']))
def page(s): story.append(PageBreak()); section(s)
def table(rows, widths=(150,345)):
    data=[[Paragraph(str(c),styles['CellGuide']) for c in row] for row in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ededed')),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,0),.7,colors.black),('LINEBELOW',(0,1),(-1,-1),.3,colors.HexColor('#cccccc')),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    story.append(t);story.append(Spacer(1,12))
def code(s): story.append(Preformatted(s,styles['CodeGuide']))

title('Footer Liquid Glass')
p('<b>Guía técnica para replicar el componente en otra aplicación</b><br/>Kinetic · Implementación revisada el 9 de septiembre de 2026')
p('Esta guía describe la implementación actual: estructura, dimensiones, composición del vidrio, estados y arrastre. Se omiten los valores de color para que la aplicación de destino utilice su propia identidad visual. Los ejemplos de lógica son orientativos; no constituyen un componente completo listo para compilar.')
section('1. Tecnología y estructura')
p('React y TypeScript controlan el estado y la navegación. Tailwind CSS define la disposición y las medidas; CSS personalizado compone los filtros y animaciones. Los iconos proceden de lucide-react. El arrastre utiliza Pointer Events del navegador: este footer no utiliza @dnd-kit, Motion, Framer Motion ni el arrastre nativo de HTML.')
code('nav fijo y transparente\n  capsula de vidrio (position: relative)\n    capa absoluta del recorrido (centrada verticalmente)\n      portador movil (una columna de ancho)\n        burbuja decorativa (escala y reflejos)\n    boton 1: Inicio\n    boton 2: Rutinas\n    boton 3: Motor / Busqueda\n    boton 4: Historial\n    boton 5: Perfil / Avatar\n  dialogo de cambios sin guardar (hermano del nav)')
p('<b>Principio fundamental:</b> los botones permanecen quietos. Lo que se desplaza es una única burbuja detrás de ellos. El portador aplica la traslación horizontal y su hijo aplica la escala. Separar ambas transformaciones evita que el aumento altere la distancia de desplazamiento.')
p('El vidrio es una aproximación visual mediante desenfoque del fondo, transparencias, gradientes y reflejos. No realiza refracción geométrica, deformación real del fondo ni aumento óptico de los elementos que quedan detrás.')
section('Fuentes dentro del proyecto')
p('src/components/layout/BottomNav.tsx: componente y gestos.<br/>src/index.css: familias liquid-glass-bottom-nav y reglas de movimiento reducido.<br/>src/components/layout/ProfileAvatar.tsx: imagen y fallback.<br/>src/components/layout/PageShell.tsx: integración y espacio inferior.')

page('2. Dimensiones y organización espacial')
p('Equivalencias calculadas con 1rem = 16px y el modelo border-box de Tailwind. Un cambio de tamaño raíz modifica las medidas expresadas en rem.')
table([('Elemento','Especificación actual'),('Contenedor nav','Fijo; bottom: 0; left: 0; width: 100%; z-index: 50. Fondo transparente.'),('Padding exterior','12px a izquierda y derecha; 8px arriba; abajo: calc(env(safe-area-inset-bottom) + 20px).'),('Cápsula','width: 100%; max-width: 384px; height: 64px; margin horizontal automático. Radio: 32px. Borde: 1px. Padding horizontal: 6px.'),('Distribución','Grid de cinco columnas iguales; items-center. Sin separación adicional entre columnas.'),('Recorrido absoluto','left y right: 6px; top: 50%; translateY(-50%); z-index: 10; pointer-events: none.'),('Portador móvil','width: 20%; display: flex; justify-content: center. Su propio ancho es la unidad del desplazamiento porcentual.'),('Burbuja','height: 52px; width: calc(100% - 4px); max-width: 68px; radio: 26px; borde: 1px.'),('Botón','Alto: 56px; ancho de su columna; min-width: 0; radio: 26px; contenido centrado; position: relative; z-index: 20.'),('Icono','28 x 28px. Trazo: 2 en reposo, 2.5 activo. Escala activa: 1.05; candidato al arrastrar: 1.16.'),('Avatar','36 x 36px; circular; borde: 1px; overflow: hidden. Imagen al 100%, object-fit: cover.'),('Fallback de avatar','Icono User de lucide al 55% del contenedor, centrado, con grosor de trazo 1.7.')])
p('La cápsula usa isolation: isolate y overflow: visible. Esto crea un contexto de apilamiento propio y permite que la burbuja sobresalga al aumentar. La burbuja usa isolation: isolate y overflow: hidden, para recortar sus reflejos internos.')
p('PageShell reserva pb-32 (128px) en el contenedor cuando hay footer y pb-24 (96px) en main. Son decisiones del layout actual; al portarlo, calcular el espacio libre según el contenido, el área segura y la altura real de la barra.')

page('3. Composición del vidrio')
table([('Superficie','Filtros, capas y geometría'),('Cápsula: fondo','Gradiente radial en 18% -35% y gradiente lineal a 135 grados. El fondo base es más opaco para funcionar sin backdrop-filter.'),('Cápsula: filtro oscuro','blur(20px) saturate(1.82) contrast(1.08) brightness(1.06)'),('Cápsula: filtro claro','blur(16px) saturate(1.9) contrast(1.1) brightness(1.02)'),('Cápsula: ::before','Inset 0; radio heredado; z-index: 0. Gradiente lineal a 105 grados y radial inferior en 50% 115%.'),('Cápsula: ::after','Solo en oscuro: inset 1px; borde 1px; radio heredado; z-index: 0; opacity: 0.72. Lineal a 112 grados y radial en 74% 115%.'),('Cápsula: sombras','Oscuro: 0 20px 52px; inset 0 1px 0; inset 0 -1px 0. Claro: solo inset 0 1px 0.'),('Burbuja: fondo','Radial en 25% 5% y lineal a 145 grados.'),('Burbuja: filtro','blur(12px) saturate(1.55) contrast(1.08) brightness(1.08)'),('Burbuja: sombras','Anillo externo de 1px; inset 0 1px 0; sombra exterior 0 7px 18px. Al arrastrar: anillo 1px, reflejo superior y sombra 0 10px 24px.'),('Burbuja: ::before','Inset -45%; z-index: 0; opacity: 0.75. Radial elíptico en 30% 45% y lineal a 105 grados. Su exceso de tamaño permite mover el reflejo dentro del recorte.'),('Burbuja: ::after','Solo en oscuro: inset 1px; borde 1px; radio heredado; z-index: 1; sombra inset 0 -1px 0.')])
p('Todos los pseudo-elementos decorativos ignoran eventos de puntero. Los filtros se declaran tanto con backdrop-filter como con -webkit-backdrop-filter. Un bloque @supports activa fondos más transparentes cuando el navegador admite el desenfoque.')
p('<b>Corrección que debe conservarse:</b> en tema claro, ::after está desactivado tanto en la cápsula como en la burbuja. El ::after de la burbuja generaba el arco inferior duplicado. No volver a introducir esa sombra interna si se busca el resultado aprobado.')

page('4. Arrastre: secuencia y cálculo')
p('<b>Inicio.</b> onPointerDown solo acepta el botón actualmente activo y, para ratón, el botón principal. Cancela el asentamiento previo, guarda pointerId, startX, startY, startIndex y currentPosition; marca la presión y llama a setPointerCapture(pointerId). Esto conserva los eventos aunque el puntero salga del botón.')
p('<b>Umbral.</b> onPointerMove verifica que el puntero sea el capturado. Para iniciar el arrastre exige abs(deltaX) &gt;= 8px y abs(deltaX) &gt; abs(deltaY). Hasta entonces es una presión. No necesita una pulsación larga.')
p('<b>Seguimiento.</b> Al comenzar se desactiva la transición del recorrido, se activa el estado dragging y se bloquea el clic posterior. El movimiento horizontal se calcula usando el ancho medido del portador, no el ancho de la burbuja ampliada.')
code('deltaX = pointerX - startX\nslotWidth = track.getBoundingClientRect().width\nposition = clamp(startIndex + deltaX / slotWidth, 0, N - 1)\npreviewIndex = Math.round(position)\ntrack.style.transform =\n  `translate3d(${position * 100}%, 0, 0)`')
p('Con cinco accesos N = 5. Cada 100% equivale a una columna porque el portador ocupa el 20% del recorrido. La posición es decimal mientras se arrastra. El candidato cambia al cruzar la mitad entre columnas; navegar se reserva para la liberación del puntero.')
p('<b>Rendimiento.</b> El transform se escribe directamente mediante una referencia DOM. No se actualiza el estado React por cada píxel. El estado del candidato solo cambia cuando se cruza a otra columna. El portador incluye will-change: transform.')
p('<b>Final.</b> onPointerUp libera la captura y redondea la posición. Anima hacia el destino, reduce la burbuja e inicia la navegación si cambió de acceso. onPointerCancel devuelve la burbuja al índice activo. Si no se superó el umbral, no se ejecuta el cierre de un arrastre.')
p('<b>Clic posterior.</b> suppressNextClickRef bloquea el clic que puede seguir al gesto. La bandera se limpia con un timeout de 0ms. onDragStart llama a preventDefault para impedir el drag and drop HTML nativo.')
p('No existe inercia, cálculo de velocidad, rebote físico ni reordenamiento de botones. El destino depende de la posición final. El activo usa touch-action: pan-y; los demás usan manipulation. El cursor del activo alterna entre grab y grabbing.')

page('5. Animaciones y estado')
table([('Acción','Valores exactos'),('Toque en otro acceso','Transform del portador: 420ms cubic-bezier(0.22, 1, 0.36, 1).'),('Presión en el activo','Burbuja: scale(1.14). Transform: 110ms cubic-bezier(0.22, 1, 0.36, 1).'),('Arrastre activo','Burbuja: scale(1.4), desde el centro. Alto visual: 72.8px. El layout sigue midiendo 52px de alto.'),('Sombras de burbuja','Transición: box-shadow 140ms ease.'),('Reflejo en reposo','translate3d(-12%, -2%, 0) rotate(-4deg); opacity: 0.75.'),('Reflejo al arrastrar','translate3d(14%, 3%, 0) rotate(5deg); opacity: 1. Transform: 420ms cubic-bezier(0.22, 1, 0.36, 1); opacity: 260ms ease.'),('Al soltar: posición','460ms cubic-bezier(0.2, 0.72, 0.24, 1). Se asigna también como estilo inline.'),('Al soltar: escala','Keyframes de scale(1.4) a scale(1), 460ms con la misma curva y animation-fill-mode: both.'),('Limpieza del asentamiento','Timeout de 480ms. Elimina el estado y la transición inline; una nueva presión cancela el timeout.'),('Iconos y avatar','Transición de transform de 200ms. El botón tiene transition-all de 500ms.')])
p('El reflejo cambia entre dos poses; no sigue continuamente la dirección o velocidad del dedo. Tampoco amplía de verdad el icono por refracción: la escala del icono se aplica explícitamente.')
p('<b>Estado React:</b> animatedIndex, isLensPressed, isDragging, isDragSettling, dragTargetIndex, pendingView e isNavigating mediante useTransition. Las referencias conservan el elemento móvil, los datos del gesto, el candidato, la supresión del clic y el timeout de asentamiento.')
p('lastBottomNavIndex y dragLensSettleUntil son variables a nivel de módulo para conservar posición y asentamiento entre remontajes. No persisten tras recargar. Cuando cambia la vista activa, un requestAnimationFrame actualiza animatedIndex para permitir el desplazamiento desde el índice anterior.')

page('6. Integración y criterios de adaptación')
p('<b>Navegación actual.</b> El componente recibe active, setView, avatarUrl y hasUnsavedChanges. El detalle y el editor de rutinas activan Rutinas; la lista y el editor de ejercicios activan Motor. Una vista no encontrada produce índice visual 0. Estas reglas se deben adaptar al router de destino.')
p('Al abrir Motor se escribe kinetic.selectorSource = global en sessionStorage. Es una regla propia de Kinetic, independiente del efecto visual. La navegación se ejecuta dentro de startTransition. Si hay cambios pendientes se conserva la vista, se devuelve la burbuja al acceso activo y se solicita confirmación.')
p('<b>Accesibilidad.</b> Se utilizan botones reales con aria-label y title. El seleccionado tiene aria-current="page"; nav indica aria-busy durante navegación. La capa móvil está marcada aria-hidden. El foco visible tiene contorno de 2px y offset de -3px. Los iconos son decorativos; la imagen del avatar tiene texto alternativo.')
p('<b>Movimiento reducido.</b> La regla prefers-reduced-motion: reduce baja a 1ms las transiciones del portador, la burbuja, su reflejo y la animación de escala al soltar. En el código actual la transición inline de liberación puede prevalecer. Al portarlo conviene contemplar esta preferencia también en esa asignación y en las transiciones de iconos.')
section('Lista de transferencia')
p('1. Mantener el portador de traslación separado de la burbuja que escala.<br/>2. Hacer coincidir la cantidad de columnas y el ancho porcentual del portador: 100 / N.<br/>3. Conservar la captura de puntero, el umbral horizontal y la cancelación.<br/>4. Usar las dimensiones sin transformar para medir cada columna.<br/>5. Mantener los botones por encima y las capas de vidrio sin eventos.<br/>6. Adaptar colores y opacidades al fondo de destino, sin volver opaca toda la superficie.<br/>7. Revisar overflow, contextos de apilamiento y espacio inferior del layout.<br/>8. Conservar el fallback sin backdrop-filter y el área segura del dispositivo.<br/>9. Aislar las variables de módulo si habrá varios footers a la vez.<br/>10. Adaptar la protección de cambios pendientes y la navegación a la otra app.')
p('En Kinetic hay reglas móviles generales que anulan sombras y filtros con !important. El footer las contrarresta con sus propias declaraciones. No es necesario reproducir esas anulaciones si la aplicación de destino no presenta el mismo conflicto.')
section('Comprobación recomendada')
p('Probar toque y teclado; arrastre corto y completo; cancelación del puntero; scroll vertical sobre el activo; salida de los límites; presión durante el asentamiento; confirmación de cambios pendientes; avatar fallido; temas claro y oscuro; movimiento reducido; navegador móvil y área segura. Confirmar que el contenido no quede oculto y que el arco inferior duplicado no reaparezca.')
p('<b>Alcance:</b> guía documental del componente, sin cambios funcionales en la aplicación y sin paleta de colores. Fecha de referencia: 09/09/2026.')

def footer(c,doc):
    c.setStrokeColor(colors.HexColor('#cccccc'));c.line(50,43,545,43)
    c.setFont('Helvetica',8);c.drawString(50,30,'KINETIC  /  FOOTER LIQUID GLASS  /  GUIA DE IMPLEMENTACION')
    c.drawRightString(545,30,str(doc.page))
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=50,leftMargin=50,topMargin=45,bottomMargin=58,title='Footer Liquid Glass - Guia de implementacion',author='Kinetic')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
reader=PdfReader(str(OUT))
print(f'{OUT.resolve()} | pages={len(reader.pages)}')
for i,page_obj in enumerate(reader.pages): print(i+1,len(page_obj.extract_text()))
