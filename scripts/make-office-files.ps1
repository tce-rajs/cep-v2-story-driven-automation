# Builds the Office test documents a teacher would upload (Word / Excel / PowerPoint, modern, legacy and
# OpenDocument formats) with the Office installed on this machine. Called by scripts/make-test-data.js.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\make-office-files.ps1 -OutDir test-data\positive
param([Parameter(Mandatory = $true)][string]$OutDir)

$ErrorActionPreference = 'Stop'
$OutDir = (Resolve-Path $OutDir).Path

# --- Word: a one-page lesson note (docx, doc, odt) ---
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Add()
  $doc.Content.Text = "Lesson plan: Electric Charges and Fields`r`r" +
    "Objectives: 1. Define electric charge. 2. State Coulomb's law. 3. Solve two numericals.`r`r" +
    "Activity: rub a comb on dry hair and pick up bits of paper. Discuss why it works.`r`r" +
    "Homework: NCERT exercise 1.1 to 1.5."
  $doc.SaveAs2((Join-Path $OutDir 'lesson-plan.docx'), 16)      # wdFormatXMLDocument
  $doc.SaveAs2((Join-Path $OutDir 'lesson-plan-legacy.doc'), 0) # wdFormatDocument (97-2003)
  $doc.SaveAs2((Join-Path $OutDir 'lesson-plan.odt'), 23)       # wdFormatOpenDocumentText
  $doc.Close(0)
} finally { $word.Quit() }

# --- Excel: a marks sheet (xlsx, xls, ods) ---
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Add()
  $ws = $wb.Worksheets.Item(1)
  $ws.Cells.Item(1, 1) = 'Roll No'; $ws.Cells.Item(1, 2) = 'Name'; $ws.Cells.Item(1, 3) = 'Marks (out of 25)'
  $names = 'Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Sara', 'Vihaan', 'Zoya'
  for ($i = 0; $i -lt $names.Count; $i++) {
    $ws.Cells.Item($i + 2, 1) = $i + 1
    $ws.Cells.Item($i + 2, 2) = $names[$i]
    $ws.Cells.Item($i + 2, 3) = 12 + (($i * 7) % 13)
  }
  $wb.SaveAs((Join-Path $OutDir 'marks-sheet.xlsx'), 51)       # xlOpenXMLWorkbook
  $wb.SaveAs((Join-Path $OutDir 'marks-sheet-legacy.xls'), 56) # xlExcel8
  $wb.SaveAs((Join-Path $OutDir 'marks-sheet.ods'), 60)        # xlOpenDocumentSpreadsheet
  $wb.Close($false)
} finally { $excel.Quit() }

# --- PowerPoint: a 3-slide deck (pptx, ppt, odp) ---
$ppt = New-Object -ComObject PowerPoint.Application
try {
  $pres = $ppt.Presentations.Add(0) # no window
  $titles = 'Electric Charges', "Coulomb's Law", 'Practice Questions'
  for ($i = 0; $i -lt $titles.Count; $i++) {
    $slide = $pres.Slides.Add($i + 1, 2) # ppLayoutText
    $slide.Shapes.Item(1).TextFrame.TextRange.Text = $titles[$i]
    $slide.Shapes.Item(2).TextFrame.TextRange.Text = "Point one for slide $($i + 1)`rPoint two`rPoint three"
  }
  $pres.SaveAs((Join-Path $OutDir 'class-slides.pptx'), 24)       # ppSaveAsOpenXMLPresentation
  $pres.SaveAs((Join-Path $OutDir 'class-slides-legacy.ppt'), 1)  # ppSaveAsPresentation (97-2003)
  $pres.SaveAs((Join-Path $OutDir 'class-slides.odp'), 35)        # ppSaveAsOpenDocumentPresentation
  $pres.Close()
} finally { $ppt.Quit() }

Write-Output "Office files written to $OutDir"
