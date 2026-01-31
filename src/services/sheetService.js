const { googleSheets, SHEET_ID } = require('../config/google');

/**
 * Checks if a DNI already exists in the sheet.
 * @param {string} dni 
 * @returns {Promise<boolean>}
 */
async function checkDniExists(dni) {
    try {
        console.log(`🔍 [SheetService] Checking DNI: ${dni} in Sheet ID: [${SHEET_ID}] Range: Maestro!C:C`);
        if (!SHEET_ID) throw new Error('SHEET_ID is undefined in SheetService');

        const response = await googleSheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Maestro!C:C',
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return false;

        return rows.flat().includes(dni);
    } catch (error) {
        console.error('❌ [SheetService Error] checkDniExists failed:', error);
        console.error(error.response ? error.response.data : 'No additional API response data');
        throw error;
    }
}

/**
 * Appends a new registration row to the sheet.
 * @param {Object} data 
 * @param {string} pdfUrl 
 */
async function addToSheet(data, pdfUrl) {
    try {
        console.log(`🔄 [Sheet Service] Preparando fila para DNI ${data.dni}...`);
        const timestamp = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

        const values = [[
            timestamp,          // A - FECHA_INSCRIPCIÓN
            data.programa,      // B - PROGRAMA
            data.dni,           // C - DNI
            data.nombre,        // D - NOMBRE_COMPLETO
            data.email,         // E - EMAIL
            data.telefono,      // F - TELÉFONO
            data.domicilio,     // G - DOMICILIO
            `=HYPERLINK("${pdfUrl}"; "Ver PDF Consolidado")`, // H - PDF_CONSOLIDADO (Changed comma to semicolon for universal validation, though usually comma works in API. But let's ensure it's a solid string)
            "Pendiente",        // I - ESTADO
            "",                 // J - OBSERVATIONS
            "",                 // K - VERIFICADO_POR
            ""                  // L - FECHA_VERIFICACIÓN
        ]];

        await googleSheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Maestro!A:L',
            valueInputOption: 'USER_ENTERED',
            resource: { values },
        });

        console.log(`✅ [Sheet Service] Row agregada exitosamente para DNI: ${data.dni}`);
    } catch (error) {
        console.error('❌ [Sheet Service Error] Error al agregar fila:', error);
        // Throwing here so background process catches it
        throw error;
    }
}

module.exports = {
    checkDniExists,
    addToSheet
};
