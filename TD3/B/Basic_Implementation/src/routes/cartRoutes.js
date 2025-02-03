const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// POST /cart/:userId
router.post('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { productId, quantity } = req.body;
        
        // Verify product exists
        const product = await getDB()
            .collection('products')
            .findOne({ _id: new ObjectId(productId) });
            
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Update or create cart
        const result = await getDB().collection('carts').updateOne(
            { userId },
            {
                $push: {
                    items: {
                        productId: new ObjectId(productId),
                        quantity,
                        name: product.name,
                        price: product.price
                    }
                }
            },
            { upsert: true }
        );
        
        const updatedCart = await getDB()
            .collection('carts')
            .findOne({ userId });
            
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /cart/:userId
router.get('/:userId', async (req, res) => {
    try {
        const cart = await getDB()
            .collection('carts')
            .findOne({ userId: req.params.userId });
            
        if (!cart) {
            return res.json({ userId: req.params.userId, items: [] });
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /cart/:userId/item/:productId
router.delete('/:userId/item/:productId', async (req, res) => {
    try {
        const { userId, productId } = req.params;
        
        await getDB().collection('carts').updateOne(
            { userId },
            {
                $pull: {
                    items: { productId: new ObjectId(productId) }
                }
            }
        );
        
        const updatedCart = await getDB()
            .collection('carts')
            .findOne({ userId });
            
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 