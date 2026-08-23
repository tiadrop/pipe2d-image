import { Pipe2D } from "@xtia/pipe2d";
import { parseRGBA, RGBA } from "@xtia/rgba";

type RGBASource = {
	width: number;
	height: number;
	get: (x: number, y: number) => RGBA;
}

type Source2D<T> = {
    width: number;
    height: number;
    get: (x: number, y: number) => T;
}

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
 * @param data 
 * @param options 
 */
export function createImagePipe(data: ImageData, options?: Partial<ImagePipeOptions>): Pipe2D<RGBA>
/**
 * Loads an image from a URL and creates a Pipe2D that samples it
 * @param url
 * @param options
 */
export function createImagePipe(url: string, options?: Partial<ImagePipeOptions>): Promise<Pipe2D<RGBA>>
export function createImagePipe(
    source: string | ImageData | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas| CanvasRenderingContext2D| OffscreenCanvasRenderingContext2D | CanvasElementContainer | ImageElementContainer,
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
        ).stash();

        return opts.nearest
            ? samplePipe.floorCoordinates()
            : samplePipe.interpolate(interpolateRGBA);
    }

    if ("element" in source) {
        return createImagePipe(source.element as any, options);
    }

    if ((source as any) instanceof Pipe2D) throw new Error("Pipe2D<RGBA> image source support has been removed; use source.stash() instead");

    throw new Error("Invalid image source");
};

// no xywh
export function renderRGBAPipe(source: RGBASource): OffscreenCanvas
export function renderRGBAPipe(source: RGBASource, canvas: OffscreenCanvas | HTMLCanvasElement | CanvasElementContainer): void
export function renderRGBAPipe(source: RGBASource, context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void
export function renderRGBAPipe(source: RGBASource, imageData: ImageData): void
export async function renderRGBAPipe(source: RGBASource, image: HTMLImageElement | ImageElementContainer): Promise<void>

// xy
export function renderRGBAPipe(source: RGBASource, canvas: OffscreenCanvas | HTMLCanvasElement | CanvasElementContainer, dx: number, dy: number): void
export function renderRGBAPipe(source: RGBASource, context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, dx: number, dy: number): void
export function renderRGBAPipe(source: RGBASource, imageData: ImageData, dx: number, dy: number): void
// xywh
export function renderRGBAPipe(source: RGBASource, canvas: OffscreenCanvas | HTMLCanvasElement | CanvasElementContainer, dx: number, dy: number, dw: number, dh: number): void
export function renderRGBAPipe(source: RGBASource, context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number): void
export function renderRGBAPipe(source: RGBASource, imageData: ImageData, dx: number, dy: number, dw: number, dh: number): void
export function renderRGBAPipe(
    source: RGBASource,
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
                const pixel = source.get(px, py).asBytes;
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

type HexColourContainer = {
    hexCode: string;
}

function exclude<T>(source: T[], item: T) {
    const idx = source.indexOf(item);
    const copy = [...source];
    copy.splice(idx, 1);
    return copy;
}

const bayer4 = Pipe2D.fromFlatArrayXY([
    0, 2,
    3, 1,
].map(v => v / 4), 2, 2).floorCoordinates().loop();

const bayer16 = Pipe2D.fromFlatArrayXY([
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5,
].map(v => v / 16), 4, 4).floorCoordinates().loop();

const bayer64 = Pipe2D.fromFlatArrayXY([
    0, 32,  8, 40,  2, 34, 10, 42,
   48, 16, 56, 24, 50, 18, 58, 26,
   12, 44,  4, 36, 14, 46,  6, 38,
   60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43,  1, 33,  9, 41,
   51, 19, 59, 27, 49, 17, 57, 25,
   15, 47,  7, 39, 13, 45,  5, 37,
   63, 31, 55, 23, 61, 29, 53, 21,
].map(v => v / 64), 8, 8).floorCoordinates().loop();

export interface DitherOptions {
    /** Bayer matrix size. Default 64. */
    level?: 4 | 16 | 64;
    /** Spatial offset. Default 0. */
    seed?: number;
    /** 0 = flat quantisation, 1 = full dithering. Default 1. */
    intensity?: number;
    metric?: "euclidean" | "cie76"
}

/**
 * Creates a dithered version of an RGBA pipe using an ordered Bayer matrix.
 * @param source Pipe to dither
 * @param palette Palette to dither to
 * @param options Dithering parameters
 * @returns Dithered pipe
 */
export function dither(
    source: Source2D<RGBA>,
    palette: readonly (string | RGBA | HexColourContainer)[],
    options: DitherOptions = {},
): Pipe2D<RGBA> {
    const { level = 64, seed = 0, intensity = 1, metric = "euclidean" } = options;

    if (palette.length === 0) throw new Error("dither requires a non-empty palette");

    const rgbaPalette = palette.map(
        (c) => (typeof c === "string" ? parseRGBA(c) : c instanceof RGBA ? c : parseRGBA(c.hexCode)),
    );

    if (rgbaPalette.length == 1) return Pipe2D.solid(rgbaPalette[0], source.width, source.height);

    const bayer = {
        4: bayer4,
        16: bayer16,
        64: bayer64
    }[level].translate(seed, seed);

    return Pipe2D.combine(source, bayer)
        .map(([colour, rawThreshold]) => {
            const threshold = 0.5 + (rawThreshold - 0.5) * intensity;

            const nearest = colour.nearest(rgbaPalette, metric);
            const second = colour.nearest(exclude(rgbaPalette, nearest), metric);

            const [upper, lower] = nearest.luma709 >= second.luma709
                ? [nearest, second]
                : [second, nearest];

            const range = upper.luma709 - lower.luma709;
            if (range === 0) return nearest;

            const target = (colour.luma709 - lower.luma709) / range;

            return target > threshold ? upper : lower;
        });
}
