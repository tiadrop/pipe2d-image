import { Pipe2D } from "@xtia/pipe2d";
import { RGBA } from "@xtia/rgba";

/**
 * Creates a Pipe2D that samples an image
 * @param image 
 * @param options 
 */
export function createImagePipe(image: HTMLImageElement | ImageElementContainer, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Creates a Pipe2D that samples a canvas
 * @param source
 * @param options 
 */
export function createImagePipe(source: HTMLCanvasElement | OffscreenCanvas | CanvasElementContainer, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Creates a Pipe2D that samples a cavas from a rendering context
 * @param source
 * @param options 
 */
export function createImagePipe(source: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Creates a Pipe2D that samples a canvas' ImageData
 * @param image 
 * @param options 
 */
export function createImagePipe(data: ImageData, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Rasterises an Pipe2D<RGBA> and creates a Pipe2D that samples the result
 * @param source
 * @param options 
 */
export function createImagePipe(source: Pipe2D<RGBA>, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Loads an image from a URL and creates a Pipe2D that samples it
 * @param url
 * @param options
 */
export function createImagePipe(url: string, options?: Partial<ImagePipeOptions>): Promise<Pipe2D<RGBA>>
export function createImagePipe(
    source: string | Pipe2D<RGBA> | ImageData | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas| CanvasRenderingContext2D| OffscreenCanvasRenderingContext2D | CanvasElementContainer | ImageElementContainer,
    options: Partial<ImagePipeOptions> = {}
): Pipe2D<RGBA> | Promise<Pipe2D<RGBA>> {

    if (typeof source == "string") {
        return new Promise((resolve, reject) => {
            const img = document.createElement("img");
            img.onload = () => resolve(createImagePipe(img, options));
            img.onerror = (e) => reject(e);
            img.src = source as string;
        });
    }

    const opts: ImagePipeOptions = {
        oob: new RGBA(0, 0, 0, 0),
        nearest: false,
        ...options,
    };

    if (source instanceof HTMLImageElement) {
        const img = source as HTMLImageElement;
        const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        source = canvas;
    }

    if (
        source instanceof HTMLCanvasElement
        || source instanceof OffscreenCanvas
    ) source = source.getContext("2d") as OffscreenCanvasRenderingContext2D;

    if (
        source instanceof CanvasRenderingContext2D
        || source instanceof OffscreenCanvasRenderingContext2D
    ) source = source.getImageData(0, 0, source.canvas.width, source.canvas.height);

    if (source instanceof ImageData) {
        const imageData = source as ImageData;
        const bytes = imageData.data;
        const width = imageData.width;

        const samplePipe: Pipe2D<RGBA> = new Pipe2D<RGBA>(
            width,
            imageData.height,
            (x, y) => {
                const idx = (y * width + x) * 4;
                    return new RGBA(bytes.slice(idx, idx + 4)
                );
            }
        )//.stash(); // READD WHEN PIPE2D IS UPDATED

        return opts.nearest
            ? samplePipe.floorCoordinates()
            : samplePipe.interpolate(interpolateRGBA);
    }

    if (source instanceof Pipe2D) {
        return createImagePipe(renderRGBAPipe(source), options);
    }

    if ("element" in source) {
        return createImagePipe(source.element as any, options);
    }

    throw new Error("Invalid image source");
};

// no xywh
export function renderRGBAPipe(source: Pipe2D<RGBA>): OffscreenCanvas
export function renderRGBAPipe(source: Pipe2D<RGBA>, canvas: OffscreenCanvas | HTMLCanvasElement | CanvasElementContainer): void
export function renderRGBAPipe(source: Pipe2D<RGBA>, context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void
export function renderRGBAPipe(source: Pipe2D<RGBA>, imageData: ImageData): void
export async function renderRGBAPipe(source: Pipe2D<RGBA>, image: HTMLImageElement | ImageElementContainer): Promise<void>

// xy
export function renderRGBAPipe(source: Pipe2D<RGBA>, canvas: OffscreenCanvas | HTMLCanvasElement | CanvasElementContainer, dx: number, dy: number): void
export function renderRGBAPipe(source: Pipe2D<RGBA>, context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, dx: number, dy: number): void
export function renderRGBAPipe(source: Pipe2D<RGBA>, imageData: ImageData, dx: number, dy: number): void
// xywh
export function renderRGBAPipe(source: Pipe2D<RGBA>, canvas: OffscreenCanvas | HTMLCanvasElement | CanvasElementContainer, dx: number, dy: number, dw: number, dh: number): void
export function renderRGBAPipe(source: Pipe2D<RGBA>, context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number): void
export function renderRGBAPipe(source: Pipe2D<RGBA>, imageData: ImageData, dx: number, dy: number, dw: number, dh: number): void
export function renderRGBAPipe(
    source: Pipe2D<RGBA>,
    target?: ImageData | OffscreenCanvas | HTMLCanvasElement | CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | CanvasElementContainer | HTMLImageElement | ImageElementContainer,
    dx: number = 0,
    dy: number = 0,
    dw: number = source.width,
    dh: number = source.height
): void | OffscreenCanvas | Promise<void> {
    if (!target) {
        const canvas = new OffscreenCanvas(source.width, source.height);
        renderRGBAPipe(source, canvas, 0, 0, source.width, source.height);
        return canvas;
    }
    if (target instanceof ImageData) {
        for (let x = 0; x < target.width; x++) {
            const px = Math.round((x / target.width) * source.width);
            for (let y = 0; y < target.height; y++) {
                const idx = (y * target.width + x) * 4;
                const py = Math.round((y / target.height) * source.height);
                const pixel = source.get(px + .499, py + .499).asBytes;
                target.data.set(pixel, idx);
            }
        }
        return;
    }

    if ("element" in target) target = target.element;

    if (target instanceof HTMLImageElement) {
        const img = target as HTMLImageElement;
        const canvas = document.createElement("canvas");
        canvas.width = source.width;
        canvas.height = source.height;
        renderRGBAPipe(source, canvas);
        return new Promise(resolve => {
            const loadHandler = (ev: Event) => {
                img.removeEventListener("load", loadHandler);
                ev.stopPropagation();
                resolve();
            };
            img.addEventListener("load", loadHandler);
            img.src = canvas.toDataURL();
        });
    }
    
    const canvasContext = (
        target instanceof CanvasRenderingContext2D
        || target instanceof OffscreenCanvasRenderingContext2D
    ) ? target : (target as any).getContext("2d")!;

    const imageData = canvasContext.createImageData(dw, dh);
    renderRGBAPipe(source, imageData);
    canvasContext.putImageData(imageData, dx, dy);
};

// @xtia/jel compatibility
type CanvasElementContainer = {
    element: HTMLCanvasElement;
}

type ImageElementContainer = {
    element: HTMLImageElement;
}

type ImagePipeOptions = {
	/**
	 * @property Specifies a value to return when sampling outside of the source image's bounds
	 */
	oob: RGBA;
	/**
	 * @property Disables interpolation
	 */
	nearest: boolean;
}

function interpolateRGBA(tl: RGBA, tr: RGBA, bl: RGBA, br: RGBA, x: number, y: number) {
    return tl.blend(tr,x).blend(bl.blend(br, x), y);
}
