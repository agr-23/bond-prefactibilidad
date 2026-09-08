# Auditoria BOND - 8 de septiembre de 2026

## Hallazgos corregidos

1. **Critico: bloqueo del analisis por DANE 403.** La consulta externa interrumpia todo el flujo. Se usa el servicio vectorial FeatureServer y, cuando falla, un respaldo municipal local verificado. Su precision aproximada queda indicada en pantalla, fuentes, PDF y Excel.
2. **Critico: capa municipal sin geometria.** El archivo anterior tenia 1.121 registros con geometria nula. Fue reemplazado por poligonos reales de DANE MGN 2024. Las descargas ahora rechazan geometria ausente y conjuntos incompletos.
3. **Alto: evidencia desactualizada.** Cambiar el area invalida el resultado; agregar o retirar capas exige actualizar los cruces antes de exportar o consultar al asistente. Durante el analisis se bloquea la edicion del poligono y el cambio de proyecto.
4. **Medio: busqueda y enfoque del mapa.** El catalogo ahora contiene geometria utilizable. El enfoque de capas espera al montaje del mapa, sin depender de una espera fija de 200 ms. Los limites cambian de color en vista satelital.
5. **Medio: cobertura BESS.** El recurso renovable, que no aplica a almacenamiento, ya no reduce artificialmente la cobertura de evidencia.
6. **Medio: importacion fallida.** Seleccionar otro archivo borra la vista previa anterior, evitando integrar datos de un archivo previo por error.
7. **Medio: trazabilidad del recurso.** Se lee el periodo publicado en `header.range` de NASA POWER y se conservan como ausentes sus valores de relleno.
8. **Medio: estado de IA.** La interfaz indica credencial configurada; no afirma conectividad verificada basandose solo en la presencia de una clave. El modo de consulta sigue funcionando sin proveedor generativo.

## Diseno

Navegacion grafito, acentos cian y ambar, banda de estado territorial, mapa despejado por defecto y paneles de lectura claros. Se conserva la estructura de proyectos, datos, comparador, informes y asistente. Revision visual de escritorio 1440 x 960 y movil 390 x 844.

## Verificacion

- Ocho pruebas automatizadas: catalogo con poligonos, rechazo de geometria nula, cruce de dos municipios y ponderacion por area, poligono autointersectado, respaldo ante 403, respuesta incompleta, cobertura BESS y valores ausentes NASA.
- Flujo real local: crear proyecto, importar GeoJSON, validar, guardar y analizar.
- Poligono de prueba en Antioquia: Caucasia 80,25%; Caceres 12,71%; Nechi 7,04%. Resultado con respaldo ante un 403 real. La base BOND no tiene coincidencia para Caceres; esto se informa, sin inventar indicadores.
- NASA POWER respondio con solar 4,9865 kWh/m2/dia y viento a 50 m de 1,79 m/s para el punto de prueba.
- Descargas PDF y Excel efectuadas desde la interfaz. Libro Excel reabierto: cinco hojas, tres municipios y doce meses.
- Consulta municipal del asistente, navegacion y ausencia de desbordamiento horizontal movil verificadas.
- Dibujo libre probado con movimientos del cursor y cierre mediante Enter; se activa el estado de area sin guardar y se retira el resultado anterior. Se corrigio la indicacion visual del modo de dibujo.
- Comprobacion de tipos y compilacion de produccion.

## Limites y pendientes

- El respaldo tiene una generalizacion de 0,00005 grados, aproximadamente seis metros. No es una tolerancia legal ni garantiza precision catastral: proyectos sobre fronteras necesitan cartografia detallada y validacion oficial. La vista del mapa es mas generalizada, 0,002 grados.
- El acceso directo del servidor al DANE sigue sujeto al bloqueo externo. El respaldo resuelve la continuidad, no elimina la restriccion del proveedor.
- NASA representa una celda climatologica en un punto del poligono, no una evaluacion de produccion energetica del predio. Los ocho puntos del mapa son referencias y no una superficie continua de potencial.
- La base BOND contiene 913 grupos municipales, no cobertura completa de todos los municipios. Las distancias y otros indicadores mantienen su escala municipal y vigencia por verificar.
- No se ha certificado la IA generativa con una credencial activa en esta auditoria. Su presencia no equivale a una respuesta exitosa del proveedor.
- La auditoria funcional no certifica todos los archivos posibles. Se mantienen limites de 20 MB, 10.000 elementos y sistemas de referencia admitidos. GeoTIFF usa una vista muestreada 32 x 32.
- El indice es exploratorio. Faltan validaciones prediales de restricciones oficiales, POT, conexion, geotecnia y componente social para una decision integral.
- Los datos son privados por usuario; la colaboracion de equipo con roles compartidos necesita una fase especifica antes de expansion publica.
- Las pruebas de escritura se realizaron en el entorno local con proyectos temporales, no sobre proyectos existentes del usuario en produccion.
