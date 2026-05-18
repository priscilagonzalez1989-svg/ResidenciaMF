const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.cwd();
const ENV_PATH = path.join(ROOT_DIR, ".env");
const BATCH_SIZE = 50;
const MF_NUMBER_OFFSET = 10000;

const SOURCE_FILES = {
  paliativos: "paliativos_checklists_final.md",
  ginecologia: "ginecologia_checklists_final.md",
  reumatologia: "reumatologia_checklists_final.md",
  medicinaFamiliar: "MF_checklists_completos_final.md",
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function resolveSourcePath(filename) {
  const localPath = path.join(ROOT_DIR, filename);
  if (fs.existsSync(localPath)) return localPath;

  const downloadsPath = path.join("/Users/prisc/Downloads", filename);
  if (fs.existsSync(downloadsPath)) return downloadsPath;

  throw new Error(
    `No se encontró ${filename} ni en la raíz del proyecto ni en Downloads.`
  );
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function parseQuestionSections(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const matches = [...normalized.matchAll(/^##\s+(.+)$/gm)];

  return matches.map((match, index) => {
    const header = match[1].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : normalized.length;
    const body = normalized.slice(start, end).trim();
    return { header, body };
  });
}

function parseChecklistItems(block) {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) =>
      line
        .replace(/^- /, "")
        .replace(/\s*\(\d+(?:[.,]\d+)?\s*pt?s?\)\s*$/i, "")
        .trim()
    );
}

function parseEnunciado(block) {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^>\s*/, "").replace(/^\*|\*$/g, "").trim())
    .join("\n\n")
    .trim();
}

function parsePuntajeTotal(body) {
  const match = body.match(/\*\*Puntaje total:\s*([\d.,]+)\s*pts\*\*/i);
  if (!match) {
    throw new Error("No se encontró '**Puntaje total:**' en una pregunta.");
  }

  return Number(match[1].replace(",", "."));
}

function parseHeader(header) {
  const parts = header.split("|").map((part) => part.trim());
  if (parts.length < 4) {
    throw new Error(`Encabezado inválido: ${header}`);
  }

  return {
    rawId: parts[0],
    tipo: parts[1],
    dominio: parts[2],
    anio: parts[3],
  };
}

function parseStandardChecklistFile(markdown, sourceName) {
  return parseQuestionSections(markdown)
    .filter(({ header }) => /^N°\s*\d+/i.test(header))
    .map(({ header, body }) => {
    const parsedHeader = parseHeader(header);
    const numberMatch = parsedHeader.rawId.match(/N°\s*(\d+)/i);
    if (!numberMatch) {
      throw new Error(`No se pudo extraer el número desde: ${parsedHeader.rawId}`);
    }

    const enunciadoMatch = body.match(
      /\*\*Enunciado:\*\*([\s\S]*?)\*\*Lista de cotejo/i
    );
    const checklistMatch = body.match(
      /\*\*Lista de cotejo[^\n]*:\*\*([\s\S]*?)\*\*Puntaje total:/i
    );

    if (!enunciadoMatch || !checklistMatch) {
      throw new Error(`Formato inválido en pregunta N°${numberMatch[1]} (${sourceName}).`);
    }

    const checklistItems = parseChecklistItems(checklistMatch[1]);

    return {
      numero: Number(numberMatch[1]),
      tipo: parsedHeader.tipo,
      dominio: parsedHeader.dominio,
      anio: parsedHeader.anio,
      enunciado: parseEnunciado(enunciadoMatch[1]),
      lista_cotejo: checklistItems.join("<br>"),
      puntaje_sugerido: parsePuntajeTotal(body),
      fuente: sourceName,
    };
    });
}

function parseMFChecklistFile(markdown, sourceName) {
  const sections = parseQuestionSections(markdown).filter(
    ({ header }) => /^MF-\d+/i.test(header)
  );

  const parsed = sections.map(({ header, body }) => {
    const parsedHeader = parseHeader(header);
    const codeMatch = parsedHeader.rawId.match(/MF-(\d+)/i);
    if (!codeMatch) {
      throw new Error(`No se pudo extraer el código MF desde: ${parsedHeader.rawId}`);
    }

    const mfCode = Number(codeMatch[1]);
    const enunciadoMatch = body.match(
      /\*\*Enunciado:\*\*([\s\S]*?)\*\*Lista de cotejo/i
    );
    const checklistMatch = body.match(
      /\*\*Lista de cotejo[^\n]*:\*\*([\s\S]*?)\*\*Puntaje total:/i
    );

    if (!enunciadoMatch || !checklistMatch) {
      throw new Error(`Formato inválido en ${parsedHeader.rawId} (${sourceName}).`);
    }

    const checklistItems = parseChecklistItems(checklistMatch[1]);

    return {
      numero: MF_NUMBER_OFFSET + mfCode,
      codigo_origen: parsedHeader.rawId,
      rotacion: "Medicina Familiar",
      tipo: parsedHeader.tipo,
      dominio: parsedHeader.dominio,
      anio: "R2",
      enunciado: parseEnunciado(enunciadoMatch[1]),
      opciones: null,
      respuesta_correcta: null,
      lista_cotejo: checklistItems.join("<br>"),
      puntaje_sugerido: parsePuntajeTotal(body),
      observaciones: `Importada desde ${parsedHeader.rawId}`,
      fuente: sourceName,
      imagen_url: null,
      activa: true,
      pool_guardia: false,
      guardia_activa: false,
    };
  });

  return parsed;
}

