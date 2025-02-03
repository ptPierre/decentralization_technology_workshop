const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// POST /orders
router.post('/', async (req, res) => {
    try {
        const { userId, products } = req.body;
        
        // Calculate total price by fetching product details
        let totalPrice = 0;
        const productDetails = [];
        
        for (const item of products) {
            const product = await getDB()
                .collection('products')
                .findOne({ _id: new ObjectId(item.productId) });
                
            if (!product) {
                return res.status(404).json({ 
                    message: `Product ${item.productId} not found` 
                });
            }
            
            totalPrice += product.price * item.quantity;
            productDetails.push({
                productId: item.productId,
                quantity: item.quantity,
                price: product.price,
                name: product.name
            });
        }
        
        const order = {
            userId,
            products: productDetails,
            totalPrice,
            status: 'pending',
            createdAt: new Date()
        };
        
        const result = await getDB().collection('orders').insertOne(order);
        res.status(201).json({ _id: result.insertedId, ...order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /orders/:userId
router.get('/:userId', async (req, res) => {
    try {
        const orders = await getDB()
            .collection('orders')
            .find({ userId: req.params.userId })
            .toArray();
            
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 