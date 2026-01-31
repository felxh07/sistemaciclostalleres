const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. TAREA 5: Global Logging Middleware (First!)
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [${timestamp}] ${req.method} ${req.url}`);
    console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
    next();
});

// 2. Standard Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Multer Setup with Error Handling
// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
    console.log('✅ Created uploads directory');
}

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit per file
}).fields([
    { name: 'firma', maxCount: 1 },
    { name: 'voucher', maxCount: 1 }
]);

// Wrapper to catch Multer errors
const uploadMiddleware = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('❌ [Multer Error] File upload failed:', err);
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ success: false, message: `Error de archivo: ${err.message}`, code: err.code });
            }
            return res.status(500).json({ success: false, message: 'Error interno subiendo archivos', details: err.message });
        }
        next();
    });
};

const path = require('path');
// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Routes
const registrationController = require('./src/controllers/registrationController');

app.post('/api/register',
    uploadMiddleware,
    registrationController.checkDuplicate,
    registrationController.handleRegistration
);

// 4. Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ [Unhandled Server Error] Stack:', err.stack);
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            message: 'Error interno crítico del servidor.',
            details: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log('✅ SERVIDOR INICIADO CORRECTAMENTE');
    console.log(`Server running on port ${PORT}`);
});

// TAREA 4 (User Request): Error Listeners
process.on('uncaughtException', (error) => {
    console.error('🔥 [CRITICAL] UNCAUGHT EXCEPTION:', error);
    console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 [CRITICAL] UNHANDLED REJECTION:', reason);
    if (reason instanceof Error) {
        console.error(reason.stack);
    }
});
