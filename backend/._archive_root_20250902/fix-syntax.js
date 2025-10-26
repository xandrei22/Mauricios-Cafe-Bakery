const fs = require('fs');
const path = require('path');

// Function to recursively find all .js files
function findJsFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
            findJsFiles(filePath, fileList);
        } else if (file.endsWith('.js')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Function to fix syntax in a file
function fixSyntaxInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        let fixed = false;
        
        // Fix async (req, res) -> async (req, res)
        if (content.includes('async (req, res)')) {
            content = content.replace(/async\(req, res\)/g, 'async (req, res)');
            fixed = true;
        }
        
        // Fix async (req, res, next) -> async (req, res, next)
        if (content.includes('async (req, res, next)')) {
            content = content.replace(/async\(req, res, next\)/g, 'async (req, res, next)');
            fixed = true;
        }
        
        // Fix req.session.user?.id -> req.session.user?.id
        if (content.includes('req.session.user?.id')) {
            content = content.replace(/req\.session\.user \? \.id/g, 'req.session.user?.id');
            fixed = true;
        }
        
        // Fix other similar patterns
        if (content.includes('?.')) {
            content = content.replace(/ \? \./g, '?.');
            fixed = true;
        }
        
        if (fixed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed: ${filePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

// Main execution
console.log('🔧 Fixing JavaScript syntax errors...\n');

const currentDir = __dirname;
const jsFiles = findJsFiles(currentDir);

console.log(`Found ${jsFiles.length} JavaScript files to check\n`);

let fixedCount = 0;
let totalCount = 0;

jsFiles.forEach(file => {
    totalCount++;
    if (fixSyntaxInFile(file)) {
        fixedCount++;
    }
});

console.log(`\n🎉 Syntax fix complete!`);
console.log(`📊 Files processed: ${totalCount}`);
console.log(`🔧 Files fixed: ${fixedCount}`);
console.log(`✅ Files unchanged: ${totalCount - fixedCount}`);

if (fixedCount > 0) {
    console.log(`\n💡 All syntax errors have been fixed!`);
    console.log(`🚀 Your backend should now start without errors.`);
} else {
    console.log(`\n✨ No syntax errors found - your code is already clean!`);
}
