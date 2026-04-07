#!/usr/bin/env node
/**
 * Release script — bumps version in apps/desktop/package.json,
 * commits, tags and pushes. GitHub Actions does the rest.
 *
 * Usage:
 *   npm run release          → patch bump (1.0.0 → 1.0.1)
 *   npm run release -- minor → minor bump (1.0.0 → 1.1.0)
 *   npm run release -- major → major bump (1.0.0 → 2.0.0)
 */

import { execSync } from "child_process"
import { readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const bump = process.argv[2] ?? "patch"
if (!["patch", "minor", "major"].includes(bump)) {
  console.error(`Invalid bump type: "${bump}". Use patch, minor or major.`)
  process.exit(1)
}

// Read current version from desktop package
const pkgPath = resolve(root, "apps/desktop/package.json")
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
const [major, minor, patch] = pkg.version.split(".").map(Number)

const next =
  bump === "major"
    ? `${major + 1}.0.0`
    : bump === "minor"
    ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`

console.log(`Bumping desktop version: ${pkg.version} → ${next}`)

pkg.version = next
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")

const tag = `v${next}`

execSync(`git add apps/desktop/package.json`, { cwd: root, stdio: "inherit" })
execSync(`git commit -m "chore: release ${tag}"`, { cwd: root, stdio: "inherit" })
execSync(`git tag ${tag}`, { cwd: root, stdio: "inherit" })
execSync(`git push && git push origin ${tag}`, { cwd: root, stdio: "inherit" })

console.log(`\nTag ${tag} pushed. GitHub Actions will build and publish the release.`)
