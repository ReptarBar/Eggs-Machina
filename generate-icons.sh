#!/bin/bash

# Script to generate app icons from SVG
# Requires ImageMagick (convert command) or Inkscape

SVG_FILE="assets/icons/icon-simple.svg"
OUTPUT_DIR="assets/icons"

echo "Generating app icons from $SVG_FILE..."

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "Using ImageMagick to convert SVG to PNG..."
    
    # Generate all required icon sizes
    convert "$SVG_FILE" -resize 16x16 "$OUTPUT_DIR/icon-16-new.png"
    convert "$SVG_FILE" -resize 32x32 "$OUTPUT_DIR/icon-32-new.png"
    convert "$SVG_FILE" -resize 48x48 "$OUTPUT_DIR/icon-48-new.png"
    convert "$SVG_FILE" -resize 64x64 "$OUTPUT_DIR/icon-64-new.png"
    convert "$SVG_FILE" -resize 96x96 "$OUTPUT_DIR/icon-96-new.png"
    convert "$SVG_FILE" -resize 128x128 "$OUTPUT_DIR/icon-128-new.png"
    convert "$SVG_FILE" -resize 256x256 "$OUTPUT_DIR/icon-256-new.png"
    
    echo "Icons generated successfully!"
    echo "New icons are saved as *-new.png files"
    echo "Replace the old icons with the new ones when ready"
    
elif command -v inkscape &> /dev/null; then
    echo "Using Inkscape to convert SVG to PNG..."
    
    # Generate all required icon sizes
    inkscape "$SVG_FILE" --export-png="$OUTPUT_DIR/icon-16-new.png" --export-width=16 --export-height=16
    inkscape "$SVG_FILE" --export-png="$OUTPUT_DIR/icon-32-new.png" --export-width=32 --export-height=32
    inkscape "$SVG_FILE" --export-png="$OUTPUT_DIR/icon-48-new.png" --export-width=48 --export-height=48
    inkscape "$SVG_FILE" --export-png="$OUTPUT_DIR/icon-64-new.png" --export-width=64 --export-height=64
    inkscape "$SVG_FILE" --export-png="$OUTPUT_DIR/icon-96-new.png" --export-width=96 --export-height=96
    inkscape "$SVG_FILE" --export-png="$OUTPUT_DIR/icon-128-new.png" --export-width=128 --export-height=128
    inkscape "$SVG_FILE" --export-png="$OUTPUT_DIR/icon-256-new.png" --export-width=256 --export-height=256
    
    echo "Icons generated successfully!"
    echo "New icons are saved as *-new.png files"
    echo "Replace the old icons with the new ones when ready"
    
else
    echo "Neither ImageMagick nor Inkscape found."
    echo "Please install one of them to convert SVG to PNG:"
    echo "  - ImageMagick: brew install imagemagick (macOS) or apt-get install imagemagick (Ubuntu)"
    echo "  - Inkscape: brew install inkscape (macOS) or apt-get install inkscape (Ubuntu)"
    echo ""
    echo "Alternatively, you can:"
    echo "1. Open the SVG file in a web browser"
    echo "2. Take screenshots at different sizes"
    echo "3. Use an online SVG to PNG converter"
    echo "4. Use any graphics software that supports SVG import"
fi
