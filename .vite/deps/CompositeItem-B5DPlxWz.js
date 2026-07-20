import { E as EMPTY_OBJECT, T as EMPTY_ARRAY, t as useRenderElement } from "./useRenderElement-CD8_51dU.js";
import { t as useCompositeItem } from "./useCompositeItem-D-0WH6OJ.js";
//#region node_modules/@base-ui/react/esm/internals/composite/item/CompositeItem.js
/**
* @internal
*/
function CompositeItem(componentProps) {
	const { render, className, style, state = EMPTY_OBJECT, props = EMPTY_ARRAY, refs = EMPTY_ARRAY, metadata, stateAttributesMapping, tag = "div", ...elementProps } = componentProps;
	const { compositeProps, compositeRef } = useCompositeItem({ metadata });
	return useRenderElement(tag, componentProps, {
		state,
		ref: [...refs, compositeRef],
		props: [
			compositeProps,
			...props,
			elementProps
		],
		stateAttributesMapping
	});
}
//#endregion
export { CompositeItem as t };

//# sourceMappingURL=CompositeItem-B5DPlxWz.js.map