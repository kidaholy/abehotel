const mongoose = require('mongoose');
const Category = require('./lib/models/category').default;

async function checkSchema() {
    console.log('Validating Category Schema Enum...');
    const typePath = Category.schema.path('type');
    console.log('Enum values:', typePath.enumValues);
    
    if (typePath.enumValues.includes('distribution')) {
        console.log('✅ "distribution" is present in the schema enum.');
    } else {
        console.log('❌ "distribution" is MISSING from the schema enum.');
    }
    process.exit(0);
}

checkSchema();
