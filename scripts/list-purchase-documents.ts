#!/usr/bin/env ts-node

/**
 * Script to list and download documents from a purchase
 * 
 * Usage:
 *   ts-node scripts/list-purchase-documents.ts <purchaseId>
 *   ts-node scripts/list-purchase-documents.ts <purchaseId> --download-all
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { db, storage } from '../src/lib/firebase-admin';

interface PackageFile {
  downloadUrl: string;
  storagePath: string;
}

interface PackageFiles {
  templateDocx?: PackageFile;
  templatePdf?: PackageFile;
  sampleDocx?: PackageFile;
  samplePdf?: PackageFile;
  studyMaterialPdf?: PackageFile;
}

interface PurchaseItem {
  id: string;
  name: string;
  packageFiles?: PackageFiles;
}

async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filename, Buffer.from(buffer));
    console.log(`  ✅ Descargado: ${filename}`);
  } catch (error) {
    console.error(`  ❌ Error descargando ${filename}:`, error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Uso:');
    console.log('  ts-node scripts/list-purchase-documents.ts <purchaseId>');
    console.log('  ts-node scripts/list-purchase-documents.ts <purchaseId> --download-all');
    process.exit(1);
  }

  const purchaseId = args[0];
  const shouldDownload = args.includes('--download-all');
  
  try {
    console.log(`🔍 Buscando compra: ${purchaseId}...\n`);
    
    const purchaseDoc = await db().collection('purchases').doc(purchaseId).get();
    
    if (!purchaseDoc.exists) {
      console.error(`❌ Compra no encontrada: ${purchaseId}`);
      process.exit(1);
    }
    
    const purchase = purchaseDoc.data() as any;
    const items = (purchase?.items || []) as PurchaseItem[];
    
    console.log(`📦 Compra: ${purchaseId}`);
    console.log(`   Usuario: ${purchase?.userId || 'N/A'}`);
    console.log(`   Email: ${purchase?.customerEmail || 'N/A'}`);
    console.log(`   Fecha: ${purchase?.createdAt?.toDate?.()?.toLocaleDateString('es-ES') || 'N/A'}`);
    console.log(`   Items: ${items.length}\n`);
    
    const downloadDir = shouldDownload ? `downloads/${purchaseId}` : '';
    if (shouldDownload) {
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      console.log(`📥 Descargando documentos a: ${downloadDir}/\n`);
    }
    
    items.forEach((item: PurchaseItem, index: number) => {
      console.log(`\n📄 Item ${index + 1}: ${item.name}`);
      console.log(`   ID: ${item.id}`);
      
      if (!item.packageFiles) {
        console.log(`   ⚠️  No hay documentos generados para este item`);
        return;
      }
      
      const files: PackageFiles = item.packageFiles || {};
      let fileCount = 0;
      
      // Template files
      if (files?.templatePdf?.downloadUrl) {
        fileCount++;
        console.log(`   📝 Plantilla (PDF): ${files.templatePdf.downloadUrl.substring(0, 80)}...`);
        if (shouldDownload) {
          const filename = `${downloadDir}/${item.name.replace(/[^a-z0-9]/gi, '_')}-plantilla.pdf`;
          downloadFile(files.templatePdf.downloadUrl, filename);
        }
      }
      
      if (files?.templateDocx?.downloadUrl) {
        fileCount++;
        console.log(`   📝 Plantilla (Word): ${files.templateDocx.downloadUrl.substring(0, 80)}...`);
        if (shouldDownload) {
          const filename = `${downloadDir}/${item.name.replace(/[^a-z0-9]/gi, '_')}-plantilla.docx`;
          downloadFile(files.templateDocx.downloadUrl, filename);
        }
      }
      
      // Sample files
      if (files?.samplePdf?.downloadUrl) {
        fileCount++;
        console.log(`   📋 Ejemplo (PDF): ${files.samplePdf.downloadUrl.substring(0, 80)}...`);
        if (shouldDownload) {
          const filename = `${downloadDir}/${item.name.replace(/[^a-z0-9]/gi, '_')}-ejemplo.pdf`;
          downloadFile(files.samplePdf.downloadUrl, filename);
        }
      }
      
      if (files?.sampleDocx?.downloadUrl) {
        fileCount++;
        console.log(`   📋 Ejemplo (Word): ${files.sampleDocx.downloadUrl.substring(0, 80)}...`);
        if (shouldDownload) {
          const filename = `${downloadDir}/${item.name.replace(/[^a-z0-9]/gi, '_')}-ejemplo.docx`;
          downloadFile(files.sampleDocx.downloadUrl, filename);
        }
      }
      
      // Study material
      if (files?.studyMaterialPdf?.downloadUrl) {
        fileCount++;
        console.log(`   📚 Material de Estudio (PDF): ${files.studyMaterialPdf.downloadUrl.substring(0, 80)}...`);
        if (shouldDownload) {
          const filename = `${downloadDir}/${item.name.replace(/[^a-z0-9]/gi, '_')}-material-estudio.pdf`;
          downloadFile(files.studyMaterialPdf.downloadUrl, filename);
        }
      }
      
      console.log(`   ✅ Total documentos: ${fileCount}`);
    });
    
    if (shouldDownload) {
      console.log(`\n✅ Descarga completada. Archivos guardados en: ${downloadDir}/`);
    } else {
      console.log(`\n💡 Para descargar todos los archivos, ejecuta:`);
      console.log(`   npm run list:documents ${purchaseId} --download-all`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

