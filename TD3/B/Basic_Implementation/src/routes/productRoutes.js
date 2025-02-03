const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// GET /products
router.get('/', async (req, res) => {
    try {
        const { category, inStock } = req.query;
        const query = {};
        
        if (category) query.category = category;
        if (inStock !== undefined) query.inStock = inStock === 'true';
        
        const products = await getDB().collection('products').find(query).toArray();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
    try {
        const product = await getDB()
            .collection('products')
            .findOne({ _id: new ObjectId(req.params.id) });
            
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /products
router.post('/', async (req, res) => {
    try {
        const { name, description, price, category, inStock } = req.body;
        const result = await getDB().collection('products').insertOne({
            name,
            description,
            price,
            category,
            inStock: Boolean(inStock),
            createdAt: new Date()
        });
        res.status(201).json({ _id: result.insertedId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /products/:id
router.put('/:id', async (req, res) => {
    try {
        const result = await getDB()
            .collection('products')
            .updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: req.body }
            );
            
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /products/:id
router.delete('/:id', async (req, res) => {
    try {
        const result = await getDB()
            .collection('products')
            .deleteOne({ _id: new ObjectId(req.params.id) });
            
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 