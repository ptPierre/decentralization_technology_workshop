const { MongoClient } = require('mongodb');
const { Client } = require('pg');
const amqp = require('amqplib');

class MultiDBAsync {
    constructor() {
        this.mongoClient = new MongoClient(process.env.MONGODB_URI);
        this.pgClient = new Client({
            connectionString: process.env.POSTGRES_URI
        });
        this.channel = null;
    }

    async connect() {
        // Connect to databases and message queue
        await Promise.all([
            this.mongoClient.connect(),
            this.pgClient.connect(),
            this.setupMessageQueue()
        ]);

        // Start consumers
        this.startPgConsumer();
    }

    async setupMessageQueue() {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        this.channel = await connection.createChannel();
        await this.channel.assertQueue('pg_replication', { durable: true });
    }

    async startPgConsumer() {
        this.channel.consume('pg_replication', async (msg) => {
            if (msg !== null) {
                const operation = JSON.parse(msg.content.toString());
                try {
                    await this.replicateToPg(operation);
                    this.channel.ack(msg);
                } catch (error) {
                    console.error('PG replication failed:', error);
                    this.channel.nack(msg);
                }
            }
        });
    }

    async replicateToPg(operation) {
        const { type, table, data, condition } = operation;

        switch (type) {
            case 'insert':
                const columns = Object.keys(data).join(',');
                const values = Object.values(data);
                const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
                await this.pgClient.query(
                    `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
                    values
                );
                break;

            case 'update':
                const setClause = Object.keys(data)
                    .map((key, i) => `${key} = $${i + 1}`)
                    .join(',');
                await this.pgClient.query(
                    `UPDATE ${table} SET ${setClause} WHERE id = $${Object.keys(data).length + 1}`,
                    [...Object.values(data), condition.id]
                );
                break;

            case 'delete':
                await this.pgClient.query(
                    `DELETE FROM ${table} WHERE id = $1`,
                    [condition.id]
                );
                break;
        }
    }

    async insert(collection, document) {
        // Insert into MongoDB first
        const result = await this.mongoClient
            .db()
            .collection(collection)
            .insertOne(document);

        // Queue PostgreSQL replication
        await this.channel.sendToQueue(
            'pg_replication',
            Buffer.from(JSON.stringify({
                type: 'insert',
                table: collection,
                data: { ...document, _id: result.insertedId }
            })),
            { persistent: true }
        );

        return result;
    }

    // Additional methods for update, delete, etc.
}

module.exports = new MultiDBAsync(); 