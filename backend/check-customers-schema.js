const db = require('./config/db');

async function checkSchema() {
    try {
        const [columns] = await db.query('DESCRIBE customers');
        console.log('Customers table columns:');
        columns.forEach(col => {
                    console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''} ${col.Key ? `(${col.Key})` : ''}`);
    });
    
    // Check if email verification fields exist
    const emailVerifiedField = columns.find(col => col.Field === 'email_verified');
    const verificationTokenField = columns.find(col => col.Field === 'verification_token');
    const verificationExpiresField = columns.find(col => col.Field === 'verification_expires');
    
    console.log('\nEmail verification fields:');
    console.log('- email_verified:', emailVerifiedField ? 'EXISTS' : 'MISSING');
    console.log('- verification_token:', verificationTokenField ? 'EXISTS' : 'MISSING');
    console.log('- verification_expires:', verificationExpiresField ? 'EXISTS' : 'MISSING');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}




