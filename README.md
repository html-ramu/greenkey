# GreenKey 
# GreenKey 🟩

A lightweight, browser-based chroma key tool that removes green screen backgrounds instantly — no backend, no dependencies.

## Features
- **Pure Client-Side:** Built with HTML, CSS, and JavaScript. Runs entirely in your local browser.
- **Advanced Detection:** Uses HSV color space to detect all shades of your key color, not just pure green.
- **Skin Tone Protection:** Automatically prevents human skin tones from being removed.
- **Spill Suppression:** Removes the green halo/fringe on hair and semi-transparent edges.
- **Live Preview:** Sliders (Tolerance & Smoothness) update the result in real-time.
- **Dark/Light Mode:** Minimalist, distraction-free UI.

## How to Use
1. Open `index.html` in any modern web browser.
2. Upload an image.
3. Pick your background key color (default is pure green).
4. Click **Apply Green Screen**.
5. Adjust Tolerance and Edge Smoothness (the image updates instantly).
6. Click **Download PNG** to save your image with a transparent background.
