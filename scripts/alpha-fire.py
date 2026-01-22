#!/usr/bin/env python3
from PIL import Image

img = Image.open('public/assets/floating_robot/fire.png').convert('RGBA')
data = img.getdata()

new_data = []
for pixel in data:
    r, g, b, a = pixel
    # Alpha out white and grey (high brightness, low saturation)
    brightness = (r + g + b) / 3
    if brightness > 200:  # White/light grey threshold
        new_data.append((r, g, b, 0))
    else:
        new_data.append(pixel)

img.putdata(new_data)
img.save('public/assets/floating_robot/fire.png')
print('✓ Removed white/grey background from fire.png')
