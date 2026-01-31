const { googleDrive, googleDocs, FOLDER_ID } = require('../config/google');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp'); // For image processing if needed needed

// Template ID - This should be in ENV ideally, or hardcoded if user provided it (not yet)
const TEMPLATE_DOC_ID = process.env.TEMPLATE_DOC_ID;

async function createStudentFolder(dni) {
    try {
        const folderMetadata = {
            name: `carpeta-${dni}`,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [FOLDER_ID]
        };
        const file = await googleDrive.files.create({
            resource: folderMetadata,
            fields: 'id'
        });
        return file.data.id;
    } catch (error) {
        console.error('[Drive] Error creating folder:', error);
        throw error;
    }
}

async function generateAndUploadPDF(data, files) {
    try {
        console.log(`🔄 [PDF Service] Creando carpeta para DNI ${data.dni}...`);
        const studentFolderId = await createStudentFolder(data.dni);
        console.log(`✅ [PDF Service] Carpeta creada ID: ${studentFolderId}`);

        // 1. Copy Template
        // We assume TEMPLATE_DOC_ID exists. If not, this will fail. 
        // For now we will create a placeholder PDF if no template ID is set, or try to copy.
        let pdfDoc;

        if (!TEMPLATE_DOC_ID) {
            console.warn('⚠️ [PDF Service] TEMPLATE_DOC_ID no definido. Creando PDF en blanco.');
            pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();
            page.drawText(`Ficha de Matrícula - ${data.dni}\nPrograma: ${data.programa}\nNombre: ${data.nombre}`, {
                x: 50,
                y: 700,
                size: 15,
                color: rgb(0, 0, 0),
            });
        } else {
            // Copy Doc Logic here (omitted for brevity if not strictly required to simulate full Doc replacement flow in MVP without actual ID)
            // Ideally: Copy file -> batchUpdate replace text -> export PDF -> load into pdf-lib
            // For this step, I will stick to a simpler "Create PDF from scratch or logic" to ensure it works without the ID first, 
            // OR implements the logic assuming the ID is provided later.
            // Let's implement the logic assuming the ID is provided later.

            console.log('🔄 [PDF Service] Copiando plantilla Google Doc...');
            const copyResponse = await googleDrive.files.copy({
                fileId: TEMPLATE_DOC_ID,
                resource: { name: `Temp_Doc_${data.dni}` },
            });
            const newDocId = copyResponse.data.id;
            console.log(`✅ [PDF Service] Plantilla copiada ID: ${newDocId}`);

            // 2. Replace Variables
            console.log('🔄 [PDF Service] Reemplazando variables en el Doc...');
            const requests = [
                { replaceAllText: { containsText: { text: '{{PROGRAMA}}', matchCase: true }, replaceText: data.programa } },
                { replaceAllText: { containsText: { text: '{{NOMBRE}}', matchCase: true }, replaceText: data.nombre } },
                { replaceAllText: { containsText: { text: '{{DNI}}', matchCase: true }, replaceText: data.dni } },
                { replaceAllText: { containsText: { text: '{{DOMICILIO}}', matchCase: true }, replaceText: data.domicilio } },
                { replaceAllText: { containsText: { text: '{{FECHA}}', matchCase: true }, replaceText: new Date().toLocaleDateString() } },
            ];

            await googleDocs.documents.batchUpdate({
                documentId: newDocId,
                resource: { requests },
            });
            console.log('✅ [PDF Service] Variables reemplazadas.');

            // 3. Export to PDF Buffer
            console.log('🔄 [PDF Service] Exportando Doc a PDF...');
            const exportResponse = await googleDrive.files.export({
                fileId: newDocId,
                mimeType: 'application/pdf',
            }, { responseType: 'arraybuffer' });

            pdfDoc = await PDFDocument.load(exportResponse.data);
            console.log('✅ [PDF Service] Doc exportado y cargado en memoria.');

            // Clean up temp doc
            await googleDrive.files.delete({ fileId: newDocId });
            console.log('🗑️ [PDF Service] Documento temporal eliminado.');
        }


        // 4. Embed Signature
        console.log('🔄 [PDF Service] Procesando y optimizando firma (Sharp)...');
        if (files.firma && files.firma[0]) {
            try {
                // Initialize Sharp
                let pipeline = sharp(files.firma[0].path);

                // 2. Grayscale & Threshold
                pipeline = pipeline
                    .grayscale()
                    .threshold(180, { grayscale: true }); // Standard threshold

                // 3. Trim (Auto-crop whitespace)
                pipeline = pipeline.trim();

                // 4. Resize (Width 200px)
                pipeline = pipeline.resize({ width: 200, withoutEnlargement: false });

                // 5. Output as PNG buffer
                const processedSignatureBuffer = await pipeline.png().toBuffer();
                console.log('✅ [Signature] Procesamiento de imagen completado.');

                // Embed into PDF
                const signatureImage = await pdfDoc.embedPng(processedSignatureBuffer);

                // Get Config from ENV or defaults
                const envX = parseInt(process.env.FIRMA_X) || 100;
                const envY = parseInt(process.env.FIRMA_Y) || 150;
                const envW = parseInt(process.env.FIRMA_WIDTH) || 150;
                const envH = parseInt(process.env.FIRMA_HEIGHT) || 50;

                const firstPage = pdfDoc.getPages()[0];

                firstPage.drawImage(signatureImage, {
                    x: envX,
                    y: envY,
                    width: envW,
                    height: envH,
                });
                console.log(`✅ [PDF Service] Firma incrustada en (${envX}, ${envY}) [${envW}x${envH}]`);

            } catch (imgError) {
                console.error('❌ [Signature Error] Error procesando imagen:', imgError);
                console.warn('⚠️ [Signature Error] Intentando incrustar imagen original sin procesar...');

                // Fallback
                const rawBytes = await fs.readFile(files.firma[0].path);
                const rawImage = files.firma[0].mimetype === 'image/png'
                    ? await pdfDoc.embedPng(rawBytes)
                    : await pdfDoc.embedJpg(rawBytes);

                const firstPage = pdfDoc.getPages()[0];
                firstPage.drawImage(rawImage, {
                    x: parseInt(process.env.FIRMA_X) || 100,
                    y: parseInt(process.env.FIRMA_Y) || 150,
                    width: parseInt(process.env.FIRMA_WIDTH) || 150,
                    height: parseInt(process.env.FIRMA_HEIGHT) || 50,
                });
            }
        } else {
            console.warn('⚠️ [PDF Service] No se encontró archivo de firma.');
        }

        // 5. Append Voucher
        console.log('🔄 [PDF Service] Procesando voucher...');
        if (files.voucher && files.voucher[0]) {
            const voucherPath = files.voucher[0].path;
            const voucherMime = files.voucher[0].mimetype;

            if (voucherMime === 'application/pdf') {
                console.log('📄 [PDF Service] Voucher es PDF. Uniendo...');
                const voucherBytes = await fs.readFile(voucherPath);
                const voucherPdf = await PDFDocument.load(voucherBytes);
                const copiedPages = await pdfDoc.copyPages(voucherPdf, voucherPdf.getPageIndices());
                copiedPages.forEach((page) => pdfDoc.addPage(page));
            } else {
                console.log('🖼️ [PDF Service] Voucher es Imagen. Incrustando...');
                const voucherBytes = await fs.readFile(voucherPath);
                let voucherImage;
                if (voucherMime === 'image/png') {
                    voucherImage = await pdfDoc.embedPng(voucherBytes);
                } else if (voucherMime === 'image/jpeg' || voucherMime === 'image/jpg') {
                    voucherImage = await pdfDoc.embedJpg(voucherBytes);
                } else {
                    console.warn(`⚠️ [PDF Service] Formato de voucher no soportado para incrustar: ${voucherMime}`);
                }

                if (voucherImage) {
                    const page = pdfDoc.addPage();
                    page.drawImage(voucherImage, {
                        x: 50,
                        y: 50,
                        width: 500,
                        height: 500, // Adjust aspect ratio logic if needed
                    });
                }
            }
            console.log('✅ [PDF Service] Voucher anexado.');
        } else {
            console.warn('⚠️ [PDF Service] No se encontró archivo de voucher.');
        }

        // 6. Save Final PDF
        console.log('🔄 [PDF Service] Subiendo PDF final a Drive...');
        const pdfBytes = await pdfDoc.save();
        const finalFileName = `Ficha_Matricula_${data.dni}.pdf`;

        // Upload to Drive folder
        const fileMetadata = {
            name: finalFileName,
            parents: [studentFolderId]
        };

        // We need a readable stream for upload
        const { Readable } = require('stream');
        const media = {
            mimeType: 'application/pdf',
            body: Readable.from(Buffer.from(pdfBytes))
        };

        const uploadedFile = await googleDrive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink'
        });
        console.log(`✅ [PDF Service] PDF subido: ${uploadedFile.data.webViewLink}`);

        // Cleanup local uploaded temp files
        if (files.firma) await fs.remove(files.firma[0].path);
        if (files.voucher) await fs.remove(files.voucher[0].path);
        console.log('🗑️ [PDF Service] Archivos locales limpios.');

        return uploadedFile.data.webViewLink;

    } catch (error) {
        console.error('❌ [PDF Service Error] Detalles:', error);
        throw error;
    }
}

module.exports = {
    generateAndUploadPDF
};
