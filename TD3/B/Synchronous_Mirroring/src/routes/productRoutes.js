const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { dbOperations } = require('../config/db');

// GET /products
router.get('/', async (req, res) => {
    try {
        const { category, inStock } = req.query;
        const query = {};
        
        if (category) query.category = category;
        if (inStock !== undefined) query.inStock = inStock === 'true';
        
        const products = await dbOperations.find('products', query);
        res.json(products);
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error fetching products from mirrored databases'
        });
    }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
    try {
        const product = await dbOperations.findOne('products', {
            _id: new ObjectId(req.params.id)
        });
            
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error fetching product from mirrored databases'
        });
    }
});

// POST /products
router.post('/', async (req, res) => {
    try {
        const { name, description, price, category, inStock } = req.body;
        
        // Validate required fields
        if (!name || !price) {
            return res.status(400).json({ 
                message: 'Name and price are required fields' 
            });
        }

        const product = {
            name,
            description,
            price: Number(price),
            category,
            inStock: Boolean(inStock),
            createdAt: new Date()
        };

        // Insert into both databases synchronously
        const result = await dbOperations.insertOne('products', product);
        res.status(201).json({ 
            _id: result.insertedId, 
            ...product,
            message: 'Product created in both databases'
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error creating product in mirrored databases'
        });
    }
});

// PUT /products/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, description, price, category, inStock } = req.body;
        const updateData = {};

        // Only include fields that are present in the request
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = Number(price);
        if (category !== undefined) updateData.category = category;
        if (inStock !== undefined) updateData.inStock = Boolean(inStock);
        updateData.updatedAt = new Date();

        const result = await dbOperations.updateOne(
            'products',
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
            
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ 
            message: 'Product updated successfully in both databases',
            updatedFields: updateData
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error updating product in mirrored databases'
        });
    }
});

// DELETE /products/:id
router.delete('/:id', async (req, res) => {
    try {
        const result = await dbOperations.deleteOne(
            'products',
            { _id: new ObjectId(req.params.id) }
        );
            
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ 
            message: 'Product deleted successfully from both databases',
            productId: req.params.id
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error deleting product from mirrored databases'
        });
    }
});

// GET /products/health
router.get('/health/check', async (req, res) => {
    try {
        const health = await dbOperations.checkHealth();
        res.json(health);
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error checking database health'
        });
    }
});

module.exports = router; 