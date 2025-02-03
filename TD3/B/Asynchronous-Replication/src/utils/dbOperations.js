const { getPrimaryDB, getChannel } = require('../config/db');

class AsyncReplicationDB {
    static async insertOne(collection, document) {
        try {
            // Write to primary database
            const result = await getPrimaryDB()
                .collection(collection)
                .insertOne(document);

            // Queue replication operation
            await getChannel().sendToQueue(
                'db_replication',
                Buffer.from(JSON.stringify({
                    type: 'insert',
                    collection,
                    document: { ...document, _id: result.insertedId }
                })),
                { persistent: true }
            );

            return result;
        } catch (error) {
            console.error('Insert operation failed:', error);
            throw error;
        }
    }

    static async updateOne(collection, filter, update, options = {}) {
        try {
            // Write to primary database
            const result = await getPrimaryDB()
                .collection(collection)
                .updateOne(filter, update, options);

            // Queue replication operation
            await getChannel().sendToQueue(
                'db_replication',
                Buffer.from(JSON.stringify({
                    type: 'update',
                    collection,
                    filter,
                    update
                })),
                { persistent: true }
            );

            return result;
        } catch (error) {
            console.error('Update operation failed:', error);
            throw error;
        }
    }

    static async deleteOne(collection, filter) {
        try {
            // Write to primary database
            const result = await getPrimaryDB()
                .collection(collection)
                .deleteOne(filter);

            // Queue replication operation
            await getChannel().sendToQueue(
                'db_replication',
                Buffer.from(JSON.stringify({
                    type: 'delete',
                    collection,
                    filter
                })),
                { persistent: true }
            );

            return result;
        } catch (error) {
            console.error('Delete operation failed:', error);
            throw error;
        }
    }

    // Read operations only use primary database
    static async findOne(collection, filter) {
        return await getPrimaryDB()
            .collection(collection)
            .findOne(filter);
    }

    static async find(collection, filter) {
        return await getPrimaryDB()
            .collection(collection)
            .find(filter)
            .toArray();
    }

    // Batch operations
    static async insertMany(collection, documents) {
        try {
            // Write to primary database
            const result = await getPrimaryDB()
                .collection(collection)
                .insertMany(documents);

            // Queue batch replication
            const replicationPromises = documents.map((doc, index) =>
                getChannel().sendToQueue(
                    'db_replication',
                    Buffer.from(JSON.stringify({
                        type: 'insert',
                        collection,
                        document: { ...doc, _id: result.insertedIds[index] }
                    })),
                    { persistent: true }
                )
            );

            await Promise.all(replicationPromises);
            return result;
        } catch (error) {
            console.error('Batch insert operation failed:', error);
            throw error;
        }
    }

    // Check replication status
    static async checkReplicationStatus() {
        try {
            const primaryCount = await getPrimaryDB()
                .collection('_replicationStatus')
                .countDocuments();

            const channel = getChannel();
            const queueStatus = await channel.checkQueue('db_replication');

            return {
                pendingOperations: queueStatus.messageCount,
                primaryStatus: 'healthy',
                lastCheck: new Date()
            };
        } catch (error) {
            console.error('Status check failed:', error);
            throw error;
        }
    }
}

module.exports = AsyncReplicationDB;