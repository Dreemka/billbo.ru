type CsvParseResult = {
  delimiter: string
  header: string[]
  rows: string[][]
}

function detectDelimiter(line: string): string {
  const candidates = [',', ';', '\t']
  const counts = candidates.map((d) => ({ d, c: line.split(d).length }))
  // Use max "fields" count heuristic.
  return counts.sort((a, b) => b.c - a.c)[0]?.d ?? ','
}

function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (ch === '"') {
      // Escaped quote: "" inside quoted field.
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && ch === delimiter) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += ch
  }

  result.push(current.trim())
  return result
}

export function parseCsv(text: string): CsvParseResult {
  const cleaned = text.replace(/^\uFEFF/, '') // BOM
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length === 0) throw new Error('CSV пустой')

  const delimiter = detectDelimiter(lines[0])
  const header = parseLine(lines[0], delimiter).map((h) => h.trim())
  const rows = lines.slice(1).map((l) => parseLine(l, delimiter))

  return { delimiter, header, rows }
}

