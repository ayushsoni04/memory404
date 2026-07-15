import os
import math
from PIL import Image, ImageDraw, ImageFont

def get_font(font_name, font_size):
    # Try a few common system fonts on macOS
    font_paths = []
    if font_name == "bold":
        font_paths = [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/Library/Fonts/Arial Bold.ttf",
        ]
    else:
        font_paths = [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/Library/Fonts/Arial.ttf",
        ]
    
    for path in font_paths:
        if os.path.exists(path):
            try:
                # If Helvetica.ttc, it might load index 0 or we can just load it
                return ImageFont.truetype(path, font_size)
            except Exception:
                pass
    return ImageFont.load_default()

def generate_favicons():
    src_path = "public/portrait-sketch.png"
    if not os.path.exists(src_path):
        print(f"Error: {src_path} not found.")
        return False
        
    print("Loading portrait sketch...")
    img = Image.open(src_path)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
        
    # Generate favicon.ico (containing 16x16, 32x32, and 48x48)
    img.save("public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print("Generated public/favicon.ico")
    
    # Generate favicon-16x16.png
    img.resize((16, 16), Image.Resampling.LANCZOS).save("public/favicon-16x16.png", "PNG")
    print("Generated public/favicon-16x16.png")
    
    # Generate favicon-32x32.png
    img.resize((32, 32), Image.Resampling.LANCZOS).save("public/favicon-32x32.png", "PNG")
    print("Generated public/favicon-32x32.png")
    
    # Generate apple-touch-icon.png (180x180)
    img.resize((180, 180), Image.Resampling.LANCZOS).save("public/apple-touch-icon.png", "PNG")
    print("Generated public/apple-touch-icon.png")
    
    # Generate android-chrome-192.png (192x192)
    img.resize((192, 192), Image.Resampling.LANCZOS).save("public/android-chrome-192.png", "PNG")
    print("Generated public/android-chrome-192.png")
    
    # Generate android-chrome-512.png (512x512)
    img.resize((512, 512), Image.Resampling.LANCZOS).save("public/android-chrome-512.png", "PNG")
    print("Generated public/android-chrome-512.png")
    
    return img

def generate_og_image(portrait_img):
    print("Generating premium Open Graph image (1200x630)...")
    
    # Create 1200x630 background canvas
    # Background color is #0c0c0c (12, 12, 12)
    im = Image.new("RGBA", (1200, 630), (12, 12, 12, 255))
    pixels = im.load()
    
    # Apply a smooth twilight radial glow behind text (#1c152e at center, fading out)
    glow_center_x = 900
    glow_center_y = 315
    for y in range(630):
        for x in range(1200):
            dx = x - glow_center_x
            dy = y - glow_center_y
            dist = math.sqrt(dx*dx + dy*dy)
            ratio = max(0.0, 1.0 - (dist / 650.0))
            ratio = ratio ** 2.2 # sharp falloff
            
            # Blend #0c0c0c (12, 12, 12) with twilight violet #1c152e (28, 21, 46)
            r = int(12 + (28 - 12) * ratio)
            g = int(12 + (21 - 12) * ratio)
            b = int(12 + (46 - 12) * ratio)
            pixels[x, y] = (r, g, b, 255)
            
    # Resize and crop portrait to fit inside circular frame
    p_size = 360
    portrait = portrait_img.resize((p_size, p_size), Image.Resampling.LANCZOS)
    
    # Make circular mask
    mask = Image.new("L", (p_size, p_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse((0, 0, p_size, p_size), fill=255)
    
    # circular portrait
    circle_portrait = Image.new("RGBA", (p_size, p_size), (0, 0, 0, 0))
    circle_portrait.paste(portrait, (0, 0), mask)
    
    # Paste circular portrait at (40, 135)
    im.paste(circle_portrait, (40, 135), circle_portrait)
    
    draw = ImageDraw.Draw(im)
    
    # Draw premium borders/rings around portrait
    # Inner border
    draw.ellipse((40 - 4, 135 - 4, 40 + p_size + 4, 135 + p_size + 4), outline=(163, 163, 163, 40), width=1)
    # Outer violet glow border
    draw.ellipse((40 - 8, 135 - 8, 40 + p_size + 8, 135 + p_size + 8), outline=(99, 102, 241, 100), width=2)
    
    # Load fonts
    name_font = get_font("bold", 68)
    role_font = get_font("regular", 36)
    desc_font = get_font("regular", 24)
    
    # Render Name: Ayush Soni
    draw.text((460, 160), "Ayush Soni", font=name_font, fill=(245, 245, 245, 255))
    
    # Render Subtitle: Product Designer
    # twilight purple accent (#a78bfa / 167, 139, 250)
    draw.text((460, 245), "Product Designer", font=role_font, fill=(167, 139, 250, 255))
    
    # Render divider line
    draw.line((460, 310, 1100, 310), fill=(255, 255, 255, 15), width=2)
    
    # Render description text
    desc_text = "Product designer in India creating intuitive SaaS, AI, and digital experiences—from research and UX to design systems and polished interfaces."
    
    import textwrap
    wrapped_lines = textwrap.wrap(desc_text, width=44)
    y_offset = 345
    for line in wrapped_lines:
        draw.text((460, y_offset), line, font=desc_font, fill=(163, 163, 163, 255))
        y_offset += 34
        
    # Save the result to public/og-image.png
    im.save("public/og-image.png", "PNG")
    print("Generated public/og-image.png")

if __name__ == "__main__":
    portrait_img = generate_favicons()
    if portrait_img:
        generate_og_image(portrait_img)
        print("Asset generation complete!")
    else:
        print("Failed to generate assets.")
