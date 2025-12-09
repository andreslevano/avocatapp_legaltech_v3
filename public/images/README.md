# Hero Background Image

## Image Requirements

Place your hero background image in this directory with the filename: `hero-background.jpg`

### Recommended Image Specifications:

#### For Best Results Across All Devices:

**Desktop (1920px+ width):**
- Dimensions: 1920x1080px (16:9 aspect ratio) or 2560x1440px for Retina displays
- Format: JPEG (quality 85-90) or WebP
- File size: 200-400 KB
- Focus: Center the important content (people/desk) in the middle 60% of the frame

**Tablet (768px-1024px width):**
- Can use the same desktop image, but ensure important content is centered
- Alternative: 1200x800px optimized version
- File size: 150-300 KB

**Mobile (320px-767px width):**
- Can use the same desktop image (will be cropped automatically)
- Alternative: 800x1200px portrait version if you want mobile-specific crop
- File size: 100-200 KB

### Image Content Guidelines:

Based on the provided image description (law office with three professionals):
- The image should have the desk and people centered
- Important elements should be in the center 60% of the frame
- Avoid placing critical content at the edges (will be cropped on mobile)
- Ensure good contrast for text overlay

### Current Implementation:

The Hero component uses:
- `background-size: cover` - ensures full coverage on all devices
- `background-position: center` - centers the image
- Dark overlay (60% opacity gradient) for text readability
- Responsive min-heights: 500px (mobile), 600px (tablet), 700px (desktop)

### File Location:
```
public/images/hero-background.jpg
```

### Optimization Tips:

1. **Compress the image** before uploading:
   - Use tools like TinyPNG, Squoosh, or ImageOptim
   - Target: < 300 KB for best performance

2. **Format recommendations**:
   - JPEG: Best for photos with many colors
   - WebP: Smaller file size, good quality (if browser support is available)

3. **Aspect ratio**: 16:9 works best for hero sections

### Testing:

After placing the image, test on:
- Mobile (320px-767px)
- Tablet (768px-1023px)  
- Desktop (1024px+)

The image will automatically adapt to each screen size.


