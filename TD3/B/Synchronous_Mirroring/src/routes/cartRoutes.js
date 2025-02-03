const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { dbOperations } = require('../config/db');

// POST /cart/:userId
router.post('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { productId, quantity } = req.body;
        
        // Verify product exists
        const product = await dbOperations.findOne('products', {
            _id: new ObjectId(productId)
        });
            
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Update or create cart in both databases
        const result = await dbOperations.updateOne(
            'carts',
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
        
        const updatedCart = await dbOperations.findOne('carts', { userId });
        res.json({
            ...updatedCart,
            message: 'Cart updated in both databases'
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error updating cart in mirrored databases'
        });
    }
});

// GET /cart/:userId
router.get('/:userId', async (req, res) => {
    try {
        const cart = await dbOperations.findOne('carts', {
            userId: req.params.userId
        });
            
        if (!cart) {
            return res.json({ userId: req.params.userId, items: [] });
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error fetching cart from mirrored databases'
        });
    }
});

// DELETE /cart/:userId/item/:productId
router.delete('/:userId/item/:productId', async (req, res) => {
    try {
        const { userId, productId } = req.params;
        
        await dbOperations.updateOne(
            'carts',
            { userId },
            {
                $pull: {
                    items: { productId: new ObjectId(productId) }
                }
            }
        );
        
        const updatedCart = await dbOperations.findOne('carts', { userId });
        res.json({
            ...updatedCart,
            message: 'Item removed from cart in both databases'
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            details: 'Error removing item from cart in mirrored databases'
        });
    }
});

module.exports = router; 