#!/usr/bin/env python3
"""
Generate app icons for Diet Daily iOS and Android apps
Creates all required sizes for both platforms
"""

from PIL import Image, ImageDraw, ImageFont
import os
from pathlib import Path

# Base colors for Diet Daily app - health/nutrition themed
PRIMARY_COLOR = (76, 175, 80)  # Green - health/nutrition
SECONDARY_COLOR = (255, 152, 0)  # Orange - energy/vitality
BACKGROUND_COLOR = (255, 255, 255)  # White background

def create_base_icon(size=1024):
    """Create the base app icon design"""
    # Create image with white background
    img = Image.new('RGB', (size, size), BACKGROUND_COLOR)
    draw = ImageDraw.Draw(img)

    # Draw rounded square background
    padding = size // 8
    draw.rounded_rectangle(
        [(padding, padding), (size - padding, size - padding)],
        radius=size // 6,
        fill=PRIMARY_COLOR
    )

    # Draw a plate (circle) in the center
    plate_radius = size // 3
    center = size // 2
    draw.ellipse(
        [(center - plate_radius, center - plate_radius),
         (center + plate_radius, center + plate_radius)],
        fill=BACKGROUND_COLOR,
        outline=SECONDARY_COLOR,
        width=size // 40
    )

    # Draw fork and spoon icons (simplified)
    utensil_size = size // 8

    # Fork (left side)
    fork_x = center - plate_radius // 2
    fork_y = center - utensil_size // 2
    # Fork handle
    draw.rectangle(
        [(fork_x - size // 80, fork_y),
         (fork_x + size // 80, fork_y + utensil_size)],
        fill=SECONDARY_COLOR
    )
    # Fork prongs
    for i in range(3):
        prong_x = fork_x - size // 40 + (i * size // 80)
        draw.rectangle(
            [(prong_x, fork_y - utensil_size // 3),
             (prong_x + size // 120, fork_y)],
            fill=SECONDARY_COLOR
        )

    # Spoon (right side)
    spoon_x = center + plate_radius // 2
    spoon_y = center - utensil_size // 2
    # Spoon handle
    draw.rectangle(
        [(spoon_x - size // 80, spoon_y),
         (spoon_x + size // 80, spoon_y + utensil_size)],
        fill=SECONDARY_COLOR
    )
    # Spoon bowl
    draw.ellipse(
        [(spoon_x - size // 40, spoon_y - utensil_size // 3),
         (spoon_x + size // 40, spoon_y + size // 120)],
        fill=SECONDARY_COLOR
    )

    # Add small health indicator dots
    dot_radius = size // 50
    dot_spacing = size // 20
    for i in range(3):
        x = center - dot_spacing + (i * dot_spacing)
        y = center + plate_radius // 2
        draw.ellipse(
            [(x - dot_radius, y - dot_radius),
             (x + dot_radius, y + dot_radius)],
            fill=PRIMARY_COLOR
        )

    return img

def generate_ios_icons(base_icon, output_dir):
    """Generate all iOS icon sizes"""
    ios_sizes = [
        (1024, "App-Icon-1024x1024@1x.png"),  # App Store
        (180, "App-Icon-60x60@3x.png"),        # iPhone
        (120, "App-Icon-60x60@2x.png"),        # iPhone
        (167, "App-Icon-83.5x83.5@2x.png"),    # iPad Pro
        (152, "App-Icon-76x76@2x.png"),        # iPad
        (76, "App-Icon-76x76@1x.png"),         # iPad
        (40, "App-Icon-20x20@2x.png"),         # iPhone notification
        (60, "App-Icon-20x20@3x.png"),         # iPhone notification
        (58, "App-Icon-29x29@2x.png"),         # Settings
        (87, "App-Icon-29x29@3x.png"),         # Settings
        (80, "App-Icon-40x40@2x.png"),         # Spotlight
        (120, "App-Icon-40x40@3x.png"),        # Spotlight
    ]

    os.makedirs(output_dir, exist_ok=True)

    for size, filename in ios_sizes:
        icon = base_icon.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(os.path.join(output_dir, filename), 'PNG')
        print(f"✓ Generated iOS: {filename} ({size}x{size})")

def generate_android_icons(base_icon, output_dir):
    """Generate all Android icon sizes"""
    android_sizes = [
        (192, "mipmap-xxxhdpi", "ic_launcher.png"),
        (144, "mipmap-xxhdpi", "ic_launcher.png"),
        (96, "mipmap-xhdpi", "ic_launcher.png"),
        (72, "mipmap-hdpi", "ic_launcher.png"),
        (48, "mipmap-mdpi", "ic_launcher.png"),
    ]

    # Also create adaptive icon (foreground + background)
    for size, folder, filename in android_sizes:
        folder_path = os.path.join(output_dir, folder)
        os.makedirs(folder_path, exist_ok=True)

        # Standard icon
        icon = base_icon.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(os.path.join(folder_path, filename), 'PNG')
        print(f"✓ Generated Android: {folder}/{filename} ({size}x{size})")

        # Adaptive icon foreground
        icon.save(os.path.join(folder_path, "ic_launcher_foreground.png"), 'PNG')

        # Adaptive icon background (solid color)
        bg = Image.new('RGB', (size, size), PRIMARY_COLOR)
        bg.save(os.path.join(folder_path, "ic_launcher_background.png"), 'PNG')

def update_ios_contents_json(output_dir):
    """Update Contents.json for iOS with all icon sizes"""
    contents = {
        "images": [
            {
                "filename": "App-Icon-1024x1024@1x.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024"
            },
            {
                "filename": "App-Icon-20x20@2x.png",
                "idiom": "iphone",
                "scale": "2x",
                "size": "20x20"
            },
            {
                "filename": "App-Icon-20x20@3x.png",
                "idiom": "iphone",
                "scale": "3x",
                "size": "20x20"
            },
            {
                "filename": "App-Icon-29x29@2x.png",
                "idiom": "iphone",
                "scale": "2x",
                "size": "29x29"
            },
            {
                "filename": "App-Icon-29x29@3x.png",
                "idiom": "iphone",
                "scale": "3x",
                "size": "29x29"
            },
            {
                "filename": "App-Icon-40x40@2x.png",
                "idiom": "iphone",
                "scale": "2x",
                "size": "40x40"
            },
            {
                "filename": "App-Icon-40x40@3x.png",
                "idiom": "iphone",
                "scale": "3x",
                "size": "40x40"
            },
            {
                "filename": "App-Icon-60x60@2x.png",
                "idiom": "iphone",
                "scale": "2x",
                "size": "60x60"
            },
            {
                "filename": "App-Icon-60x60@3x.png",
                "idiom": "iphone",
                "scale": "3x",
                "size": "60x60"
            },
            {
                "filename": "App-Icon-76x76@1x.png",
                "idiom": "ipad",
                "scale": "1x",
                "size": "76x76"
            },
            {
                "filename": "App-Icon-76x76@2x.png",
                "idiom": "ipad",
                "scale": "2x",
                "size": "76x76"
            },
            {
                "filename": "App-Icon-83.5x83.5@2x.png",
                "idiom": "ipad",
                "scale": "2x",
                "size": "83.5x83.5"
            }
        ],
        "info": {
            "version": 1,
            "author": "diet-daily-icon-generator"
        }
    }

    import json
    with open(os.path.join(output_dir, "Contents.json"), 'w') as f:
        json.dump(contents, f, indent=2)
    print("✓ Updated iOS Contents.json")

def main():
    # Get project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # Define output directories
    ios_icon_dir = project_root / "mobile/react-native-starter-kit/DietDailyMobile/ios/DietDailyMobile/Images.xcassets/AppIcon.appiconset"
    android_icon_dir = project_root / "mobile/react-native-starter-kit/DietDailyMobile/android/app/src/main/res"
    assets_dir = project_root / "mobile/react-native-starter-kit/DietDailyMobile/assets"

    print("🎨 Generating Diet Daily App Icons...")
    print("=" * 50)

    # Create base icon (1024x1024)
    print("\n📱 Creating base icon design...")
    base_icon = create_base_icon(1024)

    # Save base icon to assets
    os.makedirs(assets_dir, exist_ok=True)
    base_icon.save(assets_dir / "icon.png", 'PNG')
    base_icon.save(assets_dir / "adaptive-icon.png", 'PNG')
    print(f"✓ Saved base icons to assets/")

    # Generate iOS icons
    print("\n🍎 Generating iOS icons...")
    generate_ios_icons(base_icon, ios_icon_dir)
    update_ios_contents_json(ios_icon_dir)

    # Generate Android icons
    print("\n🤖 Generating Android icons...")
    generate_android_icons(base_icon, android_icon_dir)

    print("\n" + "=" * 50)
    print("✅ All icons generated successfully!")
    print(f"\niOS icons: {ios_icon_dir}")
    print(f"Android icons: {android_icon_dir}")
    print(f"Assets: {assets_dir}")

if __name__ == "__main__":
    main()
