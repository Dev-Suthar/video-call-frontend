#!/usr/bin/env python3
import base64
from PIL import Image, ImageDraw
import os


# Create a simple 108x108 icon with a blue background and white "VC" text
def create_icon(size):
    # Create image with blue background
    img = Image.new("RGBA", (size, size), (66, 133, 244, 255))
    draw = ImageDraw.Draw(img)

    # Add white "VC" text (Video Calling)
    try:
        # Try to use a default font
        from PIL import ImageFont

        font_size = size // 3
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
    except:
        # Fallback to default font
        font_size = size // 3
        font = ImageFont.load_default()

    text = "VC"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2

    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)

    return img


# Create icons for different densities
icon_sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

# Create directories if they don't exist
for density in icon_sizes.keys():
    os.makedirs(f"android/app/src/main/res/mipmap-{density}", exist_ok=True)

# Generate icons
for density, size in icon_sizes.items():
    icon = create_icon(size)
    icon.save(f"android/app/src/main/res/mipmap-{density}/ic_launcher.png")
    icon.save(f"android/app/src/main/res/mipmap-{density}/ic_launcher_round.png")
    print(f"Generated {density} icons ({size}x{size})")

print("All launcher icons generated successfully!")
