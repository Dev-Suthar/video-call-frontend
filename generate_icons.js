const fs = require('fs');
const path = require('path');

// Create a simple base64 encoded PNG for a basic icon
const createBasicIcon = (size) => {
    // This is a simple 1x1 blue pixel PNG in base64
    // In a real scenario, you'd use a proper image generation library
    const base64Icon = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    return Buffer.from(base64Icon, 'base64');
};

// Create directories and icons for different densities
const iconSizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

// Create directories if they don't exist
Object.keys(iconSizes).forEach(density => {
    const dirPath = `android/app/src/main/res/mipmap-${density}`;
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// Generate basic icons (this will create placeholder icons)
Object.keys(iconSizes).forEach(density => {
    const iconData = createBasicIcon(iconSizes[density]);
    const iconPath = `android/app/src/main/res/mipmap-${density}/ic_launcher.png`;
    const roundIconPath = `android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`;

    fs.writeFileSync(iconPath, iconData);
    fs.writeFileSync(roundIconPath, iconData);

    console.log(`Generated ${density} icons (${iconSizes[density]}x${iconSizes[density]})`);
});

console.log("All launcher icons generated successfully!"); 