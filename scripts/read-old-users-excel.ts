/**
 * Script to read and display the contents of the old users Excel file
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/read-old-users-excel.ts
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const excelFilePath = path.resolve(__dirname, '../old_users/Usuario version antigua.xlsx');

async function readOldUsersExcel() {
  try {
    console.log('\n📖 Reading Excel file: Usuario version antigua.xlsx\n');
    
    // Check if file exists
    if (!fs.existsSync(excelFilePath)) {
      console.error(`❌ File not found: ${excelFilePath}`);
      process.exit(1);
    }
    
    console.log(`📁 File path: ${excelFilePath}\n`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(excelFilePath);
    
    // Get sheet names
    const sheetNames = workbook.SheetNames;
    console.log(`📋 Found ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}\n`);
    
    // Process each sheet
    sheetNames.forEach((sheetName, index) => {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`SHEET ${index + 1}/${sheetNames.length}: ${sheetName}`);
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false, // Convert dates and numbers to strings for display
        defval: '' // Default value for empty cells
      });
      
      if (jsonData.length === 0) {
        console.log('   (Sheet is empty)\n');
        return;
      }
      
      // Get headers from first row
      const headers = Object.keys(jsonData[0] as any);
      console.log(`📊 Columns (${headers.length}): ${headers.join(', ')}\n`);
      console.log(`📊 Total rows: ${jsonData.length}\n`);
      
      // Display first few rows as preview
      const previewRows = Math.min(10, jsonData.length);
      console.log(`📋 Preview (first ${previewRows} rows):\n`);
      
      // Create a table-like display
      const maxWidths: { [key: string]: number } = {};
      headers.forEach(header => {
        maxWidths[header] = Math.max(header.length, ...jsonData.slice(0, previewRows).map((row: any) => {
          const value = row[header] !== undefined ? String(row[header]) : '';
          return value.length;
        }));
      });
      
      // Print header
      const headerRow = headers.map(h => h.padEnd(maxWidths[h])).join(' | ');
      console.log(headerRow);
      console.log('-'.repeat(headerRow.length));
      
      // Print data rows
      jsonData.slice(0, previewRows).forEach((row: any, rowIndex: number) => {
        const dataRow = headers.map(h => {
          const value = row[h] !== undefined ? String(row[h]) : '';
          return value.substring(0, maxWidths[h]).padEnd(maxWidths[h]);
        }).join(' | ');
        console.log(dataRow);
      });
      
      if (jsonData.length > previewRows) {
        console.log(`\n   ... and ${jsonData.length - previewRows} more rows`);
      }
      
      console.log('\n');
      
      // Show summary statistics
      console.log('📊 Summary Statistics:\n');
      headers.forEach(header => {
        const values = jsonData.map((row: any) => row[header]).filter((v: any) => v !== '' && v !== undefined && v !== null);
        const uniqueValues = new Set(values);
        console.log(`   ${header}:`);
        console.log(`      - Non-empty values: ${values.length}/${jsonData.length}`);
        console.log(`      - Unique values: ${uniqueValues.size}`);
        if (uniqueValues.size <= 10 && uniqueValues.size > 0) {
          console.log(`      - Values: ${Array.from(uniqueValues).join(', ')}`);
        }
        console.log('');
      });
    });
    
    // Export to JSON for easier processing
    const outputJsonPath = path.resolve(__dirname, '../old_users/Usuario version antigua.json');
    const allData: { [sheetName: string]: any[] } = {};
    
    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      allData[sheetName] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    });
    
    fs.writeFileSync(outputJsonPath, JSON.stringify(allData, null, 2), 'utf-8');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💾 Data exported to JSON');
    console.log(`   File: ${outputJsonPath}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error: any) {
    console.error('\n❌ Error reading Excel file:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Main execution
readOldUsersExcel()
  .then(() => {
    console.log('✅ Read completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Read failed:', error);
    process.exit(1);
  });

