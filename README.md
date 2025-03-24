# pipe2d-image

## Summary

Read and write images with the power of [Pipe2D](https://github.com/tiadrop/pipe2d)

## Description

Inspired by [graphics shaders](https://en.wikipedia.org/wiki/Shader), Pipe2D provides a simple unified addressing interface for a transforming pipeline to any 2-dimensional concept.

### [[interactive demo](https://aleta.codes/pipe2d-demo/)] [[full demo source](https://gist.github.com/tiadrop/403d5a5c7c452622e579cc3f1705384c)]

The refraction logic can be summarised as:

```ts
import { renderRGBAPipe, createImagePipe } from "@xtia/pipe2d-image";

const refractionStrength = 10;
const refractionImage = await createImagePipe("cursor-refraction-map.png");

// read red and green channels as displacement offsets
const refractionPipe = refractionImage.map(rgba => [
	((rgba.red / 255) - .5) * refractionStrength,
	((rgba.green / 255) - .5) * refractionStrength,
]); // Pipe2D<[x, y]>

function renderCursorBackground(cursorX: number, cursorY: number) {
	// create a pipe to read background from refracted coordinates
	const cursorPipe = backgroundPipe.mapCoordinates((x, y) => {
		const [refractX, refractY] = refractionPipe.get(x, y);
		return [x + refractX, y + refractY];
	}).crop(cursorX, cursorY, cursorCanvas.width, cursorCanvas.height);
	// draw it on a canvas
	renderRGBAPipe(cursorCanvas);
}
```

## API

* `createImagePipe(source, options?): Pipe2D<RGBA>` creates a pipe that samples an image (`HTMLCanvasElement | HTMLImageElement | OffscreenCanvas | ImageData | Pipe2D<RGBA>` or 2D rendering context)
* `async createImagePipe(url, options?): Pipe2D<RGBA>` loads an image from a URL and creates a a pipe that samples it
* `renderRGBAPipe(target[, x, y[, dw, dh]])` renders a RGBAPipe to a canvas/canvas context/imageData.
* `renderRGBAPipe(): OffscreenCanvas` renders a RGBAPipe to and returns a new OffscreenCanvas of the pipe's dimensions.

`renderRGBAPipe()`'s target may be an HTMLImageElement, in which case the update may not occur synchronously (image elements always load asynchronously), so renderRGBAPipe() will return a Promise, resolved when the image is loaded.
