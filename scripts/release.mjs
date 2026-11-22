// Usage: yarn release <version>
// Bumps the manifests, commits, tags v<version> and pushes. The tag triggers
// .github/workflows/release.yml, which publishes to the stores.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const [version] = process.argv.slice(2)

if (!/^\d+\.\d+(\.\d+)?$/.test(version || '')) {
  throw new Error('Usage: yarn release <version>, e.g. yarn release 1.75')
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trimEnd()

if (git('branch', '--show-current') !== 'master') {
  throw new Error('Releases are made from master')
}

const otherChanges = git('status', '--porcelain').split('\n').filter(line => line && !line.endsWith(' CHANGELOG.md'))
if (otherChanges.length) {
  throw new Error(`Commit or stash these first:\n${otherChanges.join('\n')}`)
}

if (!readFileSync('CHANGELOG.md', 'utf8').split('\n').includes(version)) {
  throw new Error(`Add a "${version}" entry to CHANGELOG.md first - it becomes the release notes`)
}

for (const manifest of ['manifest_v2.json', 'manifest_v3.json']) {
  const content = readFileSync(manifest, 'utf8')
  writeFileSync(manifest, content.replace(/"version": "[^"]*"/, `"version": "${version}"`))
}

git('add', 'CHANGELOG.md', 'manifest_v2.json', 'manifest_v3.json')
git('commit', '-m', `Release ${version}`)
git('tag', `v${version}`)
git('push', 'origin', 'master', `v${version}`)

console.log(`Pushed v${version} - follow the Release workflow on GitHub Actions.`)
