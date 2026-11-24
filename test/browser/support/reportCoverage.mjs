import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import libCoverage from 'istanbul-lib-coverage'
import libReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'
import { coverageDir } from './harnessPage.mjs'

import instrumentedFiles from './instrumentedFiles.cjs'
const map = libCoverage.createCoverageMap({})

for (const file of await readdir(coverageDir)) {
  const pages = JSON.parse(await readFile(path.join(coverageDir, file), 'utf8'))
  pages.forEach(coverage => map.merge(coverage))
}

reports.create('text').execute(libReport.createContext({ coverageMap: map }))

const measured = map.files()
let failed = false

for (const file of instrumentedFiles) {
  const measuredFile = measured.find(f => f.endsWith(`/${file}`))
  if (!measuredFile) {
    console.error(`${file}: never loaded by any test`)
    failed = true
    continue
  }

  const summary = map.fileCoverageFor(measuredFile).toSummary()
  const short = ['lines', 'statements', 'functions', 'branches'].filter(metric => summary[metric].pct !== 100)
  if (short.length > 0) {
    console.error(`${file}: below 100% for ${short.join(', ')}`)
    failed = true
  }
}

if (failed) process.exitCode = 1
