const sheetService = require('../services/sheetService');
const pdfService = require('../services/pdfService');

async function checkDuplicate(req, res, next) {
    try {
        const { dni } = req.body;
        const exists = await sheetService.checkDniExists(dni);
        if (exists) {
            // Delete uploaded files if duplicate to save space
            if (req.files.firma) require('fs').unlinkSync(req.files.firma[0].path);
            if (req.files.voucher) require('fs').unlinkSync(req.files.voucher[0].path);

            return res.status(400).json({ success: false, message: 'El DNI ya está registrado.' });
        }
        next();
    } catch (error) {
        console.error('❌ [CheckDuplicate Error] Detalles:', error);
        res.status(500).json({
            success: false,
            message: 'Error verificando duplicados (Sheet logic).',
            details: error.message,
            stack: error.stack
        });
    }
}

async function handleRegistration(req, res) {
    console.log("ENDPOINT LLAMADO - Datos:", JSON.stringify(req.body, null, 2));

    // TAREA 4: Validar configuración
    const requiredEnv = [
        'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN',
        'GOOGLE_SHEET_ID', 'GOOGLE_DRIVE_FOLDER_ID', 'TEMPLATE_DOC_ID'
    ];
    const missingEnv = requiredEnv.filter(key => !process.env[key]);
    if (missingEnv.length > 0) {
        console.error(`❌ [Config Error] Faltan variables de entorno: ${missingEnv.join(', ')}`);
        return res.status(500).json({
            success: false,
            message: 'Error de configuración del servidor (Environment Variables).',
            details: `Missing: ${missingEnv.join(', ')}`
        });
    }

    try {
        console.log('🔍 Datos recibidos (Body):', JSON.stringify(req.body, null, 2));
        // Avoid potentially circular structures or huge buffers in files log
        if (req.files) {
            console.log('🔍 Archivos recibidos:', Object.keys(req.files).map(key => ({
                field: key,
                name: req.files[key][0].originalname,
                mimetype: req.files[key][0].mimetype,
                size: req.files[key][0].size
            })));
        } else {
            console.warn('⚠️ No se recibieron archivos en req.files');
        }

        const { dni, nombre, programa, email, telefono, domicilio } = req.body;
        const files = req.files; // { firma: [...], voucher: [...] }

        // Basic Validation
        if (!dni || !nombre || !programa || !email || !telefono || !domicilio) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
        }
        if (!files.firma || !files.voucher) {
            return res.status(400).json({ success: false, message: 'Faltan archivos (firma o voucher).' });
        }

        // 1. Respond Immediately
        res.json({ success: true, message: 'Inscripción recibida. Se está procesando.' });

        // 2. Background Process
        (async () => {
            try {
                console.log(`\n🚀 [Background] Iniciando proceso para DNI: ${dni}`);

                // Generate PDF & Upload
                console.log('👉 [Paso 1] Iniciando generación de PDF...');
                const pdfUrl = await pdfService.generateAndUploadPDF({
                    dni, nombre, programa, email, telefono, domicilio
                }, files);
                console.log(`✅ [Paso 1 Completado] PDF generado: ${pdfUrl}`);

                // Add to Sheet
                console.log('👉 [Paso 2] Agregando a Google Sheet...');
                await sheetService.addToSheet({
                    dni, nombre, programa, email, telefono, domicilio
                }, pdfUrl);

                console.log(`✅ [Paso 2 Completado] Row agregada al Sheet.`);
                console.log(`🎉 [Proceso Exitoso] Inscripción completada para ${dni}`);

            } catch (bgError) {
                console.error(`❌ [Background Error] Falló el proceso para DNI ${dni}:`);
                console.error('Stack:', bgError.stack);
                console.error('Message:', bgError.message);
                if (bgError.response) {
                    console.error('Google API Error Details:', JSON.stringify(bgError.response.data, null, 2));
                }
            }
        })();

    } catch (error) {
        console.error("ERROR COMPLETO:", error);
        console.error("STACK:", error.stack);

        // If we haven't sent headers yet
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error al procesar la inscripción.',
                details: error.message, // TEMPORAL
                stack: error.stack      // TEMPORAL
            });
        }
    }
}

module.exports = {
    checkDuplicate,
    handleRegistration
};
