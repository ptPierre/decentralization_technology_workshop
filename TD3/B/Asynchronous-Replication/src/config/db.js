const { MongoClient } = require('mongodb');
const amqp = require('amqplib');

const configs = {
    primary: process.env.MONGODB_URI_PRIMARY || 'mongodb://localhost:27017/ecommerce_primary',
    secondary: process.env.MONGODB_URI_SECONDARY || 'mongodb://localhost:27018/ecommerce_secondary',
    rabbitmq: process.env.RABBITMQ_URL || 'amqp://localhost'
};

let primaryClient, secondaryClient, channel;

// Initialize message queue connection
async function setupMessageQueue() {
    try {
        const connection = await amqp.connect(configs.rabbitmq);
        channel = await connection.createChannel();
        
        // Create queues for different operations
        await channel.assertQueue('db_replication', { durable: true });
        await channel.assertQueue('db_sync_status', { durable: true });
        
        console.log('Message queue setup completed');
    } catch (error) {
        console.error('Failed to setup message queue:', error);
        throw error;
    }
}

async function connectDB() {
    try {
        // Connect to databases
        primaryClient = new MongoClient(configs.primary);
        secondaryClient = new MongoClient(configs.secondary);

        await Promise.all([
            primaryClient.connect(),
            secondaryClient.connect(),
            setupMessageQueue()
        ]);

        // Start replication consumer
        startReplicationConsumer();

        console.log('Connected to databases and message queue');
        return {
            primary: primaryClient.db(),
            secondary: secondaryClient.db()
        };
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

// Consumer for replication queue
async function startReplicationConsumer() {
    try {
        channel.consume('db_replication', async (msg) => {
            if (msg !== null) {
                const operation = JSON.parse(msg.content.toString());
                
                try {
                    await executeReplication(operation);
                    channel.ack(msg);
                } catch (error) {
                    console.error('Replication failed:', error);
                    // Requeue the message for retry
                    channel.nack(msg);
                }
            }
        });
    } catch (error) {
        console.error('Failed to start consumer:', error);
    }
}

// Execute replication operation
async function executeReplication(operation) {
    const db = secondaryClient.db();
    const { type, collection, document, filter, update } = operation;

    switch (type) {
        case 'insert':
            await db.collection(collection).insertOne(document);
            break;
        case 'update':
            await db.collection(collection).updateOne(filter, update);
            break;
        case 'delete':
            await db.collection(collection).deleteOne(filter);
            break;
        default:
            throw new Error(`Unknown operation type: ${type}`);
    }
}

function getPrimaryDB() {
    return primaryClient.db();
}

function getSecondaryDB() {
    return secondaryClient.db();
}

function getChannel() {
    return channel;
}

module.exports = { 
    connectDB, 
    getPrimaryDB, 
    getSecondaryDB, 
    getChannel 
}; 