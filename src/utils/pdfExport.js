import { jsPDF } from 'jspdf'

/**
 * Exporteer zaagplan naar PDF
 * - 1 plaat per pagina
 * - Vaste diagram grootte, plaat geschaald om te passen
 * - Hoogte is maatgevend voor schaling
 * - Ondersteunt complexe vormen met gaten
 */

// Parse boundary string naar punten array
function parseBoundary(boundaryStr) {
  if (!boundaryStr) return null
  const points = boundaryStr.split(';').map(p => {
    const [x, y] = p.split(',').map(Number)
    return { x, y }
  })
  return points
}

// Parse holes string naar array van hole objects
function parseHoles(holesStr) {
  if (!holesStr) return []
  return holesStr.split('|').map(hole => {
    if (hole.startsWith('CIRCLE:')) {
      const data = hole.replace('CIRCLE:', '')
      const [centerPart, diameter] = data.split(';')
      const [cx, cy] = centerPart.split(',').map(Number)
      return { type: 'circle', cx, cy, d: Number(diameter) }
    } else if (hole.startsWith('POLY:')) {
      const data = hole.replace('POLY:', '')
      const points = data.split(';').map(p => {
        const [x, y] = p.split(',').map(Number)
        return { x, y }
      })
      const minX = Math.min(...points.map(p => p.x))
      const maxX = Math.max(...points.map(p => p.x))
      const minY = Math.min(...points.map(p => p.y))
      const maxY = Math.max(...points.map(p => p.y))
      return { 
        type: 'poly', 
        points,
        bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
      }
    }
    return null
  }).filter(Boolean)
}

// Teken polygoon in PDF
function drawPolygon(doc, points, offsetX, offsetY, scale, fillColor, strokeColor) {
  if (!points || points.length < 3) return
  
  doc.setFillColor(...fillColor)
  doc.setDrawColor(...strokeColor)
  doc.setLineWidth(0.3)
  
  // Converteer naar jsPDF lines format
  const scaledPoints = points.map(p => [
    p.x * scale,
    p.y * scale
  ])
  
  // Start punt
  const startX = offsetX + scaledPoints[0][0]
  const startY = offsetY + scaledPoints[0][1]
  
  // Relatieve bewegingen voor de rest
  const lines = []
  for (let i = 1; i < scaledPoints.length; i++) {
    lines.push([
      scaledPoints[i][0] - scaledPoints[i-1][0],
      scaledPoints[i][1] - scaledPoints[i-1][1]
    ])
  }
  // Sluit de polygoon
  lines.push([
    scaledPoints[0][0] - scaledPoints[scaledPoints.length-1][0],
    scaledPoints[0][1] - scaledPoints[scaledPoints.length-1][1]
  ])
  
  doc.lines(lines, startX, startY, [1, 1], 'FD', true)
}

