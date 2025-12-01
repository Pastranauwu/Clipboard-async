#!/usr/bin/env node

/**
 * Script para generar los iconos optimizados desde el icono principal
 * Genera:
 * - tray-icon.png (16x16) para la bandeja del sistema
 * - window-icon.png (256x256) para la ventana de la aplicación
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const assetsDir = path.join(__dirname, '..', 'assets');
const iconPath = path.join(assetsDir, 'icon.png');

async function generateIcon(size, outputName) {
  try {
    // Cargar imagen original
    const image = await loadImage(iconPath);
    
    // Crear canvas del tamaño especificado
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Dibujar imagen redimensionada con suavizado
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, size, size);
    
    // Guardar como PNG
    const outputPath = path.join(assetsDir, outputName);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`✓ ${outputName}: ${size}x${size} (${buffer.length} bytes)`);
    return buffer.length;
  } catch (error) {
    console.error(`✗ Error generating ${outputName}:`, error.message);
    return 0;
  }
}

async function generateAllIcons() {
  try {
    console.log('Generating icons from:', iconPath);
    
    const originalSize = fs.statSync(iconPath).size;
    const image = await loadImage(iconPath);
    console.log(`Original: ${image.width}x${image.height} (${originalSize} bytes)\n`);
    
    // Generar iconos
    await generateIcon(16, 'tray-icon.png');    // Para system tray
    await generateIcon(256, 'window-icon.png');  // Para ventana de aplicación
    
    console.log('\n✓ All icons generated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateAllIcons();
