#!/usr/bin/env node
/**
 * Script to refactor all amber/yellow colors to blue/cyan theme
 * Usage: node scripts/refactor-amber-to-blue.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '../src');

// Color mapping rules
const REPLACEMENTS = [
    // Amber backgrounds → Info (cyan) for warnings, Primary (sky) for highlights
    { from: /bg-amber-50/g, to: 'bg-info-50' },
    { from: /bg-amber-100/g, to: 'bg-info-100' },
    { from: /bg-amber-200/g, to: 'bg-info-200' },
    { from: /bg-amber-300/g, to: 'bg-info-300' },
    { from: /bg-amber-400/g, to: 'bg-primary-400' },
    { from: /bg-amber-500/g, to: 'bg-primary-500' },
    { from: /bg-amber-600/g, to: 'bg-primary-600' },
    
    // Amber text → Info for warnings, Primary for highlights
    { from: /text-amber-50/g, to: 'text-info-50' },
    { from: /text-amber-100/g, to: 'text-info-100' },
    { from: /text-amber-200/g, to: 'text-info-200' },
    { from: /text-amber-300/g, to: 'text-info-300' },
    { from: /text-amber-400/g, to: 'text-primary-400' },
    { from: /text-amber-500/g, to: 'text-primary-500' },
    { from: /text-amber-600/g, to: 'text-primary-600' },
    { from: /text-amber-700/g, to: 'text-info-700' },
    { from: /text-amber-800/g, to: 'text-info-800' },
    { from: /text-amber-900/g, to: 'text-info-900' },
    
    // Amber borders → Info for warnings
    { from: /border-amber-50/g, to: 'border-info-50' },
    { from: /border-amber-100/g, to: 'border-info-100' },
    { from: /border-amber-200/g, to: 'border-info-200' },
    { from: /border-amber-300/g, to: 'border-info-300' },
    { from: /border-amber-400/g, to: 'border-primary-400' },
    { from: /border-amber-500/g, to: 'border-primary-500' },
    { from: /border-amber-600/g, to: 'border-primary-600' },
    
    // Amber rings
    { from: /ring-amber-50/g, to: 'ring-info-50' },
    { from: /ring-amber-100/g, to: 'ring-info-100' },
    { from: /ring-amber-200/g, to: 'ring-info-200' },
    { from: /ring-amber-300/g, to: 'ring-info-300' },
    { from: /ring-amber-400/g, to: 'ring-primary-400' },
    { from: /ring-amber-500/g, to: 'ring-primary-500' },
    { from: /ring-amber-600/g, to: 'ring-primary-600' },
    
    // Special cases - yellow references
    { from: /yellow-600/g, to: 'primary-600' },
    { from: /yellow-500/g, to: 'primary-500' },
];

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        REPLACEMENTS.forEach(({ from, to }) => {
            if (from.test(content)) {
                content = content.replace(from, to);
                modified = true;
            }
        });
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Updated: ${path.relative(SRC_DIR, filePath)}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
        return false;
    }
}

function findJsxFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findJsxFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.jsx')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Main execution
console.log('🔄 Refactoring amber/yellow colors to blue/cyan theme...\n');

const jsxFiles = findJsxFiles(SRC_DIR);
let updatedCount = 0;

jsxFiles.forEach(file => {
    if (processFile(file)) {
        updatedCount++;
    }
});

console.log(`\n✅ Refactoring complete! Updated ${updatedCount} files.`);

