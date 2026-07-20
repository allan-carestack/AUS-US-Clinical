import { _ as isHTMLElement, o as getComputedStyle } from "./useRenderElement-CD8_51dU.js";
import { k as round } from "./composite-C0FJqbYK.js";
//#region node_modules/@base-ui/react/esm/utils/getCssDimensions.js
function getCssDimensions(element) {
	const css = getComputedStyle(element);
	let width = parseFloat(css.width) || 0;
	let height = parseFloat(css.height) || 0;
	const hasOffset = isHTMLElement(element);
	const offsetWidth = hasOffset ? element.offsetWidth : width;
	const offsetHeight = hasOffset ? element.offsetHeight : height;
	if (round(width) !== offsetWidth || round(height) !== offsetHeight) {
		width = offsetWidth;
		height = offsetHeight;
	}
	return {
		width,
		height
	};
}
//#endregion
export { getCssDimensions as t };

//# sourceMappingURL=getCssDimensions-1El5KO18.js.map