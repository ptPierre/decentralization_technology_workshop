const { MongoClient } = require('mongodb');
const { Client } = require('pg');

class MultiDBSync {
    constructor() {
        this.mongoClient = new MongoClient(process.env.MONGODB_URI);
        this.pgClient = new Client({
            connectionString: process.env.POSTGRES_URI
        });
    }

    async connect() {
        await Promise.all([
            this.mongoClient.connect(),
            this.pgClient.connect()
        ]);
    }

    async syncInsert(collection, document) {
        // Start transaction
        const mongoSession = this.mongoClient.startSession();
        await mongoSession.startTransaction();
        
        try {
            // Insert into MongoDB
            const mongoResult = await this.mongoClient
                .db()
                .collection(collection)
                .insertOne(document, { session: mongoSession });

            // Insert into PostgreSQL
            const pgQuery = `
                INSERT INTO ${collection} 
                (${Object.keys(document).join(',')}) 
                VALUES (${Object.values(document).map((_, i) => `$${i + 1}`).join(',')})
            `;
            await this.pgClient.query(pgQuery, Object.values(document));

            // Commit MongoDB transaction
            await mongoSession.commitTransaction();
            return mongoResult;
        } catch (error) {
            // Rollback MongoDB transaction
            await mongoSession.abortTransaction();
            throw error;
        }
    }

    // Additional sync methods for update, delete, etc.
}

module.exports = new MultiDBSync(); 