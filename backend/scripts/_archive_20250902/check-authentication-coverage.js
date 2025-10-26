const fs = require('fs');
const path = require('path');

function checkAuthenticationCoverage() {
    console.log('🔒 Checking Authentication Coverage...\n');

    const routesDir = path.join(__dirname, '..', 'routes');
    const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

    const results = {
        protected: [],
        unprotected: [],
        partiallyProtected: []
    };

    routeFiles.forEach(file => {
        const filePath = path.join(routesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        const hasAuthMiddleware = content.includes('ensureAuthenticated') || 
                                content.includes('ensureAdminAuthenticated') ||
                                content.includes('authorizeRoles');
        
        const hasRouterUse = content.includes('router.use(') && 
                           (content.includes('ensureAuthenticated') || 
                            content.includes('ensureAdminAuthenticated'));

        if (hasRouterUse) {
            results.protected.push(file);
        } else if (hasAuthMiddleware) {
            results.partiallyProtected.push(file);
        } else {
            results.unprotected.push(file);
        }
    });

    console.log('✅ FULLY PROTECTED ROUTES:');
    results.protected.forEach(file => {
        console.log(`  - ${file}`);
    });

    console.log('\n⚠️  PARTIALLY PROTECTED ROUTES (middleware imported but not applied globally):');
    results.partiallyProtected.forEach(file => {
        console.log(`  - ${file}`);
    });

    console.log('\n❌ UNPROTECTED ROUTES (no authentication middleware):');
    results.unprotected.forEach(file => {
        console.log(`  - ${file}`);
    });

    console.log('\n📊 SUMMARY:');
    console.log(`  - Total route files: ${routeFiles.length}`);
    console.log(`  - Fully protected: ${results.protected.length}`);
    console.log(`  - Partially protected: ${results.partiallyProtected.length}`);
    console.log(`  - Unprotected: ${results.unprotected.length}`);

    if (results.unprotected.length > 0) {
        console.log('\n🚨 SECURITY ALERT: Unprotected routes found!');
        console.log('   These routes can be accessed without authentication.');
    }

    if (results.partiallyProtected.length > 0) {
        console.log('\n⚠️  WARNING: Partially protected routes found!');
        console.log('   These routes import authentication middleware but may not apply it to all routes.');
    }

    return results;
}

checkAuthenticationCoverage();

const path = require('path');

function checkAuthenticationCoverage() {
    console.log('🔒 Checking Authentication Coverage...\n');

    const routesDir = path.join(__dirname, '..', 'routes');
    const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

    const results = {
        protected: [],
        unprotected: [],
        partiallyProtected: []
    };

    routeFiles.forEach(file => {
        const filePath = path.join(routesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        const hasAuthMiddleware = content.includes('ensureAuthenticated') || 
                                content.includes('ensureAdminAuthenticated') ||
                                content.includes('authorizeRoles');
        
        const hasRouterUse = content.includes('router.use(') && 
                           (content.includes('ensureAuthenticated') || 
                            content.includes('ensureAdminAuthenticated'));

        if (hasRouterUse) {
            results.protected.push(file);
        } else if (hasAuthMiddleware) {
            results.partiallyProtected.push(file);
        } else {
            results.unprotected.push(file);
        }
    });

    console.log('✅ FULLY PROTECTED ROUTES:');
    results.protected.forEach(file => {
        console.log(`  - ${file}`);
    });

    console.log('\n⚠️  PARTIALLY PROTECTED ROUTES (middleware imported but not applied globally):');
    results.partiallyProtected.forEach(file => {
        console.log(`  - ${file}`);
    });

    console.log('\n❌ UNPROTECTED ROUTES (no authentication middleware):');
    results.unprotected.forEach(file => {
        console.log(`  - ${file}`);
    });

    console.log('\n📊 SUMMARY:');
    console.log(`  - Total route files: ${routeFiles.length}`);
    console.log(`  - Fully protected: ${results.protected.length}`);
    console.log(`  - Partially protected: ${results.partiallyProtected.length}`);
    console.log(`  - Unprotected: ${results.unprotected.length}`);

    if (results.unprotected.length > 0) {
        console.log('\n🚨 SECURITY ALERT: Unprotected routes found!');
        console.log('   These routes can be accessed without authentication.');
    }

    if (results.partiallyProtected.length > 0) {
        console.log('\n⚠️  WARNING: Partially protected routes found!');
        console.log('   These routes import authentication middleware but may not apply it to all routes.');
    }

    return results;
}

checkAuthenticationCoverage();
