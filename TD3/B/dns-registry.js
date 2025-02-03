const express = require('express');
const cors = require('cors');

const app = express();
const DNS_PORT = process.env.DNS_PORT || 3000;

// Store available servers
let activeServers = [];

app.use(cors());
app.use(express.json());

// Register a server
app.post('/register', (req, res) => {
    const { serverUrl } = req.body;
    if (!activeServers.includes(serverUrl)) {
        activeServers.push(serverUrl);
    }
    res.json({ message: 'Server registered', activeServers });
});

// Get available server
app.get('/getServer', (req, res) => {
    if (activeServers.length === 0) {
        return res.status(503).json({ 
            code: 503, 
            message: 'No servers available' 
        });
    }
    
    // Simple round-robin selection
    const server = activeServers[0];
    activeServers.push(activeServers.shift());
    
    res.json({ 
        code: 200, 
        server 
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', activeServers });
});

app.listen(DNS_PORT, () => {
    console.log(`DNS Registry running on port ${DNS_PORT}`);
}); 