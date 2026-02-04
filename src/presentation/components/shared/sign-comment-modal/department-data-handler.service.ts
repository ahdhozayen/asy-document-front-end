import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DepartmentDataHandlerService {

    constructor() { }

    /**
     * Render department list to a transparent PNG (base64 data URL).
     * This is safer than HTML->SVG rendering and avoids opaque white boxes.
     */
    createDepartmentsImageBase64(
        departments: string[],
        options?: { isRTL?: boolean }
    ): string {
        const safeDepartments = (departments ?? []).map((d) => (d ?? '').trim()).filter(Boolean);
        if (safeDepartments.length === 0) {
            return '';
        }

        const isRTL = options?.isRTL ?? false;
        const textDirection = isRTL ? 'rtl' : 'ltr';
        const textAlign: CanvasTextAlign = isRTL ? "right" : "left";

        const fontSize = 36;
        const lineHeight = 38;
        const padding = 10;
        const bullet = '•';
        const bulletGap = 12;
        const bulletText = `${bullet}`;

        const FIXED_WIDTH = 250;
        const maxTextWidth = FIXED_WIDTH - (padding * 2) - (fontSize + bulletGap);

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
            return '';
        }

        tempCtx.font = `bold ${fontSize}px Arial`;
        tempCtx.fillStyle = '#FF0000';
        tempCtx.textAlign = textAlign;
        tempCtx.direction = textDirection;
        tempCtx.textBaseline = 'top';

        const wrapLine = (text: string): string[] => {
            const words = text.split(' ').filter(Boolean);
            const lines: string[] = [];
            let current = '';

            for (const word of words) {
                const next = current ? `${current} ${word}` : word;
                const width = tempCtx.measureText(next).width;
                if (width <= maxTextWidth) {
                    current = next;
                } else {
                    if (current) {
                        lines.push(current);
                        current = word;
                    } else {
                        // Single very long word: hard-split by chars
                        let chunk = '';
                        for (const ch of word) {
                            const test = chunk + ch;
                            if (tempCtx.measureText(test).width > maxTextWidth && chunk) {
                                lines.push(chunk);
                                chunk = ch;
                            } else {
                                chunk = test;
                            }
                        }
                        if (chunk) {
                            current = chunk;
                        }
                    }
                }
            }

            if (current) {
                lines.push(current);
            }

            return lines.length ? lines : [''];
        };

        // Build wrapped lines with a "bullet on first line only" flag per department
        const renderLines: Array<{ text: string; showBullet: boolean }> = [];
        for (const dept of safeDepartments) {
            const wrapped = wrapLine(dept);
            wrapped.forEach((line, idx) => {
                renderLines.push({ text: line, showBullet: idx === 0 });
            });
        }

        tempCanvas.width = FIXED_WIDTH;
        tempCanvas.height = (renderLines.length * lineHeight) + (padding * 2);

        // Re-apply after resize
        tempCtx.font = `bold ${fontSize}px Arial`;
        tempCtx.fillStyle = '#FF0000';
        tempCtx.textAlign = textAlign;
        tempCtx.direction = textDirection;
        tempCtx.textBaseline = 'top';

        const textX = isRTL ? FIXED_WIDTH - padding : padding;
        const bulletX = isRTL ? FIXED_WIDTH - padding : padding;
        const afterBulletOffset = fontSize + bulletGap;

        renderLines.forEach((line, idx) => {
            const y = padding + (idx * lineHeight);

            if (line.showBullet) {
                tempCtx.fillText(bulletText, bulletX, y);
            }

            const x = isRTL ? (textX - afterBulletOffset) : (textX + afterBulletOffset);
            tempCtx.fillText(line.text, x, y);
        });

        return tempCanvas.toDataURL('image/png');
    }

    /**
     * Convert an array of department strings to HTML bullet points
     * @param departments Array of department names
     * @returns HTML string with bullet points
     */
    convertToHtml(departments: string[]): string {
        if (!departments || departments.length === 0) {
            return '<p>No departments available</p>';
        }

        const listItems = departments
            .map(dept => `<li>${this.escapeHtml(dept)}</li>`)
            .join('');

        return `
      <div class="department-list">
        <h3>Departments</h3>
        <ul>
          ${listItems}
        </ul>
      </div>
    `;
    }

    /**
     * Convert HTML string to base64 image
     * @param htmlString HTML content to convert
     * @returns Promise that resolves with base64 encoded image
     */
    async convertToBase64(htmlString: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // Create a canvas element
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject('Could not get canvas context');
                return;
            }

            // Create a temporary container for the HTML
            const container = document.createElement('div');
            container.innerHTML = htmlString;
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            container.style.background = 'white';
            container.style.padding = '20px';
            container.style.borderRadius = '5px';
            container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';

            document.body.appendChild(container);

            // Calculate dimensions
            const width = container.offsetWidth;
            const height = container.offsetHeight;

            canvas.width = width;
            canvas.height = height;

            // Set background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);

            // Create an image from HTML using SVG foreignObject
            const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${htmlString}
            </div>
          </foreignObject>
        </svg>
      `;

            const img = new Image();
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                ctx.drawImage(img, 0, 0);

                // Convert to base64
                const base64 = canvas.toDataURL('image/png');

                // Clean up
                document.body.removeChild(container);
                URL.revokeObjectURL(url);

                resolve(base64);
            };

            img.onerror = (error) => {
                document.body.removeChild(container);
                URL.revokeObjectURL(url);
                reject('Error loading image: ' + error);
            };

            img.src = url;
        });
    }

    /**
     * Combined method: Convert departments to HTML then to base64
     * @param departments Array of department names
     * @returns Promise with base64 encoded image
     */
    async processDepartments(departments: string[], options?: { isRTL?: boolean }): Promise<string> {
        try {
            // Prefer canvas-based rendering to avoid opaque backgrounds
            const base64 = this.createDepartmentsImageBase64(departments, options);
            if (base64) {
                return base64;
            }

            // Fallback to legacy HTML->SVG conversion if needed
            const html = this.convertToHtml(departments);
            return await this.convertToBase64(html);
        } catch (error) {
            console.error('Error processing departments:', error);
            throw error;
        }
    }

    /**
     * Helper method to escape HTML special characters
     * @param text Text to escape
     * @returns Escaped text
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}