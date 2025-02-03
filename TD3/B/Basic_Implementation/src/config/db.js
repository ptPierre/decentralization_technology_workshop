const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
let client;

async function connectDB() {
    try {
        client = new MongoClient(uri);
        await client.connect();
        console.log('Connected to MongoDB');
        return client.db();
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

function getDB() {
    return client.db();
}

module.exports = { connectDB, getDB }; 