export function exportToPDF({ mode, results, stock, parts, settings }) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()  // 297mm
  const pageHeight = doc.internal.pageSize.getHeight() // 210mm
  const margin = 15

  // Kleuren (als RGB arrays)
  const violet = [89, 86, 120]
  const verdigris = [77, 166, 155]
  const gray = [100, 100, 100]
  const lightGray = [200, 200, 200]
  const amber = [245, 158, 11]
  const amberLight = [254, 243, 199]
  const emerald = [16, 185, 129]
  const emeraldLight = [209, 250, 229]

  // Vaste diagram box - hoogte is leidend
  const diagramX = margin
  const diagramY = 45
  const diagramMaxWidth = 180
  const diagramMaxHeight = 110

  // Part kleuren
  const partColors = [
    [129, 199, 132], // groen
    [100, 181, 246], // blauw
    [255, 183, 77],  // oranje
    [186, 104, 200], // paars
    [240, 98, 146],  // roze
    [77, 208, 225],  // cyan
    [255, 138, 128], // koraal
    [174, 213, 129], // lime
  ]

  // === VOORBLAD ===
  drawHeader(doc, pageWidth, margin, violet)
  
  let yPos = 35

  // Samenvatting
  doc.setTextColor(...violet)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Zaagplan Samenvatting', margin, yPos)
  yPos += 10

  doc.setTextColor(...gray)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const summaryLines = [
    `Modus: ${mode === '2d' ? '2D Plaatmateriaal' : '1D Lineair'}`,
    `Datum: ${new Date().toLocaleDateString('nl-NL')}`,
    `Zaagblad dikte: ${settings.kerf} mm`,
    `Frees dikte: ${settings.routerKerf || 6} mm`,
    `Algoritme: ${settings.algorithm}`,
    ``,
    `Totaal ${mode === '2d' ? 'platen' : 'balken'}: ${results.summary.totalSheets}`,
    `Totaal stukken: ${results.summary.totalParts}`,
    `Gemiddelde benutting: ${results.summary.avgEfficiency.toFixed(1)}%`
  ]

  summaryLines.forEach(line => {
    doc.text(line, margin, yPos)
    yPos += 6
  })

  // Overzicht tabel
  yPos += 10
  doc.setTextColor(...violet)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Overzicht ${mode === '2d' ? 'Platen' : 'Balken'}`, margin, yPos)
  yPos += 8

  // Tabel header
  doc.setFillColor(240, 240, 240)
  doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 7, 'F')
  
  doc.setTextColor(...gray)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('#', margin + 2, yPos)
  doc.text('Materiaal', margin + 12, yPos)
  doc.text('Afmeting', margin + 80, yPos)
  doc.text('Stukken', margin + 130, yPos)
  doc.text('Benutting', margin + 160, yPos)
  doc.text('Type', margin + 190, yPos)
  yPos += 6

  doc.setFont('helvetica', 'normal')
  results.sheets.forEach((sheet, i) => {
    const afmeting = mode === '2d' 
      ? `${sheet.length} × ${sheet.width} mm`
      : `${sheet.length} mm`
    
    doc.text(String(i + 1), margin + 2, yPos)
    doc.text(sheet.name, margin + 12, yPos)
    doc.text(afmeting, margin + 80, yPos)
    doc.text(String(sheet.parts.length), margin + 130, yPos)
    doc.text(`${sheet.efficiency.toFixed(1)}%`, margin + 160, yPos)
    doc.text(sheet.isVirtual ? '♻️ Uit gat' : 'Standaard', margin + 190, yPos)
    yPos += 5
  })

  // === PLAAT PAGINA'S ===
  results.sheets.forEach((sheet, sheetIndex) => {
    doc.addPage()
    
    // Header
    drawHeader(doc, pageWidth, margin, sheet.isVirtual ? emerald : violet)

    // Plaat titel
    doc.setTextColor(...(sheet.isVirtual ? emerald : violet))
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const virtualLabel = sheet.isVirtual ? ' ♻️ (uit gat)' : ''
    const sheetTitle = mode === '2d'
      ? `Plaat ${sheetIndex + 1}: ${sheet.name}${virtualLabel} (${sheet.length} × ${sheet.width} mm)`
      : `Balk ${sheetIndex + 1}: ${sheet.name} (${sheet.length} mm)`
    doc.text(sheetTitle, margin, 35)

    // Benutting badge
    doc.setFillColor(...verdigris)
    doc.roundedRect(pageWidth - margin - 35, 28, 35, 10, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.text(`${sheet.efficiency.toFixed(1)}%`, pageWidth - margin - 17.5, 34.5, { align: 'center' })

    if (mode === '2d') {
      // === 2D DIAGRAM ===
      // Bereken schaal - hoogte is maatgevend
      const scaleByHeight = diagramMaxHeight / sheet.width
      const scaleByWidth = diagramMaxWidth / sheet.length
      const scale = Math.min(scaleByHeight, scaleByWidth)

      const diagramWidth = sheet.length * scale
      const diagramHeight = sheet.width * scale

      // Centreer diagram horizontaal in beschikbare ruimte
      const diagramStartX = diagramX + (diagramMaxWidth - diagramWidth) / 2

      // Achtergrond plaat
      doc.setFillColor(...(sheet.isVirtual ? emeraldLight : [245, 245, 245]))
      doc.setDrawColor(...(sheet.isVirtual ? emerald : lightGray))
      doc.setLineWidth(0.5)
      doc.rect(diagramStartX, diagramY, diagramWidth, diagramHeight, 'FD')

      // Maatvoering boven (lengte)
      doc.setDrawColor(...gray)
      doc.setLineWidth(0.3)
      const dimY = diagramY - 3
      doc.line(diagramStartX, dimY, diagramStartX + diagramWidth, dimY)
      doc.line(diagramStartX, dimY - 2, diagramStartX, dimY + 2)
      doc.line(diagramStartX + diagramWidth, dimY - 2, diagramStartX + diagramWidth, dimY + 2)
      
      doc.setTextColor(...gray)
      doc.setFontSize(8)
      doc.text(`${sheet.length} mm`, diagramStartX + diagramWidth / 2, dimY - 1, { align: 'center' })

      // Maatvoering links (breedte)
      const dimX = diagramStartX - 3
      doc.line(dimX, diagramY, dimX, diagramY + diagramHeight)
      doc.line(dimX - 2, diagramY, dimX + 2, diagramY)
      doc.line(dimX - 2, diagramY + diagramHeight, dimX + 2, diagramY + diagramHeight)
      
      // Verticale tekst voor breedte
      doc.text(`${sheet.width} mm`, dimX - 5, diagramY + diagramHeight / 2, { angle: 90 })

      // Teken stukken
      sheet.parts.forEach((part, partIndex) => {
        const color = partColors[partIndex % partColors.length]
        const x = diagramStartX + part.x * scale
        const y = diagramY + part.y * scale
        const w = part.length * scale
        const h = part.width * scale

        // Check of dit een complex stuk is
        const boundary = parseBoundary(part.boundary)
        const holes = parseHoles(part.holes)
        const isComplex = boundary && boundary.length > 4

        if (isComplex) {
          // Teken complexe vorm als polygoon
          drawPolygon(doc, boundary, diagramStartX + part.x * scale, diagramY + part.y * scale, scale, color, [80, 80, 80])
          
          // Teken gaten
          holes.forEach(hole => {
            if (hole.type === 'circle') {
              // Cirkel gat
              const cx = diagramStartX + (part.x + hole.cx) * scale
              const cy = diagramY + (part.y + hole.cy) * scale
              const r = (hole.d / 2) * scale
              
              doc.setFillColor(245, 245, 245)
              doc.setDrawColor(...amber)
              doc.setLineWidth(0.3)
              doc.circle(cx, cy, r, 'FD')
            } else if (hole.type === 'poly') {
              // Rechthoekig gat
              drawPolygon(doc, hole.points, diagramStartX + part.x * scale, diagramY + part.y * scale, scale, amberLight, amber)
              
              // Label voor rechthoekig gat (herbruikbaar)
              const hx = diagramStartX + (part.x + hole.bounds.x + hole.bounds.w / 2) * scale
              const hy = diagramY + (part.y + hole.bounds.y + hole.bounds.h / 2) * scale
              
              doc.setTextColor(...amber)
              doc.setFontSize(6)
              doc.text(`${Math.round(hole.bounds.w)}×${Math.round(hole.bounds.h)}`, hx, hy, { align: 'center' })
              doc.setFontSize(5)
              doc.text('(herbruikbaar)', hx, hy + 3, { align: 'center' })
            }
          })
        } else {
          // Standaard rechthoek
          doc.setFillColor(...color)
          doc.setDrawColor(80, 80, 80)
          doc.setLineWidth(0.3)
          doc.rect(x, y, w, h, 'FD')
        }

        // Part nummer in cirkel
        const circleX = x + 4
        const circleY = y + 4
        doc.setFillColor(...violet)
        doc.circle(circleX, circleY, 3, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.text(String(part.number), circleX, circleY + 1, { align: 'center' })

        // Afmeting in stuk (alleen als groot genoeg en niet complex)
        if (!isComplex && w > 20 && h > 10) {
          doc.setTextColor(50, 50, 50)
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          const dimText = `${part.length}×${part.width}`
          doc.text(dimText, x + w / 2, y + h / 2 + 1, { align: 'center' })
        }
      })

      // Stuklijst rechts van diagram
      const listX = diagramStartX + diagramWidth + 15
      const listY = diagramY

      doc.setTextColor(...violet)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Stuklijst', listX, listY)

      // Tabel header
      doc.setFillColor(240, 240, 240)
      doc.rect(listX, listY + 3, 75, 6, 'F')
      
      doc.setTextColor(...gray)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('#', listX + 2, listY + 7)
      doc.text('Naam', listX + 10, listY + 7)
      doc.text('L×B', listX + 45, listY + 7)
      doc.text('Type', listX + 68, listY + 7)

      doc.setFont('helvetica', 'normal')
      sheet.parts.forEach((part, i) => {
        const rowY = listY + 12 + i * 5
        if (rowY < diagramY + diagramMaxHeight) {
          const isComplex = part.boundary && parseBoundary(part.boundary)?.length > 4
          doc.text(String(part.number), listX + 2, rowY)
          doc.text(part.name.substring(0, 12), listX + 10, rowY)
          doc.text(`${part.length}×${part.width}`, listX + 45, rowY)
          doc.text(isComplex ? '⬡' : (part.rotated ? '↻' : '▭'), listX + 70, rowY)
        }
      })

    } else {
      // === 1D DIAGRAM ===
      const scale = diagramMaxWidth / sheet.length
      const barHeight = 20
      const barY = diagramY + 20

      // Balk achtergrond
      doc.setFillColor(245, 245, 245)
      doc.setDrawColor(...lightGray)
      doc.rect(diagramX, barY, diagramMaxWidth, barHeight, 'FD')

      // Maatvoering boven
      doc.setDrawColor(...gray)
      doc.setLineWidth(0.3)
      doc.line(diagramX, barY - 3, diagramX + diagramMaxWidth, barY - 3)
      doc.line(diagramX, barY - 5, diagramX, barY - 1)
      doc.line(diagramX + diagramMaxWidth, barY - 5, diagramX + diagramMaxWidth, barY - 1)
      
      doc.setTextColor(...gray)
      doc.setFontSize(8)
      doc.text(`${sheet.length} mm`, diagramX + diagramMaxWidth / 2, barY - 5, { align: 'center' })

      // Teken stukken
      let xOffset = 0
      sheet.parts.forEach((part, partIndex) => {
        const color = partColors[partIndex % partColors.length]
        const x = diagramX + xOffset * scale
        const w = part.length * scale

        doc.setFillColor(...color)
        doc.setDrawColor(80, 80, 80)
        doc.rect(x, barY, w, barHeight, 'FD')

        // Nummer
        doc.setTextColor(50, 50, 50)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(String(part.number), x + w / 2, barY + barHeight / 2 + 2, { align: 'center' })

        xOffset += part.length + settings.kerf
      })

      // Stuklijst onder diagram
      const listY = barY + barHeight + 15
      doc.setTextColor(...violet)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Stuklijst', diagramX, listY)

      doc.setTextColor(...gray)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      sheet.parts.forEach((part, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const x = diagramX + col * 60
        const y = listY + 8 + row * 6
        doc.text(`#${part.number} ${part.name} (${part.length}mm)`, x, y)
      })
    }
  })

  // === FOOTER op alle pagina's ===
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setTextColor(150, 150, 150)
    doc.setFontSize(8)
    doc.text(
      `Pagina ${i} van ${totalPages} - CutList Optimizer - OpenAEC`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }

  // Download
  const timestamp = new Date().toISOString().slice(0, 10)
  doc.save(`zaagplan_${timestamp}.pdf`)
}

/**
 * Teken header op pagina
 */
function drawHeader(doc, pageWidth, margin, color) {
  doc.setFillColor(...color)
  doc.rect(0, 0, pageWidth, 20, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CutList Optimizer - Zaagplan', margin, 13)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('OpenAEC', pageWidth - margin, 13, { align: 'right' })
}