async function upsertInBatches(supabase, records, labelBuilder) {
  const batches = chunk(records, BATCH_SIZE);

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];

    for (const record of batch) {
      console.log(`${labelBuilder(record)}...`);
    }

    const payload = batch.map(({ codigo_origen, ...record }) => record);

    const { error } = await supabase
      .from("banco_preguntas")
      .upsert(payload, { onConflict: "numero" });

    if (error) {
      throw new Error(`Falló el upsert del lote ${index + 1}: ${error.message}`);
    }
  }
}

async function main() {
  loadEnvFile(ENV_PATH);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const sourcePaths = Object.fromEntries(
    Object.entries(SOURCE_FILES).map(([key, filename]) => [key, resolveSourcePath(filename)])
  );

  const standardSources = [
    sourcePaths.paliativos,
    sourcePaths.ginecologia,
    sourcePaths.reumatologia,
  ];

  const standardRecords = standardSources.flatMap((filePath) =>
    parseStandardChecklistFile(
      fs.readFileSync(filePath, "utf8"),
      path.basename(filePath)
    )
  );

  const standardNumbers = standardRecords.map((item) => item.numero);
  const { data: existingRows, error: existingError } = await supabase
    .from("banco_preguntas")
    .select("*")
    .in("numero", standardNumbers);

  if (existingError) {
    throw new Error(`No se pudieron leer preguntas existentes: ${existingError.message}`);
  }

  const existingByNumero = new Map((existingRows || []).map((row) => [row.numero, row]));
  const mergedStandardRecords = standardRecords.map((record) => {
    const existing = existingByNumero.get(record.numero);
    if (!existing) {
      throw new Error(
        `La pregunta N°${record.numero} no existe en banco_preguntas y no puede actualizarse.`
      );
    }

    return {
      ...existing,
      lista_cotejo: record.lista_cotejo,
      puntaje_sugerido: record.puntaje_sugerido,
      fuente: record.fuente,
    };
  });

  console.log("Actualizando checklists de Paliativos, Ginecología y Reumatología...");
  await upsertInBatches(supabase, mergedStandardRecords, (record) => {
    return `UPDATE N°${record.numero} (${record.fuente})`;
  });

  const mfRecords = parseMFChecklistFile(
    fs.readFileSync(sourcePaths.medicinaFamiliar, "utf8"),
    path.basename(sourcePaths.medicinaFamiliar)
  );

  const { data: conflictingMfRows, error: mfConflictError } = await supabase
    .from("banco_preguntas")
    .select("numero, rotacion, fuente")
    .in(
      "numero",
      mfRecords.map((record) => record.numero)
    );

  if (mfConflictError) {
    throw new Error(
      `No se pudo verificar la numeración de Medicina Familiar: ${mfConflictError.message}`
    );
  }

  const invalidConflicts = (conflictingMfRows || []).filter(
    (row) => row.rotacion !== "Medicina Familiar"
  );
  if (invalidConflicts.length) {
    throw new Error(
      `La numeración reservada para MF colisiona con registros existentes: ${invalidConflicts
        .map((row) => `${row.numero} (${row.rotacion})`)
        .join(", ")}`
    );
  }

  console.log("Insertando/actualizando preguntas nuevas de Medicina Familiar...");
  await upsertInBatches(supabase, mfRecords, (record) => {
    return `UPSERT ${record.codigo_origen} -> N°${record.numero}`;
  });

  const newMfNumbers = mfRecords.map((record) => record.numero);
  console.log("Desactivando preguntas previas de Medicina Familiar fuera del nuevo set...");
  const { error: deactivateError } = await supabase
    .from("banco_preguntas")
    .update({ activa: false })
    .eq("rotacion", "Medicina Familiar")
    .not("numero", "in", `(${newMfNumbers.join(",")})`);

  if (deactivateError) {
    throw new Error(
      `No se pudieron desactivar preguntas previas de Medicina Familiar: ${deactivateError.message}`
    );
  }

  console.log("Reactivando el nuevo set de Medicina Familiar...");
  const { error: reactivateError } = await supabase
    .from("banco_preguntas")
    .update({ activa: true })
    .in("numero", newMfNumbers);

  if (reactivateError) {
    throw new Error(
      `No se pudieron reactivar las nuevas preguntas de Medicina Familiar: ${reactivateError.message}`
    );
  }

  console.log("");
  console.log(`Checklists actualizados: ${mergedStandardRecords.length}`);
  console.log(`Preguntas nuevas MF upsertadas: ${mfRecords.length}`);
  console.log(`Preguntas MF detectadas en archivo: ${mfRecords.length}`);
  console.log(
    `Numeración MF reservada: ${Math.min(...newMfNumbers)}-${Math.max(...newMfNumbers)}`
  );
}

main().catch((error) => {
  console.error("");
  console.error(`Actualización falló: ${error.message}`);
  process.exit(1);
});
