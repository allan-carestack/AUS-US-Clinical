import { i as __toESM, t as require_react } from "./react-CZunmVaX.js";
import { a as useMergedRefs } from "./useRenderElement-CD8_51dU.js";
import { n as useCompositeRootContext } from "./CompositeRootContext-Bm4cWRAg.js";
import { n as useCompositeListItem } from "./useCompositeListItem-Cjx6EoPE.js";
//#region node_modules/@base-ui/react/esm/internals/composite/item/useCompositeItem.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function useCompositeItem(params = {}) {
	const { highlightItemOnHover, highlightedIndex, onHighlightedIndexChange } = useCompositeRootContext();
	const { ref, index } = useCompositeListItem(params);
	const isHighlighted = highlightedIndex === index;
	const itemRef = import_react.useRef(null);
	const mergedRef = useMergedRefs(ref, itemRef);
	return {
		compositeProps: import_react.useMemo(() => ({
			tabIndex: isHighlighted ? 0 : -1,
			onFocus() {
				onHighlightedIndexChange(index);
			},
			onMouseMove() {
				const item = itemRef.current;
				if (!highlightItemOnHover || !item) return;
				const disabled = item.hasAttribute("disabled") || item.ariaDisabled === "true";
				if (!isHighlighted && !disabled) item.focus();
			}
		}), [
			isHighlighted,
			onHighlightedIndexChange,
			index,
			highlightItemOnHover
		]),
		compositeRef: mergedRef,
		index
	};
}
//#endregion
export { useCompositeItem as t };

//# sourceMappingURL=useCompositeItem-D-0WH6OJ.js.map