const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const axios = require('axios');

const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Register with DNS registry
async function registerWithDNS() {
    try {
        await axios.post('http://localhost:3000/register', {
            serverUrl: `localhost:${PORT}`
        });
        console.log('Registered with DNS registry');
    } catch (error) {
        console.error('Failed to register with DNS:', error.message);
    }
}

// Basic health check route
app.get('/', (req, res) => {
    res.json({ message: "Hello World!", server: `localhost:${PORT}` });
});

// Mount routes
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/cart', cartRoutes);

// Start server
async function startServer() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            registerWithDNS();
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer(); 