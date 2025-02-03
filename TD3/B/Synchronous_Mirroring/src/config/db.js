const { MongoClient } = require('mongodb');

const configs = {
    primary: process.env.MONGODB_URI_PRIMARY || 'mongodb://localhost:27017/ecommerce_primary',
    secondary: process.env.MONGODB_URI_SECONDARY || 'mongodb://localhost:27018/ecommerce_secondary'
};

let primaryClient, secondaryClient;

async function connectDB() {
    try {
        // Connect to both databases simultaneously
        primaryClient = new MongoClient(configs.primary);
        secondaryClient = new MongoClient(configs.secondary);

        await Promise.all([
            primaryClient.connect(),
            secondaryClient.connect()
        ]);

        console.log('Connected to both primary and secondary MongoDB instances');
        return {
            primary: primaryClient.db(),
            secondary: secondaryClient.db()
        };
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

// Wrapper for synchronized operations
async function syncOperation(operation) {
    const session = primaryClient.startSession();
    
    try {
        // Start transaction
        session.startTransaction();

        // Execute operation on primary
        const primaryResult = await operation(primaryClient.db(), session);

        // Mirror operation on secondary
        const secondaryResult = await operation(secondaryClient.db(), session);

        // Verify both operations succeeded and results match
        if (JSON.stringify(primaryResult) !== JSON.stringify(secondaryResult)) {
            throw new Error('Synchronization error: Results do not match');
        }

        // Commit transaction
        await session.commitTransaction();
        return primaryResult;
    } catch (error) {
        // Rollback transaction if any error occurs
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
}

// Database operations with synchronous mirroring
const dbOperations = {
    async insertOne(collection, document) {
        return await syncOperation(async (db, session) => {
            const result = await db.collection(collection).insertOne(document, { session });
            return result;
        });
    },

    async updateOne(collection, filter, update, options = {}) {
        return await syncOperation(async (db, session) => {
            const result = await db.collection(collection).updateOne(
                filter, 
                update, 
                { ...options, session }
            );
            return result;
        });
    },

    async deleteOne(collection, filter) {
        return await syncOperation(async (db, session) => {
            const result = await db.collection(collection).deleteOne(filter, { session });
            return result;
        });
    },

    // Read operations can be performed from either database
    async findOne(collection, filter) {
        return await primaryClient.db().collection(collection).findOne(filter);
    },

    async find(collection, filter) {
        return await primaryClient.db().collection(collection).find(filter).toArray();
    },

    // Health check for both databases
    async checkHealth() {
        try {
            const primaryPing = await primaryClient.db().command({ ping: 1 });
            const secondaryPing = await secondaryClient.db().command({ ping: 1 });

            return {
                primary: primaryPing.ok === 1 ? 'healthy' : 'unhealthy',
                secondary: secondaryPing.ok === 1 ? 'healthy' : 'unhealthy',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }
};

function getPrimaryDB() {
    return primaryClient.db();
}

function getSecondaryDB() {
    return secondaryClient.db();
}

module.exports = {
    connectDB,
    syncOperation,
    dbOperations,
    getPrimaryDB,
    getSecondaryDB
};