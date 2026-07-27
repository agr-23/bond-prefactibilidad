import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


SOURCE = Path(r"C:\Users\felip\Downloads\VARIABLES EXCLUYENTES - 951\TRABAJO MACROINDICADORES\df_final_completo_belent_act.csv")
PUBLIC_DATA = Path("public/data")

NUMERIC_FIELDS = {
    "irradiacion_media_wm2": "ghi_promedio_multianual_wm2",
    "energia_solar_anual_kwhm2": "sumatoria_energia_solar_anual_promedio_kwhm2",
    "temperatura_media_c": "temperatura_promedio_multianual_c",
    "humedad_media_porcentaje": "porcentaje_humedad_promedio_multianual",
    "velocidad_viento_media_ms": "velocidad_viento_promedio_multianual_ms",
    "densidad_potencia_eolica_wm2": "densidad_potencia_energia_eolica_anual_wm2",
    "energia_eolica_anual_kwhm2": "energia_eolica_anual_kwhm2",
    "lluvia_media_anual": "lluvia_promedio_multianual_cm3ano",
    "distancia_cuenca_km": "distancia_cuenca_km",
    "distancia_rio_km": "distancia_rio_km",
    "distancia_via_t1_km": "dist_via_mas_cercana_km_vias_t1",
    "distancia_via_t2_t4_km": "dist_via_mas_cercana_km_vias_t2_t4",
    "distancia_urbano_km": "distancia_urbano_cercano_km",
    "cobertura_electrica_icee": "indice_cobertura_energia_electrica_icee",
    "pobreza_energetica": "indice_pobreza_energetica_multidimensional",
    "conflictos_energia": "n_conflictos_energia",
    "distancia_conflicto_km": "dist_min_conflictos_km",
    "distancia_conflicto_energia_km": "dist_min_conflictos_energeticos_km",
    "distancia_subestacion_km": "distancia_subestacion_km",
    "demanda_region_gwh": "demanda_energetica_region_gwh",
    "demanda_operador_kwh": "demanda_por_operador_kwh",
    "densidad_poblacional_km2": "densidad_poblacional_km2",
    "acceso_internet_porcentaje": "porcentaje_acceso_internet",
    "densidad_coca_ha_km2": "densidad_cultivos_coca_ha_km2",
    "distancia_coca_km": "dist_min_coca_km",
}

BOOLEAN_FIELDS = {
    "es_zni": "este_mpio_es_zni_bool",
    "es_zomac": "es_zomac",
    "es_pdet": "es_pdet",
    "tiene_area_protegida_reportada": "f2_runap",
    "tiene_resguardo_reportado": "f2_resguardos",
    "tiene_ley_segunda_reportada": "f2_ley_segunda",
}


def as_number(value):
    try:
        return float(str(value).strip().replace(",", "."))
    except (TypeError, ValueError):
        return None


def mode(values):
    cleaned = [value.strip() for value in values if value and value.strip() and value.strip().lower() not in {"no esta", "sin informacion", "n.a"}]
    return Counter(cleaned).most_common(1)[0][0] if cleaned else ""


def as_flag(value):
    normalized = (value or "").strip().lower()
    if normalized in {"1", "1.0", "true", "si", "sí"}:
        return 1
    return 0


def rounded_average(values):
    valid = [value for value in values if value is not None]
    return round(sum(valid) / len(valid), 4) if valid else ""


def normalized_code(value):
    number = as_number(value)
    return str(int(number)) if number is not None else ""


def main():
    groups = defaultdict(list)
    with SOURCE.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            department = (row.get("f1_departamento") or "").strip().upper()
            municipality = (row.get("f1_municipio") or "").strip().upper()
            if department and municipality:
                groups[(department, municipality)].append(row)

    output_rows = []
    for (department, municipality), rows in sorted(groups.items()):
        result = {
            "codigo_dane": mode([normalized_code(row.get("f2_cod_dane_m")) for row in rows]),
            "departamento": department.title(),
            "municipio": municipality.title(),
            "registros_promediados": len(rows),
            # The source labels lat_deg/lon_deg are inverted; use the original longitude/latitude fields.
            "longitud": rounded_average([as_number(row.get("f2_longitud_deg")) for row in rows]),
            "latitud": rounded_average([as_number(row.get("f2_latitud_deg")) for row in rows]),
        }
        for output_name, source_name in NUMERIC_FIELDS.items():
            result[output_name] = rounded_average([as_number(row.get(source_name)) for row in rows])
        result["vocacion_suelo_predominante"] = mode([row.get("vocacion_suelo") for row in rows])
        result["nivel_riesgo_predominante"] = mode([row.get("nivel_riesgo") for row in rows])
        for output_name, source_name in BOOLEAN_FIELDS.items():
            result[output_name] = int(any(as_flag(row.get(source_name)) for row in rows))
        output_rows.append(result)

    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    csv_path = PUBLIC_DATA / "municipios_prefactibilidad.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=list(output_rows[0]))
        writer.writeheader()
        writer.writerows(output_rows)

    features = []
    for row in output_rows:
        if isinstance(row["longitud"], float) and isinstance(row["latitud"], float):
            features.append({
                "type": "Feature",
                "properties": {key: value for key, value in row.items() if key not in {"longitud", "latitud"}},
                "geometry": {"type": "Point", "coordinates": [row["longitud"], row["latitud"]]},
            })
    (PUBLIC_DATA / "municipios_prefactibilidad.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8"
    )
    (PUBLIC_DATA / "municipios_prefactibilidad_resumen.json").write_text(
        json.dumps({
            "municipios": len(output_rows),
            "municipios_con_coordenadas": len(features),
            "registros_fuente": sum(row["registros_promediados"] for row in output_rows),
            "variables_numericas": len(NUMERIC_FIELDS),
            "variables_contextuales": 8,
            "excluidos_sin_municipio": 211,
        }, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
